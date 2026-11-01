'use strict';

// 公开检索摘要取证层
//
// 背景（实测 2026-10-30）：未上市公司与港股拿不到工商登记接口 ——
//   爱企查 302 跳登录、天眼查 302、企查查阿里云 WAF、百度百科 403；
//   东财 F10 只覆盖 A 股（港股只有「公司概况」一节，无股东/高管接口）。
// 于是这些公司此前什么工商信息都取不到，覆盖率停在 40% 以下，永远「信息不足」。
//
// 本模块从**公开搜索结果**里逐字段取证。纪律（都是踩过的坑）：
//   1) **只在同一条结果窗口内取证**：窗口里必须出现公司名，字段才算这家公司的。
//      不做整页正则 —— 实测整页正则会把查询词本身当答案（"法定代表人 注册资本 成立日期"
//      里的"注册资本"被当成法人姓名）。
//   2) **只认标签式字段**（"法定代表人：X"）与已知标题结构
//      （"X - 公司全名 - 法定代表人/高管/股东 - 爱企查"），不做任何推测补全。
//   3) 结果是 reported（报道线索）级，不是 verified（工商登记）——
//      调用方必须标注「需核对」，不得当成已核验。
//   4) 必应**不用于中文公司名检索**：实测分词漂移严重（查"华为技术有限公司"返回官网与字典、
//      查"蜜雪冰城"返回"蜜"字词条），0 个可用字段。360 与搜狗才返回真实工商摘要。
//
// 纯函数 parse() 可离线测试（见 test/smoke-registry-web.js）。

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// 进程内缓存（12 小时）：检索源对频率敏感，同一公司只打一次
const _cache = new Map();
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// 熔断：某源连续触发挑战页后 10 分钟内不再白打（每家公司都试一遍会越打越封）
const _cooldown = new Map();
const COOLDOWN_MS = 10 * 60 * 1000;
function cooling(key) { const t = _cooldown.get(key); return !!t && Date.now() < t; }
function markBlocked(key) { _cooldown.set(key, Date.now() + COOLDOWN_MS); }

// 这些词出现在「法定代表人」后面时，是标签不是姓名（"法定代表人 注册资本 成立日期"）
const LABEL_WORDS = /^(注册资本|成立日期|成立时间|统一社会|经营状态|经营范围|注册地址|企业类型|所属行业|工商注册|登记机关|营业期限|纳税人|组织机构|法定代表人|股东|高管|信息|查询|是谁|简介|变更|电话|邮箱|地址)$/;

// 常见姓氏（判定"这是不是一个人名"的第一道闸）。
// 为什么要它：搜索摘要里"法定代表人 注册资本 成立日期"这种并列标签，用宽松正则会把
// "注册资本"当成人名（实测出现过"和成立日"）。只有"姓氏开头 + 2~4 字"才可能是姓名。
const SURNAME = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林罗高郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤欧';

function looksLikeName(s) {
  if (!/^[\u4e00-\u9fa5]{2,4}$/.test(s)) return false;
  if (LABEL_WORDS.test(s)) return false;
  return SURNAME.indexOf(s[0]) >= 0;
}

// 公司主体词：用来判断"这个字段离哪家公司更近"——离别的公司更近，就不能算我们的
const COMPANY_RE = /[\u4e00-\u9fa5A-Za-z0-9（）()·]{2,30}?(?:股份有限公司|有限责任公司|有限公司)/g;

function companyMentions(flat) {
  const out = [];
  COMPANY_RE.lastIndex = 0;
  let m;
  while ((m = COMPANY_RE.exec(flat)) !== null) {
    out.push({ text: m[0], at: m.index });
  }
  return out;
}

/**
 * 字段处的"归属判定"：**字段前面最近出现的那家公司**必须是我们这家。
 *
 * 为什么不是比"绝对距离"：实测「杭州XX公司 法定代表人：王朝炜 … 统一社会信用代码：9133…
 * 深圳市腾讯计算机系统有限公司」这段里，腾讯离标签只有 28 字、杭州有 32 字，
 * 按距离会判成腾讯的。但字段是跟在杭州公司后面的 —— 归属看"前面最近的主体"，这才是语义。
 */
function ownerBefore(flat, idx, name) {
  const mentions = companyMentions(flat);
  let last = null;
  for (const m of mentions) {
    if (m.at >= idx) break;
    last = m; // mentions 按位置升序，留最后一个在字段之前的
  }
  if (!last) {
    // 页面里没有可识别的主体词：退回"公司名就在前面 120 字内"
    return flat.slice(Math.max(0, idx - 120), idx).indexOf(name) >= 0;
  }
  if (idx - last.at > 120) return false; // 太远，不能归到它头上
  return last.text.indexOf(name) >= 0 || name.indexOf(last.text) >= 0;
}


