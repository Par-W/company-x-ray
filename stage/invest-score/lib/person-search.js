'use strict';

// 人物检索通道：复用 invest-score 的检索实现（零依赖、百度优先）
// 必应对人名查询易漂移到词典噪声（"王(汉语文字)/汉典"），百度对中文人名质量最高

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ---------- 进程内 TTL 缓存（提速：同一"人名+公司"组合在一次分析里可能被多处引用） ----------
const _pcache = new Map();
function pcached(key, ttlMs, fn) {
  const e = _pcache.get(key);
  if (e && Date.now() < e.exp) return Promise.resolve(e.val);
  return Promise.resolve().then(fn).then(function (v) {
    if (v !== undefined && v !== null) {
      if (_pcache.size >= 300) { let n = 0; for (const k of _pcache.keys()) { _pcache.delete(k); if (++n >= 60) break; } }
      _pcache.set(key, { val: v, exp: Date.now() + ttlMs });
    }
    return v;
  });
}

function withTimeout(ms) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, ms);
  return { signal: ctl.signal, done: function () { clearTimeout(t); } };
}

async function fetchText(url, ms, charset) {
  const to = withTimeout(ms || 8000);
  try {
    const res = await fetch(url, {
      signal: to.signal,
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (charset === 'gbk') {
      try { return new TextDecoder('gbk').decode(buf); } catch (e) { return buf.toString('utf8'); }
    }
    return buf.toString('utf8');
  } finally {
    to.done();
  }
}

// 百度直连（人物检索首选）
// 提速：复用 sources.js 的百度反爬冷却状态——若主链路刚被百度风控拦截，逐人检索直接跳过百度，
//       立刻走必应兜底，避免 N 个人各白等一次超时（12 人 × 7s ≈ 84s 的无谓消耗）。
let BAIDU_BLOCKED_UNTIL = 0;
const BAIDU_COOLDOWN_MS = 10 * 60 * 1000;
function markBaiduBlocked() { BAIDU_BLOCKED_UNTIL = Date.now() + BAIDU_COOLDOWN_MS; }
function isBaiduBlocked() {
  try {
    const s = require('./sources');
    if (typeof s.isBaiduCoolingDown === 'function' && s.isBaiduCoolingDown()) { markBaiduBlocked(); return true; }
  } catch (e) { /* sources 不可用时用本地状态 */ }
  return Date.now() < BAIDU_BLOCKED_UNTIL;
}

async function searchNewsBaidu(query, ms) {
  if (isBaiduBlocked()) return []; // 冷却期内零等待短路
  const u = 'https://www.baidu.com/s?wd=' + encodeURIComponent(query) + '&rn=10';
  const txt = await fetchText(u, ms || 8000);
  if (txt.length < 2500 && /安全验证|wappass|百度安全/.test(txt)) { markBaiduBlocked(); return []; }
  const re = /<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/g;
  let m; const out = [];
  while ((m = re.exec(txt)) !== null && out.length < 10) {
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (title) out.push({ title, url: m[1] });
  }
  return out;
}

// 必应网页版（次选）
async function searchNewsBing(query, ms) {
  const txt = await fetchText('https://www.bing.com/search?q=' + encodeURIComponent(query) + '&mkt=zh-CN&setlang=zh-CN', ms || 8000);
  const re = /<h2[^>]*><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g;
  let m; const out = [];
  while ((m = re.exec(txt)) !== null && out.length < 10) {
    const title = m[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim();
    if (title) out.push({ title, url: m[1] });
  }
  return out;
}

// 单字/双字人名被搜索引擎漂移成词典/姓氏/无关词条噪声，噪声比例 ≥60% 视为无效检索
const DICT_NOISE = /(汉语|汉典|字典|拼音|部首|笔画|的意思|的解释|王者荣耀|姓氏|怎么读|起名|姓名测试|组词|宗亲|历史上的.*人物|古今名人|DM-i|报价_图片|汽车之家)/;

// 标题与检索意图的相关性校验：标题需含人名或公司品牌词（重名/漂移防护）
function filterDictNoise(items, personName, company) {
  if (!items || items.length === 0) return [];
  const real = items.filter(function (it) {
    if (DICT_NOISE.test(it.title)) return false;
    // 标题必须含人名（或公司品牌词）——防止"任林"搜出别的任林、"李斌"搜出李姓百科
    return it.title.includes(personName) || (company && it.title.includes(company.replace(/（[^）]*）|\([^)]*\)/g, '').slice(0, 2)));
  });
  return real.length > 0 ? real : [];
}

// 人物专属检索：百度优先（人名引号精确匹配），必应兜底；过滤词典噪声与不相关结果
// 缓存 5 分钟：同名人物在同一批次/重复查询中直接命中，避免重复打搜索引擎（提速 + 降反爬风险）
async function searchPersonNews(personName, company) {
  return pcached('p:' + personName + '|' + (company || ''), 5 * 60 * 1000,
    function () { return searchPersonNewsUncached(personName, company); });
}

async function searchPersonNewsUncached(personName, company) {
  const brand2 = company ? company.replace(/（[^）]*）|\([^)]*\)/g, '').slice(0, 2) : '';
  const queries = company
    ? ['"' + personName + '" ' + company + ' 董事长 简历', '"' + personName + '" ' + company + ' 高管']
    : ['"' + personName + '" 简历 职务'];
  // 提速：原实现逐个 query 串行（2 个 × 最多 7s）。改为并发发起，取"首个非空结果"——
  // 两者结果等价（都返回第一组有效命中），但最坏耗时从 14s 降到 7s，常规则降到 3-4s。
  const baiduTries = queries.map(function (q) {
    return searchNewsBaidu(q, 7000)
      .then(function (r) { return filterDictNoise(r, personName, company); })
      .catch(function () { return []; });
  });
  const settled = await Promise.all(baiduTries);
  for (const r of settled) { if (r && r.length > 0) return r.slice(0, 6); }
  try {
    return filterDictNoise(await searchNewsBing('"' + personName + '" ' + (company || ''), 7000), personName, company).slice(0, 6);
  } catch (e) {
    return [];
  }
}

// 公司主新闻检索（给 judgePersonMarkers 提供公司级报道标题）
async function searchCompanyNews(company, ms) {
  try {
    return await searchNewsBaidu(company, ms || 8000);
  } catch (e) {
    try { return await searchNewsBing(company, ms || 8000); } catch (e2) { return []; }
  }
}

module.exports = { fetchText, searchNewsBaidu, searchNewsBing, searchPersonNews, searchCompanyNews };
