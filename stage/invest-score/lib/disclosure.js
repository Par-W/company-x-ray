'use strict';

// 交易所披露原文（巨潮资讯 cninfo）—— 一手来源
//
// 为什么专门加这一路：
//   1. 上市公司有强制披露义务：重大诉讼、行政处罚、高管变动**必须**发公告。
//      所以「查不到相关公告」本身是有信息量的（披露层面干净），
//      而「查不到新闻」只是没人写，两者不能混为一谈。
//   2. 公告标题 + 日期 + 原文 PDF 链接，是可回指的事实，比新闻标题党可靠。
//   3. 新闻是二手的：一条「某某公司诉讼缠身」的稿子可能只是转载旧闻。
//
// 覆盖边界（必须如实告知，不许含糊）：
//   • 只有 A 股（沪/深/北）。港股与未上市公司没有这套披露义务 → 返回 unsupported。
//   • unsupported 时**绝不能**把「没查到」写成「没有诉讼」——那是把「无数据」当「无风险」。
//   • 公告只覆盖「达到披露标准」的事项；小额诉讼、未达标准的处罚不会出现在公告里。

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HOST = 'http://www.cninfo.com.cn';
const QUERY_URL = HOST + '/new/hisAnnouncement/query';
const STATIC_URL = 'http://static.cninfo.com.cn/';
const HKEX_CORE = 'https://www1.hkexnews.hk';

// ---------- 公告分类 ----------
// 一个标题可以命中多个类别（「关于收到警示函及涉及诉讼的公告」两类都算）。
// 判据只看标题：正文要下 PDF 解析，成本与稳定性都不划算，而标题在 A 股是强制概括的。
//
// ⚠ 正则必须**同时认繁简**：A 股（巨潮）是简体，港股（披露易）是繁体。
//    第一版只写简体，港股 76 条公告一条都匹配不上（"辭任"不等于"辞任"）。
const RULES = [
  {
    key: 'litigation', label: '诉讼与仲裁',
    re: /(诉讼|訴訟|仲裁|判决|判決|裁定|起诉|起訴|应诉|應訴|申请执行|申請執行|强制执行|強制執行|财产保全|財產保全|查封|扣押|法律程序)/
  },
  {
    key: 'penalty', label: '监管处罚与问询',
    re: /(行政处罚|行政處罰|处罚决定|處罰決定|警示函|监管函|監管函|监管措施|監管措施|纪律处分|紀律處分|公开谴责|公開譴責|通报批评|通報批評|立案调查|立案調查|问询函|問詢函|关注函|關注函|责令改正|責令改正|整改|违规|違規|罚款|罰款|制裁|处分|處分)/
  },
  {
    key: 'management', label: '高管与治理变动',
    re: /(辞职|辭職|辞任|辭任|离任|離任|解聘|聘任|换届|換屆|选举|選舉|代为履行|代為履行|代行|法定代表人变更|法定代表人變更|董事长.*辞|總經理.*辭|总经理.*辞|财务总监.*辞|董事會秘書.*辭|董事会秘书.*辞|委任|調任|调任|退任|卸任|辭世|辞世)/
  },
  {
    key: 'equity', label: '股权风险',
    re: /(股份质押|股份質押|质押|質押|司法拍卖|司法拍賣|被动减持|被動減持|被冻结|被凍結|轮候冻结|輪候凍結|减持计划|減持計劃|权益变动|權益變動|要约收购|要約收購|配售|供股|回購|回购|抵押|押記)/
  },
  {
    key: 'warning', label: '业绩与风险提示',
    re: /(业绩预告|業績預告|预亏|預虧|预减|預減|商誉减值|商譽減值|计提|計提|退市风险|退市風險|风险提示|風險提示|终止上市|終止上市|盈利警告|虧損|亏损|停牌|恢復買賣|恢复买卖)/
  }
];

// ---------- 市场判断 ----------
// A 股（6 位）走巨潮；港股（5 位）走披露易。北交所（8/4 开头 6 位）先不放开 ——
// 宁可标 unsupported 也不给一个可能漏数据的"看起来成功"。
function marketOf(code) {
  const c = String(code || '').trim();
  if (/^\d{5}$/.test(c)) return 'hkex';
  // ⚠⚠ 必须同时认「带市场前缀」的代码格式。
  //   上游 sources.js 统一用 'sz002356' / 'sh600519' 这种格式（东财 secucode 前缀式），
  //   而这里原来只认纯 6 位数字 —— 结果 A 股**全部**被判成"无法识别"，
  //   巨潮披露这一路从来没跑过，诉讼维度的真实来源一直是空的。
  //   这是个不容易发现的 bug：它不报错，只是静默地把整条数据源关掉。
  const bare = c.replace(/^(sh|sz|bj)/i, '');
  if (/^\d{5}$/.test(bare)) return 'hkex';
  if (!/^\d{6}$/.test(bare)) return null;
  if (/^(60|68|11|13|50|51|58)/.test(bare)) return 'sse';
  if (/^(00|30|12|15|16|18|39)/.test(bare)) return 'szse';
  return null;
}

/** 把 'sz002356' 这类带前缀代码转成巨潮要的纯 6 位数字（'002356'）。 */
function bareCode(code) {
  return String(code || '').trim().replace(/^(sh|sz|bj)/i, '');
}

// ---------- 单次请求 ----------
async function postForm(url, form, ms) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, ms || 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': HOST + '/new/commonUrl?url=disclosure/list/notice',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: form
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    return txt;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 公司标识（orgId） ----------
// cninfo 的查询接口有两种定位方式，实测结论（2026-10 逐个试过）：
//   ① stock=<代码>,<orgId>  → 精确锁定这一家公司（推荐）
//   ② searchkey=<关键词>     → 全文本检索，会带出别家（代码出现在别人公告里也会命中）
//   ③ stock=<orgId>,<代码>  → 返回 0（参数顺序写反就是这个下场，踩过一次）
//   ④ stock 与 searchkey 同时给 → 互斥，返回 0（不是"过滤"，是"作废"）
// 所以：先查 orgId，再按 ① 精确拉，分类放在本地做。
const _orgCache = new Map();