const ENGINES = [
  { key: 'so', name: '360 搜索', url: function (q) { return 'https://www.so.com/s?q=' + encodeURIComponent(q); } },
  { key: 'sogou', name: '搜狗搜索', url: function (q) { return 'https://www.sogou.com/web?query=' + encodeURIComponent(q); }, referer: 'https://www.sogou.com/' }
];

function withTimeout(ms) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, ms);
  return { signal: ctl.signal, done: function () { clearTimeout(t); } };
}

async function fetchHtml(url, opts) {
  const o = opts || {};
  const to = withTimeout(o.ms || 12000);
  try {
    const res = await fetch(url, {
      signal: to.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': o.referer || 'https://www.so.com/'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    to.done();
  }
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&ensp;|&emsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- 字段抽取 ----------
// 每个抽取器在**整页文本**上扫描，但产出必须过三道闸：
//   ① 标签形式明确（法定代表人**必须**带冒号或"为"——宽松空格匹配会把并列标签当人名）；
//   ② 值本身像个人名/像个数（姓氏表 + 标签词黑名单）；
//   ③ 离它最近的公司主体必须是我们这家（防隔壁公司的登记信息被安到头上）。
const EXTRACTORS = {
  legalPerson: {
    label: '法定代表人',
    scan: function (flat) {
      const out = [];
      // ① 「法定代表人：张三」
      let re = /法定代表人[：:]\s*([\u4e00-\u9fa5]{2,4})/g;
      let m;
      while ((m = re.exec(flat)) !== null) out.push({ value: m[1], at: m.index });
      // ② 「法定代表人为张三」
      re = /法定代表人为\s*([\u4e00-\u9fa5]{2,4})/g;
      while ((m = re.exec(flat)) !== null) out.push({ value: m[1], at: m.index });
      // ③ 标题式「张三 - 某某有限公司 - 法定代表人/高管/股东」
      re = /([\u4e00-\u9fa5]{2,4})\s*[-—–]\s*([^-—–]{2,40}?有限公司)[^-—–]{0,12}[-—–]\s*法定代表人/g;
      while ((m = re.exec(flat)) !== null) out.push({ value: m[1], at: m.index, company: m[2] });
      return out;
    },
    ok: function (v) { return looksLikeName(v); }
  },
  regCapital: {
    label: '注册资本',
    scan: function (flat) {
      const out = [];
      const re = /注册资本[：:]\s*([\d.,]+(?:\.\d+)?\s*(?:万|亿)?\s*(?:元|人民币|美元|港元)?)/g;
      let m;
      while ((m = re.exec(flat)) !== null) out.push({ value: m[1].replace(/\s+/g, ''), at: m.index });
      return out;
    },
    ok: function (v) { return /\d/.test(v) && v.length <= 20; }
  },
  establishDate: {
    label: '成立日期',
    scan: function (flat) {
      const out = [];
      const re = /成立(?:日期|时间)?[：:]\s*(\d{4})\s*[-年./]\s*(\d{1,2})\s*[-月./]\s*(\d{1,2})/g;
      let m;
      while ((m = re.exec(flat)) !== null) {
        const pad = function (x) { return String(x).padStart(2, '0'); };
        out.push({ value: m[1] + '-' + pad(m[2]) + '-' + pad(m[3]), at: m.index });
      }
      return out;
    },
    ok: function (v) { const y = Number(v.slice(0, 4)); return y >= 1900 && y <= 2100; }
  },
  creditNo: {
    label: '统一社会信用代码',
    scan: function (flat) {
      const out = [];
      const re = /统一社会信用代码[：:]\s*([0-9A-Z]{18})/g;
      let m;
      while ((m = re.exec(flat)) !== null) out.push({ value: m[1], at: m.index });
      return out;
    },
    ok: function (v) { return /^[0-9A-Z]{18}$/.test(v); }
  },
  status: {
    label: '经营状态',
    scan: function (flat) {
      const out = [];
      const re = /经营状态[：:]\s*([\u4e00-\u9fa5]{2,6})/g;
      let m;
      while ((m = re.exec(flat)) !== null) out.push({ value: m[1], at: m.index });
      return out;
    },
    ok: function (v) { return /^(存续|在业|开业|注销|吊销|迁出|停业|清算|撤销|经营异常)/.test(v); }
  }
};

/**
 * 在整页文本里取证。**核心约束**：值必须离"我们这家公司"比离别家公司更近。
 * 返回 { fields, evidence, windows }
 */
function parse(text, company, opts) {
  const o = opts || {};
  const name = String(company || '').replace(/\s/g, '');
  const flat = String(text || '');
  const fields = {};
  const evidence = [];
  if (!name) return { fields: fields, evidence: evidence, windows: 0 };
  if (flat.indexOf(name) < 0) return { fields: fields, evidence: evidence, windows: 0 };

  for (const key of Object.keys(EXTRACTORS)) {
    const spec = EXTRACTORS[key];
    const cands = spec.scan(flat);
    for (const c of cands) {
      if (!spec.ok(c.value)) continue;
      // ③ 最近主体必须是我们（标题式已自带公司名，直接比对公司）
      if (c.company) {
        if (c.company.indexOf(name) < 0 && name.indexOf(c.company) < 0) continue;
      } else if (!ownerBefore(flat, c.at, name)) {
        continue;
      }
      // ④ 窗口内必须同时出现公司名（±120 字），避免把"某行业通用描述"里的字段算进来
      const seg = flat.slice(Math.max(0, c.at - 120), c.at + 200);
      if (seg.indexOf(name) < 0) continue;
      fields[key] = c.value;
      evidence.push({ field: key, value: c.value, context: seg.slice(0, 120) });
      break;
    }
  }
  return { fields: fields, evidence: evidence, windows: 1 };
}


/**
 * 联网取证。返回 { fields, evidence, channels[], engines[] }
 * channels 供 analyze 的「数据通道」表直接展示，状态如实：ok / empty / blocked / failed。
 */
async function fetchPublicRegistry(company, opts) {
  const o = opts || {};
  const name = String(company || '').replace(/\s/g, '');
  const out = { fields: {}, evidence: [], channels: [], engines: [] };
  if (!name) return out;

  // 结果缓存 12 小时：检索源对频率敏感（实测连发几次就进挑战页），
  // 同一家公司在一次分析里可能被工商层调用多次，必须只打一次。
  const hit = _cache.get(name);
  if (hit && Date.now() < hit.exp) return hit.val;

  // 查询词：公司全名 + 工商三件套。不加引号（搜索引擎对引号处理不一致）
  const q = name + ' 法定代表人 注册资本 统一社会信用代码 成立日期';
  const need = function () { return !out.fields.legalPerson || !out.fields.creditNo; };

  for (const eng of ENGINES) {
    if (!need()) break;
    if (cooling(eng.key)) {
      out.channels.push({ name: '公开检索摘要·' + eng.name, status: 'blocked', note: '最近触发过反爬，冷却中（10 分钟后自动重试）' });
      out.engines.push({ key: eng.key, name: eng.name, status: 'cooldown', fields: 0, ms: 0 });
      continue;
    }
    if (out.engines.length > 0) await sleep(500); // 换源前歇一下，别把两个源一起打限
    const t0 = Date.now();
    let html = null;
    try {
      html = await fetchHtml(eng.url(q), { ms: o.ms || 12000, referer: eng.referer });
    } catch (e) {
      out.channels.push({ name: '公开检索摘要·' + eng.name, status: 'failed', note: '请求失败：' + (e.message || '网络异常').slice(0, 50) });
      out.engines.push({ key: eng.key, name: eng.name, status: 'failed', fields: 0, ms: Date.now() - t0 });
      continue;
    }
    const text = htmlToText(html);
    // 反爬识别：页面过短或命中挑战页特征
    const blocked = text.length < 3000 || /安全验证|验证码|antispider|访问过于频繁|reventonCode/.test(text.slice(0, 4000));
    if (blocked) {
      markBlocked(eng.key);
      out.channels.push({ name: '公开检索摘要·' + eng.name, status: 'blocked', note: '触发反爬/挑战页，改用下一个检索源' });
      out.engines.push({ key: eng.key, name: eng.name, status: 'blocked', fields: 0, ms: Date.now() - t0 });
      continue;
    }
    const parsed = parse(text, name);
    const keys = Object.keys(parsed.fields);
    for (const k of keys) {
      if (out.fields[k]) continue;
      out.fields[k] = parsed.fields[k];
      const ev = parsed.evidence.find(function (x) { return x.field === k; });
      out.evidence.push({ field: k, value: parsed.fields[k], engine: eng.name, context: ev ? ev.context : '' });
    }
    out.channels.push({
      name: '公开检索摘要·' + eng.name,
      status: keys.length ? 'ok' : 'empty',
      note: keys.length
        ? '命中 ' + keys.map(labelOf).join('、') + '（检索摘要，需核对）'
        : '页面可达但未解析到工商字段'
    });
    out.engines.push({ key: eng.key, name: eng.name, status: keys.length ? 'ok' : 'empty', fields: keys.length, ms: Date.now() - t0 });
  }

  if (Object.keys(out.fields).length > 0) _cache.set(name, { val: out, exp: Date.now() + 12 * 3600 * 1000 });
  return out;
}

const LABELS = {
  legalPerson: '法定代表人',
  regCapital: '注册资本',
  establishDate: '成立日期',
  creditNo: '统一社会信用代码',
  status: '经营状态'
};
function labelOf(k) { return LABELS[k] || k; }

module.exports = { fetchPublicRegistry, parse, htmlToText, labelOf, LABELS, ENGINES, looksLikeName };