async function fetchOrgId(code) {
  const c = String(code || '').trim();
  if (_orgCache.has(c)) return _orgCache.get(c);
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, 10000);
  try {
    const res = await fetch(HOST + '/new/information/topSearch/query', {
      method: 'POST',
      signal: ac.signal,
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': HOST + '/'
      },
      body: 'keyWord=' + encodeURIComponent(c) + '&maxNum=10'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const arr = await res.json();
    if (!Array.isArray(arr)) {
      _orgCache.set(c, null);
      return null;
    }
    const hit = arr.find(function (x) { return String(x.code) === c; });
    const org = hit && hit.orgId ? String(hit.orgId) : null;
    _orgCache.set(c, org);
    return org;
  } catch (e) {
    _orgCache.set(c, null);   // 失败也缓存，避免同一次分析反复重试
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function ymd(ts) {
  // cninfo 的 announcementTime 是毫秒时间戳
  const n = Number(ts);
  if (!isFinite(n) || n <= 0) return '';
  const d = new Date(n);
  if (isNaN(d.getTime())) return '';
  const p = function (x) { return String(x).padStart(2, '0'); };
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  const p = function (x) { return String(x).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function today() {
  const d = new Date();
  const p = function (x) { return String(x).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function classify(title) {
  const hits = [];
  for (const r of RULES) {
    if (r.re.test(title)) hits.push(r.key);
  }
  // 误判修正：「代表委任表格」是股东大会的**代理人委托书**（proxy form），
  // 不是人事变动。只按"委任"二字判断会把每家公司的股东会通知都算成高管变动。
  if (/代表委任表格|委任代表表格|代表委任書|代表委任书|委任表格/.test(title)) {
    return hits.filter(function (k) { return k !== 'management'; });
  }
  // 误判修正：「因非本公司事项」的个人处罚不是公司处罚。
  //  实测真实案例：
  //    「关于独立董事因非本公司事项收到《行政处罚决定书》的公告」  ← 独董个人被罚
  //    「关于公司实际控制人因非本公司事项收到…行政处罚决定书的公告」 ← 实控人个人被罚
  //  这两条里公司本身没有任何违规，第一版一律按 penalty 扣分是**冤枉了公司**。
  if (/因非本公司事项|因非本企业事项|因个人原因|非因公司/.test(title)) {
    return hits.filter(function (k) { return k !== 'penalty'; });
  }
  // 误判修正：「问询函的**回复**」不是处罚。
  //  「关于公司对深圳证券交易所2023年年报问询函的回复公告」——问询是监管在问，
  //  回复是公司在答；只有「收到问询函」本身才是被监管盯上的事实。
  if (/问询函.*的回复|问询函.*回复公告|问询函之回复|回覆.*問詢函/.test(title)) {
    return hits.filter(function (k) { return k !== 'penalty'; });
  }
  return hits;
}

// ---------- 时间窗切分 ----------
// 为什么要切：接口每页固定 30 条，公告多的公司（宁德时代 24 个月 459 条）一口气翻不完，
// 于是「只看了最近 11 个月」却把结果当成「24 个月没有诉讼」—— 那是最危险的一种错：
// 数据不全被读成风险不存在。按自然年切分后，每段各自翻到拿完为止，覆盖边界可核对。
function pad2(x) { return String(x).padStart(2, '0'); }
function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }

function spansFor(months) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  const spans = [];
  let cur = new Date(start.getFullYear(), 0, 1);
  if (cur < start) {
    // 首段从窗口起点开始，到当年年底
    const yEnd = new Date(start.getFullYear(), 11, 31);
    spans.push([fmtDate(start), fmtDate(yEnd > now ? now : yEnd)]);
    cur = new Date(start.getFullYear() + 1, 0, 1);
  }
  while (cur <= now) {
    const yEnd = new Date(cur.getFullYear(), 11, 31);
    spans.push([fmtDate(cur), fmtDate(yEnd > now ? now : yEnd)]);
    cur = new Date(cur.getFullYear() + 1, 0, 1);
  }
  return spans;
}

/**
 * 拉某只 A 股近 N 个月的公告，按类别归档。
 *
 * @param {object} p  { code, name }
 * @param {object} o  { months=24, maxPages=7, pageSize=30, ms=15000 }
 * @returns {object} 见文件末尾的空结构
 */
async function fetchDisclosures(p, o) {
  const opt = o || {};
  const months = opt.months || 24;
  const pageSize = opt.pageSize || 30;
  // 只清洗数字代码（港股 "2097" → "02097" 前面会补零）；
  // 美股 ticker（BABA）不是数字，原样保留 —— 否则会被清洗成空串，
  // 上层就分不清"美股不覆盖"和"没给我代码"了。
  // ⚠ 还要剥掉市场前缀：上游给的是 'sz002356' / 'sh600519' 这种格式，
  //   而巨潮要的是纯 6 位数字（'002356'）。不剥的话整条路静默失效。
  const rawCode = String((p && p.code) || '').trim();
  const stripped = bareCode(rawCode);
  const code = /^\d+$/.test(stripped)
    ? (stripped.length <= 5 ? stripped.padStart(5, '0') : stripped.slice(0, 6))
    : rawCode;   // 不是数字（含字母）→ 原样保留（美股 ticker）
  const name = String((p && p.name) || '').trim();

  const out = emptyResult();
  out.code = code || null;
  out.months = months;

  const column = marketOf(code);
  if (!column) {
    out.status = 'unsupported';
    // 三种"不支持"要分清：美股 ticker / 北交所代码 / 压根没给代码。
    // 混成一句"无法检索"会让人以为换个写法就能查到。
    if (/^[A-Za-z][A-Za-z.\-]*$/.test(code)) {
      out.note = '美股（' + code + '）不在巨潮/披露易覆盖范围，财报与高管变动走 SEC EDGAR，诉讼无同口径来源';
    } else if (/^\d{6}$/.test(code)) {
      out.note = '代码 ' + code + ' 属北交所，暂未接入（北交所公告不在巨潮检索范围内）';
    } else {
      out.note = code ? '代码 ' + code + ' 无法识别为沪深/港股' : '没有可检索的股票代码，无法查交易所披露';
    }
    return out;
  }
  if (column === 'hkex') return fetchHkex(code, months, out, opt);

  const since = monthsAgo(months);
  out.span = since + ' 至 ' + today();

  // 先拿 orgId：拿得到就精确锁定公司；拿不到退回 searchkey（会带噪音，但比没有强），
  // 并在笔记里写明是降级方式 —— 读者有权知道这一条结论踩着多稳的地基。
  const orgId = await fetchOrgId(code);
  out.orgId = orgId || null;
  const locator = orgId
    ? 'stock=' + encodeURIComponent(code + ',' + orgId)
    : 'searchkey=' + encodeURIComponent(code);

  const spans = spansFor(months);
  out.spans = spans.map(function (s) { return s[0] + '~' + s[1]; });

  let total = 0;
  const raw = [];
  const seenId = new Set();
  const pageCap = opt.maxPagesPerSpan || 12;   // 单段最多 360 条，正常公司远用不到

  for (const span of spans) {
    const seDate = span[0] + '~' + span[1];
    let spanTotal = 0;
    for (let page = 1; page <= pageCap; page++) {
      const form = [
        'pageNum=' + page,
        'pageSize=' + pageSize,
        'column=' + column,
        'tabName=fulltext',
        'plate=',
        locator,
        'secid=',
        'category=',
        'trade=',
        'seDate=' + seDate,
        'sortName=',
        'sortType=',
        'isHLtitle=true'
      ].join('&');

      let txt;
      try {
        txt = await postForm(QUERY_URL, form, opt.ms);
      } catch (e) {
        if (!raw.length) {
          out.status = 'failed';
          out.note = '巨潮资讯请求失败：' + String((e && e.message) || '网络异常').slice(0, 60);
          return out;
        }
        break;
      }

      let j;
      try {
        j = JSON.parse(txt);
      } catch (e) {
        if (!raw.length) {
          out.status = 'blocked';
          out.note = '巨潮资讯返回非 JSON（可能被限流或改版）';
          return out;
        }
        break;
      }

      const rows = (j && j.announcements) || [];
      if (page === 1) spanTotal = Number(j.totalAnnouncement || 0) || 0;
      if (!rows.length) break;
      for (const r of rows) {
        const id = String(r.announcementId || '') || (stripTags(r.secCode) + '|' + stripTags(r.announcementTitle) + '|' + r.announcementTime);
        if (seenId.has(id)) continue;
        seenId.add(id);
        raw.push(r);
      }
      if (page * pageSize >= spanTotal) break;
    }
    total += spanTotal;
  }

  if (!raw.length) {
    // 有代码但一条公告都没有 —— 极少见（新上市/退市）。这属于「查到了、确实没有」。
    out.status = 'empty';
    out.note = '近 ' + months + ' 个月在巨潮未检索到该公司公告';
    return out;
  }

  // 归属校验：即使走的是 stock 精确筛选，也再核一次代码 ——
  // 接口换实现时不至于把别家的公告算到这家头上（这类错一旦混进结论，比没数据更糟）。
  const seen = new Set();
  const items = [];
  let foreign = 0;
  for (const r of raw) {
    const scode = stripTags(r.secCode);
    if (scode && scode !== code) { foreign++; continue; }
    const t = stripTags(r.announcementTitle);
    const key = (r.announcementId || '') + '|' + t;
    if (seen.has(key)) continue;
    seen.add(key);
    const date = ymd(r.announcementTime);
    if (date && date < since) continue;   // 翻页带进来的边界外条目
    items.push({
      title: t,
      date: date,
      url: r.adjunctUrl ? STATIC_URL + String(r.adjunctUrl).replace(/^\//, '') : '',
      cats: classify(t)
    });
  }
  out.foreign = foreign;
  out.locator = orgId ? 'stock' : 'searchkey';

  if (!items.length) {
    out.status = 'empty';
    out.note = '检索到 ' + raw.length + ' 条公告，但没有一条属于 ' + code + ' 本身';
    return out;
  }

  return summarize(out, items, total, months, orgId ? '' : '；未能精确锁定公司，按代码全文检索', '巨潮资讯·交易所披露');
}

/**
 * 把公告列表归成五类并算出覆盖边界 —— A 股与港股共用同一套汇总逻辑。
 * 两个市场的差别只在「怎么拿到公告列表」，拿到之后该怎么读是一样的。
 */
function summarize(out, items, total, months, srcNote, sourceName) {
  items.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });

  out.status = 'ok';
  out.total = items.length;
  out.announcementTotal = total;
  out.items = items;

  // 覆盖边界：显式记下来，别让「只看了 11 个月」被读成「24 个月都没事」。
  // 判定用「最早一条是否触到窗口前 2 个月」，留两个月余量给公告稀疏的窗口。
  const ds = items.map(function (it) { return it.date; }).filter(Boolean).sort();
  out.earliest = ds[0] || '';
  out.latest = ds[ds.length - 1] || '';
  const grace = monthsAgo(Math.max(0, months - 2));
  out.complete = items.length >= total
    ? true
    : (!!out.earliest && out.earliest <= grace);
  for (const r of RULES) {
    const list = items.filter(function (it) { return it.cats.indexOf(r.key) >= 0; });
    out.cats[r.key] = {
      key: r.key,
      label: r.label,
      count: list.length,
      latest: list.length ? list[0] : null,
      // ⚠ 保留全部条目（原来只留 5 条）。诉讼分级要按"事项"归并并逐条定级，
      //   截断到 5 条会把第 6 条起的诉讼漏掉 —— 分数因此偏乐观。
      //   单类别几百条也不会撑爆响应（每条只有标题/日期/链接）。
      items: list
    };
  }

  // 红旗：只放「确定发生过、且投资人会追问」的那几类。
  // 注意「高管变动」这一条要区分性质：换届/聘任是正常治理动作，只有「辞任/解聘/代为履职」
  // 才是值得追问的信号。把两者混在一起会把"聘任了董事会秘书"说成治理风险。
  const c6 = items.filter(function (it) { return it.date >= monthsAgo(6); });
  const recent = function (k) {
    return c6.filter(function (it) { return it.cats.indexOf(k) >= 0; }).length;
  };
  const irregular6 = c6.filter(function (it) {
    return it.cats.indexOf('management') >= 0 && IRREGULAR_EXIT.test(it.title);
  }).length;
  if (recent('litigation')) out.flags.push('近 6 个月有 ' + recent('litigation') + ' 条诉讼/仲裁类公告');
  if (recent('penalty')) out.flags.push('近 6 个月有 ' + recent('penalty') + ' 条监管处罚/问询类公告');
  if (irregular6 >= 2) out.flags.push('近 6 个月辞任/解聘类公告 ' + irregular6 + ' 条（关注治理稳定性）');
  if (recent('equity')) out.flags.push('近 6 个月有 ' + recent('equity') + ' 条股权质押/变动类公告');
  if (recent('warning')) out.flags.push('近 6 个月有 ' + recent('warning') + ' 条业绩/风险提示类公告');

  out.channel = {
    name: sourceName,
    status: 'ok',
    note: '近 ' + months + ' 个月 ' + items.length + ' 条公告（诉讼 ' + out.cats.litigation.count
      + ' / 处罚问询 ' + out.cats.penalty.count + ' / 高管变动 ' + out.cats.management.count + '）'
      + (srcNote || '')
  };
  return out;
}

// 非常规退出（负面信号）；「委任/聘任/换届/选举」是正常治理动作，不在此列。
// 简繁都要认 —— 港股公告是繁体。
const IRREGULAR_EXIT = /(辞职|辭職|辞任|辭任|离任|離任|解聘|解除|代为履行|代為履行|代行|卸任|退任|辭世|辞世)/;

/**
 * 港股：港交所「披露易」（HKEXnews）。
 *
 * 与 A 股的差别：
 *   • 港交所公告标题是**繁体**（"辭任"不是"辞任"），分类正则必须繁简都认；
 *   • 日期是 DD/MM/YYYY，要转成 YYYY-MM-DD 才能和别处比较；
 *   • 接口要先用 prefix.do 把 5 位代码换成内部 stockId；
 *   • rowRange 一次最多给几百条，超了 hasNextRow=true，此时标覆盖不完整。
 *
 * 港股同样有强制披露义务（主板上市规则第 13 章），所以「公告里没有」同样有信息量。
 */
async function fetchHkex(code, months, out, opt) {
  const c = String(code).padStart(5, '0');
  out.code = c;
  out.market = 'hkex';
  const since = monthsAgo(months);
  out.span = since + ' 至 ' + today();

  // ① 代码 → stockId
  let stockId = null;
  try {
    const txt = await getText(HKEX_CORE + '/search/prefix.do?callback=cb&lang=ZH&type=A&name='
      + encodeURIComponent(c) + '&market=SEHK', (opt && opt.ms) || 15000);
    const m = String(txt || '').match(/^[^(]*\(([\s\S]*)\)\s*;?\s*$/);
    if (m) {
      const j = JSON.parse(m[1]);
      const hit = (j.stockInfo || []).find(function (x) {
        return String(x.code).padStart(5, '0') === c && x.stockId;
      });
      if (hit) stockId = hit.stockId;
    }
  } catch (e) {
    out.status = 'failed';
    out.note = '港交所代码检索失败：' + String((e && e.message) || '').slice(0, 50);
    return out;
  }
  if (!stockId) {
    out.status = 'empty';
    out.note = '港交所披露易未找到代码 ' + c + ' 对应的公司';
    return out;
  }
  out.orgId = String(stockId);

  // ② 拉公告（超过 rowRange 时标不完整，不假装拿全了）
  const from = since.replace(/-/g, '');
  const to = today().replace(/-/g, '');
  const url = HKEX_CORE + '/search/titleSearchServlet.do?sortDir=0&sortByOptions=DateTime'
    + '&category=0&market=SEHK&stockId=' + encodeURIComponent(stockId)
    + '&documentType=-1&fromDate=' + from + '&toDate=' + to
    + '&title=&searchType=0&t1code=-2&t2Gcode=-2&t2code=-2'
    + '&rowRange=500&lang=ZH';

  let j;
  try {
    const txt = await getText(url, (opt && opt.ms) || 25000);
    j = JSON.parse(txt);
  } catch (e) {
    out.status = 'failed';
    out.note = '港交所公告检索失败：' + String((e && e.message) || '').slice(0, 50);
    return out;
  }

  let rows = [];
  try {
    rows = JSON.parse(j.result || '[]');
  } catch (e) {
    rows = [];
  }
  if (!rows.length) {
    out.status = 'empty';
    out.note = '近 ' + months + ' 个月在港交所披露易未检索到该公司公告';
    return out;
  }

  const seen = new Set();
  const items = [];
  let foreign = 0;
  for (const r of rows) {
    // 港交所一个公告可能同时挂多个柜台，STOCK_CODE 形如 "00700<br/>80700"（人民币柜台）。
    // 直接和 "00700" 比会全部不相等 —— 腾讯 351 条公告因此全被判成"不属于本公司"。
    // 注意必须先把 <br/> 变成空格再切分：stripTags 会把标签**删掉**，两个代码就粘成一串了。
    const codes = htmlUnescape(String(r.STOCK_CODE || ''))
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (codes.length && codes.indexOf(c) < 0) { foreign++; continue; }
    const title = stripTags(htmlUnescape(String(r.TITLE || r.LONG_TEXT || '')));
    if (!title) continue;
    const key = String(r.NEWS_ID || '') || (title + '|' + r.DATE_TIME);
    if (seen.has(key)) continue;
    seen.add(key);
    const date = hkDate(r.DATE_TIME);
    if (date && date < since) continue;
    const link = String(r.FILE_LINK || '');
    items.push({
      title: title,
      date: date,
      url: link ? (HKEX_CORE + (link.charAt(0) === '/' ? link : '/' + link)) : '',
      cats: classify(title),
      // 港交所自带的分类标签（月報表 / 特別股息 / 中期報告…），比关键词更准，留着备查
      tag: stripTags(htmlUnescape(String(r.LONG_TEXT || r.SHORT_TEXT || '')))
    });
  }

  if (!items.length) {
    out.status = 'empty';
    out.note = '检索到 ' + rows.length + ' 条公告，但没有一条属于 ' + c + ' 本身';
    return out;
  }

  const total = Number(j.recordCnt || rows.length) || rows.length;
  const truncNote = j.hasNextRow ? '；公告数超过单次上限，覆盖不完整' : '';
  out.foreign = foreign;
  out.locator = 'stockId';
  const res = summarize(out, items, total, months, truncNote, '港交所披露易·交易所公告');
  if (j.hasNextRow) res.complete = false;
  return res;
}

// 港交所的日期是 DD/MM/YYYY HH:MM
function hkDate(s) {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
}

function htmlUnescape(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ');
}

async function getText(url, ms) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, ms || 15000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': HKEX_CORE + '/search/titlesearch.xhtml'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function emptyResult() {
  const cats = {};
  for (const r of RULES) cats[r.key] = { key: r.key, label: r.label, count: 0, latest: null, items: [] };
  return {
    status: 'pending', note: '', code: null, months: 0, span: '',
    total: 0, announcementTotal: 0, items: [], cats: cats, flags: [], channel: null,
    orgId: null, locator: '', foreign: 0
  };
}

// ---------- 维度打分 ----------
// 原则：分数必须能回指到"哪几条公告"，否则就是又一轮猜。
// 数据不足时返回 null（而不是 50），由调用方把这一维标成未评分。

/**
 * 诉讼事项的**分级**。
 *
 * 为什么第一版不够：原来只按「公告条数 × 6」扣分，把下面这些天差地别的事
 * 当成了同一档：
 *   「关于新增投资者诉讼事项及进展公告」  ← 虚假陈述索赔，风险最高
 *   「关于收到祥云小额贷款案终审判决的公告」← 普通商事纠纷，风险最低
 *   「关于诉讼进展的公告」                ← 什么都不知道
 * 三条扣一样的分，那这个分数就没有信息量 —— 它只是"公告条数"的换皮。
 *
 * 现在按三个维度分级（都只读标题，标题在 A 股是强制概括的）：
 *   ① 性质 severity：事项性质决定风险量级
 *   ② 角色 role：原告 / 被告 / 第三人 —— 公司主动维权 ≠ 公司被人起诉
 *   ③ 阶段 stage：已判决 / 进展中 / 新增 —— 已定性比"又来一条"更重
 *
 * ⚠ 角色判据只看标题里有没有「原告/被告/被诉」这类字样，
 *   **没写不等于原告**，所以拿不到角色时按"角色未知"处理（不加分不减分），
 *   不能默认算被告 —— 那会把公司主动维权误判成风险。
 */
const LIT_GRADES = [
  {
    key: 'securities_claim', label: '投资者索赔（虚假陈述）', weight: 16,
    // 「投资者诉讼/索赔」是**投资者因公司信息披露违法**提起的索赔，
    // 金额通常巨大且往往集体诉讼 —— 这是能查到的最重的一类。
    re: /(投资者诉讼|投资者索赔|证券虚假陈述|虚假陈述|证券纠纷|集体诉讼)/,
    why: '投资者索赔（虚假陈述类）'
  },
  {
    key: 'criminal', label: '刑事涉诉', weight: 14,
    re: /(刑事|涉嫌犯罪|被逮捕|取保候审|公安|检察)/,
    why: '涉刑事事项'
  },
  {
    key: 'guarantee', label: '担保/债务违约', weight: 10,
    re: /(担保.*(?:诉讼|纠纷|违约|代偿)|债务违约|逾期.*(?:偿还|支付)|追偿|代偿)/,
    why: '担保或债务违约相关'
  },
  {
    key: 'major', label: '重大诉讼（标题明示）', weight: 10,
    re: /(重大诉讼|重大仲裁|巨额)/,
    why: '标题明示重大诉讼'
  },
  {
    key: 'ip', label: '知识产权纠纷', weight: 7,
    re: /(专利|商标|著作权|知识产权).*(?:诉讼|仲裁|纠纷|无效|侵权)|(?:诉讼|仲裁|纠纷).*(?:专利|商标)/,
    why: '知识产权纠纷'
  },
  {
    key: 'execution', label: '被执行/财产保全', weight: 8,
    re: /(被执行|失信被执行|财产保全|冻结|查封|扣押|限制高消费|强制执行)/,
    why: '被执行或财产保全'
  },
  {
    key: 'ordinary', label: '一般商事诉讼', weight: 4,
    // 兜底：确实是诉讼，但看不出更具体的性质。
    re: /(诉讼|仲裁|判决|起诉|应诉|法律程序)/,
    why: '一般商事诉讼/仲裁'
  }
];

/** 从标题里判断诉讼事项的等级。返回 {key,label,weight,why} 或 null（不是诉讼）。 */
function gradeLitigation(title) {
  const t = String(title || '');
  for (const g of LIT_GRADES) {
    if (g.re.test(t)) return g;
  }
  return null;
}

/**
 * 判断公司在诉讼里的角色。
 *
 * ⚠ 关键：**没识别出角色时返回 'unknown'，不是 'defendant'**。
 *   标题没写原告被告不代表公司是被告 —— 猜错方向会把主动维权算成风险。
 */
function litRole(title) {
  const t = String(title || '');
  // 「被告」「被诉」「被起诉」「被申请执行」→ 公司是应诉方
  if (/(被告|被诉|被起诉|被申訴|被申请执行|被申请強制執行|应诉|應訴)/.test(t)) return 'defendant';
  // 「原告」「诉…公司」→ 公司是起诉方
  if (/(原告|起訴|起诉公司|提起诉讼|提起訴訟)/.test(t)) return 'plaintiff';
  return 'unknown';
}

/**
 * 判断诉讼所处阶段。已定性（判决/处罚）比"又来一条进展"更重。
 */
function litStage(title) {
  const t = String(title || '');
  if (/(终审|終審|二审判决|判決|判决|裁定|处罚决定|處罰決定|立案|侦查|偵查|起诉|起訴|判决书|已审结)/.test(t)) return 'decided';
  if (/(新增|首次|发生|重大|进展|更新|收到.*告知书)/.test(t)) return 'new';
  return 'ongoing';
}

/**
 * 诉讼与仲裁（分级口径）。
 *
 * 基准 82 分（披露层面清洁），按**分级**扣分，而不是按条数。
 * 注意：这是**披露层面**的口径 —— 未达披露标准的小额诉讼不在其中，
 * 所以上限不到 100，措辞也必须写明"未见需披露的诉讼"，不能写"无诉讼"。
 *
 * 扣分上限设计：同一件事会发多条公告（「新增投资者诉讼事项及进展公告」
 * 之后一路「进展公告」到终审），逐条计权会把一件事算成五六次 ——
 * 所以按**事项**归并：一组标题里最高的那条定级，其余只算进展。
 */
function litigationScore(d) {
  if (!d || d.status !== 'ok') return null;   // unsupported/empty/failed 一律不给分
  const c = d.cats.litigation;

  // ---- 1) 逐条定级，并按"事项"归并（避免同一件事被反复计权）----
  const items = c.items.map(function (it) {
    const g = gradeLitigation(it.title);
    if (!g) return null;
    return {
      title: it.title,
      date: it.date,
      grade: g,
      role: litRole(it.title),
      stage: litStage(it.title)
    };
  }).filter(Boolean);

  const why = [];
  if (!items.length) {
    // 走到这里说明分类规则命中了「诉讼」类，但分级规则一个都没匹配上 ——
    // 说明 RULES 里的诉讼正则比 LIT_GRADES 宽。保守起见按最轻的一档算，
    // 并把实际情况写进 why，让读者知道这里有不确定性。
    // ⚠ 必须返回**对象**：返回裸数字会让调用方取不到 .score/.why，
    //   依据就丢了（第一版写成了 `return d.complete ? 82 : 70`，
    //   结果"未见诉讼"时报告页一个字依据都显示不出来）。
    why.push('披露层面未见需披露的诉讼'
      + '（近 ' + d.months + ' 个月 ' + d.total + ' 条公告中无诉讼/仲裁类'
      + '（覆盖 ' + (d.earliest || '?') + ' 起' + (d.complete ? '' : '，时段不完整') + '））');
    return {
      score: d.complete ? 82 : 70,
      why: why,
      penalty: 0,
      items: 0,
      cases: 0,
      breakdown: {}
    };
  }

  // ---- 2) 按事项归并：同一"案件"的多条公告只取最重的一条 ----
  // 归并依据：标题里去掉「进展/新增/关于…的公告」等壳，剩下的关键词集合相近的视为同一案。
  // 不追求司法意义上的案件归并（那要读正文），只求"同一件事不会被数多次"。
  const buckets = [];
  for (const it of items) {
    const key = caseKey(it.title);
    let b = null;
    for (const x of buckets) { if (x.key === key) { b = x; break; } }
    if (!b) { b = { key: key, items: [] }; buckets.push(b); }
    b.items.push(it);
    // 桶内取最重的一条为准
    if (!b.top || it.grade.weight > b.top.grade.weight) b.top = it;
  }

  let penalty = 0;
  const breakdown = {};
  for (const b of buckets) {
    const it = b.top;
    const g = it.grade;
    // 角色修正：原告（公司主动维权）扣分减半；被告（公司被人起诉）不打折。
    // 阶段修正：已定性（判决/立案）额外 +40%；"新增"（又来一条）减 20%。
    // 这两个修正只影响**权重**，具体计分在下面的递减计权里统一做 ——
    // 否则会重复计一次（这是第一版写出来的 bug：算了两遍）。
    let w = g.weight;
    if (it.role === 'plaintiff') w = Math.round(w * 0.5);
    if (it.stage === 'decided') w = Math.round(w * 1.4);
    else if (it.stage === 'new') w = Math.round(w * 0.8);
    b.effective = w;
    breakdown[g.key] = (breakdown[g.key] || 0) + 1;
  }

  // 同一档出现多次时递减计权：第 1 条全额，之后每条只算 40%。
  // 理由：多条同类公告通常是"同一批事项"被拆开发布，不是 N 件独立的事。
  const seen = {};
  let finalPenalty = 0;
  for (const b of buckets) {
    const k = b.top.grade.key;
    seen[k] = (seen[k] || 0) + 1;
    const mult = seen[k] === 1 ? 1 : 0.4;
    finalPenalty += Math.round(b.effective * mult);
  }

  // 基准分：覆盖率不完整时压到 70：看到的是「已翻到的这段时间里没有诉讼」，
  // 不配拿 82 这种近乎"审计过"的分数。
  let s = d.complete ? 82 : 70;

  // 近期性加权：近 12 个月内的诉讼更值得关注（老的已经过去了）。
  const recent12 = items.filter(function (it) { return it.date >= monthsAgo(12); }).length;
  const recencyPenalty = Math.min(8, recent12 * 2);

  s -= finalPenalty + recencyPenalty;

  // ---- 3) 写清楚依据：每条都要能回指到具体公告 ----
  const parts = [];
  for (const k of Object.keys(breakdown)) {
    const g = LIT_GRADES.find(function (x) { return x.key === k; });
    parts.push(g.label + ' ' + breakdown[k] + ' 项');
  }
  why.push('披露层面诉讼事项：' + (parts.join('、') || '无') + '（按 ' + buckets.length + ' 个事项归并，共 ' + items.length + ' 条公告）');
  const byRole = buckets.filter(function (b) { return b.top.role === 'defendant'; }).length;
  const byPlain = buckets.filter(function (b) { return b.top.role === 'plaintiff'; }).length;
  if (byRole) why.push('其中公司作为被告 ' + byRole + ' 项');
  if (byPlain) why.push('公司主动起诉 ' + byPlain + ' 项（按较轻计权）');
  if (recent12) why.push('近 12 个月 ' + recent12 + ' 条诉讼相关公告');

  return {
    score: Math.max(8, Math.min(96, Math.round(s))),
    why: why,
    penalty: finalPenalty + recencyPenalty,
    items: items.length,
    cases: buckets.length,
    breakdown: breakdown
  };
}

/**
 * 判断治理层是否**刚经历过大规模更替**。
 *
 * 为什么需要它：只看"近 24 个月无辞任/解聘公告"会给刚换届的公司虚高的稳定性分
 * —— 换完人之后当然没有辞任。判据用两个可核实的信号：
 *   ① 过半高管任职不满 1 年（东财 INCUMBENT_TIME 的起始年份）
 *   ② 董事长/总经理任职不满 1 年
 * 命中就说"刚换过班子"，此时"无辞任"没有信息量。
 */
function recentlyTurnedOver(people) {
  const list = Array.isArray(people) ? people : [];
  if (list.length < 3) return false;
  const thisYear = new Date().getFullYear();
  const startYears = list.map(function (p) {
    const m = String(p.tenure || '').match(/(\d{4})/);
    if (!m) return null;
    const y = Number(m[1]);
    return (y && y >= 1980) ? y : null;
  }).filter(function (y) { return y !== null; });
  if (startYears.length < 3) return false;
  const fresh = startYears.filter(function (y) { return thisYear - y <= 1; }).length;
  // 过半是近一年上任的 → 视为刚换届
  return fresh >= Math.ceil(startYears.length / 2);
}

/**
 * 从标题提取"案件指纹"，用于把同一件事的多条公告归并。
 * 做法：剥掉「关于…的公告」「进展」「新增」这类壳，保留案件特征词。
 * 不追求司法意义的归并（那要读正文 PDF），只求"同一件事不被数多次"。
 *
 * ⚠ 剥壳顺序有讲究：先剥「的公告」再剥「进展」——
 *   反过来的话「…的进展公告」会先被剥成「…的进展」，再剥「进展」留下「…的」，
 *   尾巴上的「的」会让本该同案的标题算出不同指纹，归并就失效了
 *   （第一版就是这里出的问题：4 条投资者诉讼公告被算成 2 个案子）。
 */
function caseKey(title) {
  let t = String(title || '');
  t = t.replace(/^关于/, '');
  t = t.replace(/的公告$/, '').replace(/的进展公告$/, '').replace(/公告$/, '');
  t = t.replace(/进展|新增|更新|首次|收到|关于/g, '');
  t = t.replace(/[（(].*?[)）]/g, '');
  // 剥完之后的残留虚词也要去掉（"及"、"的"、"情况"等）
  t = t.replace(/[及和与的]/g, '');
  // 取最长的几个特征词做指纹
  const words = t.split(/[，,、：:；;]/).map(function (x) { return x.trim(); })
    .filter(function (x) { return x.length >= 2; })
    .sort(function (a, b) { return b.length - a.length; });
  return words.slice(0, 2).join('|');
}

/**
 * 团队与治理。
 * 数据 = 高管名单（东财 F10）+ 高管变动公告（巨潮）+ 公司基本资料（东财 F10）。
 * 三条都缺 → null；缺一部分 → 按有的算，但向中枢收敛。
 *
 * ⚠ 口径上刻意把「任职年限」降为参考项：
 *   东财 INCUMBENT_TIME 是「现任职务起始日」，**换届后全体归零**。
 *   茅台这种治理很稳的公司，换届后平均任职也会显示 1.6 年 ——
 *   拿它当「团队不稳」的证据就是错的（第一版就踩了这个坑）。
 *   真正说明问题的是「辞任/解聘/代为履职」这类非常规退出事件。
 *
 * ⚠ 为什么还要接持股/薪酬/学历/员工数：
 *   第一版只有「人数 + 变动条数」，那不是团队实力，是人数。
 *   现在这几项各自回答一个真问题：
 *     持股      管理层与股东利益是否绑定（持股 0 = 拿完薪就走）
 *     薪酬      激励是否与规模匹配（薪酬极低 → 留不住人）
 *     学历/年龄 结构（全是 29 岁硕士或全是 58 岁，都不是好信号）
 *     员工数    团队规模（只有董监高、没有员工数 = 中间层空心）
 *     独立董事  治理结构是否独立
 *     ST 历史   曾经被实施风险警示 —— 已经发生过的事实
 */
function teamScore(personnel, d, survey) {
  const people = Array.isArray(personnel) ? personnel : [];
  const hasPeople = people.length > 0;
  const hasDisc = !!(d && d.status === 'ok');
  const sv = survey || null;
  const hasSurvey = !!(sv && (sv.employees != null || sv.independentDirectors.length || sv.formerName || sv.auditor));
  if (!hasPeople && !hasDisc && !hasSurvey) return null;

  let s = 60;
  const why = [];
  // 记下"用了哪几路证据"，用于最后向中枢收敛。
  let evidence = 0;

  if (hasPeople) {
    evidence++;
    // 人数：治理层规模。太少说明职能集中（一人公司常见），不给高分也不重罚。
    s += Math.min(12, people.length * 1.2);
    why.push('高管 ' + people.length + ' 人');

    // ---- 管理层持股：利益绑定 ----
    // 只统计"明确持股为 0"的人（>0 说明有持股，null 说明未披露）。
    // ⚠ 未披露（null）不能当成 0 —— 那是两回事，混起来会冤枉公司。
    const withHold = people.filter(function (p) { return p.holdNum != null && p.holdNum > 0; });
    const zeroHold = people.filter(function (p) { return p.holdNum === 0; });
    if (withHold.length) {
      s += Math.min(8, withHold.length * 2);
      why.push('管理层 ' + withHold.length + ' 人持有公司股份（利益与股东绑定）');
    }
    if (zeroHold.length && zeroHold.length >= people.length * 0.6 && people.length >= 3) {
      // 过半管理层零持股：股权激励缺位或已清空，属于治理弱信号。
      s -= 5;
      why.push('管理层 ' + zeroHold.length + '/' + people.length + ' 人零持股（股权激励缺位）');
    }

    // ---- 薪酬：留人能力 ----
    const sals = people.map(function (p) { return p.salary; })
      .filter(function (x) { return x != null && isFinite(x) && x > 0; });
    if (sals.length >= 2) {
      const avg = sals.reduce(function (a, b) { return a + b; }, 0) / sals.length;
      // 只报事实 + 极轻微的相对判断。绝对金额无法跨公司比（茅台和 ST 股薪酬结构不同），
      // 所以这里只在"极低"时给一个小信号，不据此大加减分。
      why.push('已披露高管薪酬平均 ' + Math.round(avg / 10000) + ' 万元（' + sals.length + ' 人披露）');
    }

    // ---- 学历与年龄结构 ----
    const degs = people.map(function (p) { return p.degree; })
      .filter(function (x) { return x && x !== '-'; });
    if (degs.length >= 3) {
      const high = degs.filter(function (d2) { return /博士|硕士|研究生/.test(d2); }).length;
      const pct = Math.round((high / degs.length) * 100);
      if (pct >= 50) {
        s += Math.min(6, Math.round(pct / 12));
        why.push('高管学历结构：' + degs.length + ' 人中 ' + high + ' 人为硕博（' + pct + '%）');
      } else {
        why.push('高管学历结构：' + degs.length + ' 人中 ' + high + ' 人为硕博（' + pct + '%）');
      }
    }
    const ages = people.map(function (p) { return p.age; })
      .filter(function (x) { return x != null && x > 20 && x < 90; });
    if (ages.length >= 3) {
      const avgAge = ages.reduce(function (a, b) { return a + b; }, 0) / ages.length;
      // 年龄结构只报事实：平均年龄高低本身不是好坏，
      // 真正扎眼的是"全员同岁"（如同届班子），那说明没有梯队。
      const spread = Math.max.apply(null, ages) - Math.min.apply(null, ages);
      why.push('高管平均年龄 ' + avgAge.toFixed(1) + ' 岁（区间跨度 ' + spread + ' 岁）');
      if (spread <= 6 && ages.length >= 4) {
        s -= 4;
        why.push('高管年龄高度集中（跨度仅 ' + spread + ' 岁），接班梯队存疑');
      }
    }

    // ---- 家族接班形态：同姓扎堆 + 一把手年轻 ----
    // 实测案例（002356）：董事长 31 岁、副董事长 29 岁，二人同姓（郑），
    // 且 4/6 高管零持股 —— 典型的"家族交班、但新班子的利益还没绑进来"。
    // 这类结构在中小市值公司很常见，不该被当成"团队年轻有活力"来加分。
    const surn = people.map(function (p) { return String(p.name || '').charAt(0); })
      .filter(function (x) { return x && /[一-龥]/.test(x); });
    const topSurname = {};
    for (const sn of surn) topSurname[sn] = (topSurname[sn] || 0) + 1;
    const domSn = Object.keys(topSurname).sort(function (a, b) { return topSurname[b] - topSurname[a]; })[0];
    const domCount = domSn ? topSurname[domSn] : 0;
    if (domSn && domCount >= 2 && domCount >= people.length * 0.3) {
      const sameName = people.filter(function (p) { return String(p.name || '').charAt(0) === domSn; });
      const youngest = sameName.reduce(function (m, p) {
        return (p.age != null && (m === null || p.age < m.age)) ? p.age : m;
      }, null);
      if (youngest != null && youngest <= 35) {
        s -= 6;
        why.push('高管中 ' + domCount + ' 人同姓（' + domSn + '氏），其中最年长者仅 '
          + youngest + ' 岁（家族接班形态，新班子利益绑定待观察）');
      } else {
        why.push('高管中 ' + domCount + ' 人同姓（' + domSn + '氏）');
      }
    }

    const years = people.map(function (p) {
      const m = String(p.tenure || '').match(/(\d{4})/);
      if (!m) return null;
      const y = Number(m[1]);
      if (!y || y < 1980) return null;
      return new Date().getFullYear() - y;
    }).filter(function (x) { return x !== null && x >= 0 && x < 60; });
    if (years.length >= 3) {
      const avg = years.reduce(function (a, b) { return a + b; }, 0) / years.length;
      // 只报事实、不据此加减分：这是「本届任期」，换届即重置。
      why.push('本届任职平均 ' + avg.toFixed(1) + ' 年（换届会重置，不代表团队稳定性）');
    }
  }

  if (hasSurvey) {
    evidence++;
    // ---- 员工人数：团队规模 ----
    if (sv.employees != null && sv.employees > 0) {
      // 员工数本身不分好坏（银行 40 万人 vs 小公司 300 人没有可比性），
      // 只作为"这是一家有实体经营的公司"的旁证写出来。
      why.push('员工 ' + sv.employees + ' 人（年报口径，最近一期）');
    }
    // ---- 独立董事：治理独立性 ----
    if (sv.independentDirectors.length) {
      s += Math.min(6, sv.independentDirectors.length * 2);
      why.push('独立董事 ' + sv.independentDirectors.length + ' 人（' + sv.independentDirectors.join('、') + '）');
    }
    // ---- ST 历史：已经发生过的事实 ----
    // ⚠ 这不是"现在有问题"，而是"历史上被实施过风险警示"——
    //   必须让读者看见，但也不能当成当下的重罚项。
    //   扣 12 分（不是 8）：被实施过风险警示意味着曾经触发过财务或信披红线，
    //   这是治理层面的硬伤，比"股权激励缺位"重一档。
    if (sv.stHistory && sv.stHistory.length) {
      s -= 12;
      why.push('曾用名含「' + sv.stHistory.join('、') + '」（历史上被实施过风险警示）');
    }
    // ---- 一把手配置：两职合一 / 代任 ----
    // 董事长兼总经理 = 权力集中，代任总经理 = 关键岗位非正式。
    const chair = sv.chairman || '';
    const pres = sv.president || '';
    if (chair && pres && chair === pres) {
      s -= 4;
      why.push('董事长与总经理由同一人担任（两职合一，权力集中）');
    }
    // 代理总经理：东财 PRESIDENT 字段把代理标记放在名字后面（实测茅台是「王莉(代)」），
    // 所以判据要同时认「代理/代任」和「(代)／（代）」两种写法。
    if (/(代理|代理總經理|代理总经理|代任)/.test(pres) || /[(（]代[)）]/.test(pres)) {
      s -= 6;
      why.push('总经理由「' + pres + '」代理（关键岗位非正式任职）');
    }
    if (sv.auditor) {
      why.push('审计机构：' + sv.auditor);
    }
  }

  if (hasDisc) {
    evidence++;
    const c = d.cats.management;
    // 换届/聘任是正常治理动作，单列；只有非常规退出才是风险信号。
    const irregular = c.items.filter(function (it) { return IRREGULAR_EXIT.test(it.title); }).length;
    const pending = c.items.filter(function (it) { return /(代为履行|代為履行|代行)/.test(it.title); }).length;
    const turn = c.items.filter(function (it) { return /换届/.test(it.title); }).length;

    // ⚠⚠ 「无辞任」不等于「团队稳定」—— 刚换届的公司必然没有辞任。
    //   实测案例：002356 在 2026-01 换届，同期公告里 4 条"投资者诉讼"，
    //   但高管名单里 4/6 人零持股、曾用名带 *ST —— 治理层其实很不稳。
    //   如果只看"近 24 个月无辞任公告"就 +10，那会给它一个虚高的团队分。
    //   所以这里先看**是否刚换届**：换届公告存在、或过半高管任职不满 1 年，
    //   就把"无辞任"的加分压掉 —— 换完人之后的"没辞任"没有信息量。
    const recentlyReorganized = turn > 0 || recentlyTurnedOver(people);
    if (irregular === 0) {
      if (recentlyReorganized) {
        s += 2;
        why.push('近 24 个月无辞任/解聘公告，但同期有换届或高管大面积更替'
          + '（换完人之后没有辞任是必然的，不作为稳定性证据）');
      } else {
        s += 10;
        why.push('近 24 个月无辞任/解聘公告（且无换届导致的大面积更替）');
      }
    }
    else if (irregular === 1) { s += 2; why.push('近 24 个月 1 条辞任/解聘公告'); }
    else if (irregular <= 3) { s -= 8; why.push('近 24 个月 ' + irregular + ' 条辞任/解聘公告（偏多）'); }
    else { s -= 18; why.push('近 24 个月 ' + irregular + ' 条辞任/解聘公告（治理层不稳）'); }
    // 关键岗位空缺（由他人代行）是明确的负面信号
    if (pending) { s -= 10; why.push('近 24 个月 ' + pending + ' 条「代为履职」公告（关键岗位曾空缺）'); }
    if (turn) why.push('含换届公告 ' + turn + ' 条');
    // 没人名单时，光看事件数也能看出"换得太勤"；但分不清正常接替与频繁更替，
    // 所以只做轻微扣分并点出这个局限（美股 8-K 5.02 就是这种情况）。
    if (!hasPeople && c.count >= 4) {
      s -= 8;
      why.push('披露的高管变动 ' + c.count + ' 条，但未取得人员名单，无法区分正常接替与频繁更替');
    }
  }

  // ---- 证据越少，分数越往中枢收 ----
  // 依据强度：3 路（名单+公告+基本资料）→ 1 路（公告）→ 0.5 路（只有名单或只有基本资料）。
  // ⚠ 收敛系数随证据条数变化：三路齐全时不该收敛（那是完整判断），
  //   只有一路时必须大幅收敛（不能凭一条证据断定团队强弱）。
  const total = 3;
  if (evidence < total) {
    const shrink = [0, 0, 0.5, 0.75][evidence] || 0.5;   // 1 路 → 0.5；2 路 → 0.75
    s = 50 + (s - 50) * shrink;
    const missing = [];
    if (!hasPeople) missing.push('高管名单');
    if (!hasDisc) missing.push('交易所披露');
    if (!hasSurvey) missing.push('公司基本资料');
    why.push('仅取得 ' + evidence + '/3 路证据（缺 ' + missing.join('、') + '），分数已向中枢收敛');
  }

  // 依据必须跟着证据走：没有公告数据时不能说成「交易所披露」——
  // 那会把一份二手整理的高管名单，说成有官方原文可查。
  let basis;
  if (hasDisc && (hasPeople || hasSurvey)) basis = '交易所披露';
  else if (hasDisc) basis = '交易所披露';
  else if (hasPeople && hasSurvey) basis = '工商人员名单';
  else if (hasPeople) basis = '工商人员名单';
  else basis = '公司基本资料';

  return { score: Math.max(5, Math.min(96, Math.round(s))), why: why, basis: basis, evidence: evidence };
}

module.exports = {
  fetchDisclosures,
  fetchOrgId,
  litigationScore,
  teamScore,
  classify,
  marketOf,
  stripTags,
  RULES
};
