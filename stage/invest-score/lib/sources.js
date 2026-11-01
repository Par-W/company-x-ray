'use strict';

// 联网数据源聚合层（零依赖，Node 22 内置 fetch）
// 全部源带超时与失败降级；任一源失败不影响整体返回。

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ---------- 进程内 TTL 缓存（提速：同一进程内重复/近重复查询直接命中，不重复联网） ----------
// 缓存的都是"读多写少且短时不变"的公开数据（行情、财报、工商、检索结果）。
// 单次分析内的重复请求（如各子模块都要同一公司的财务）也会因此合并为一次外呼。
const _cache = new Map();
const CACHE_MAX = 500; // 上限，超出后清理最早写入的一批，避免长跑进程内存膨胀
function cacheGet(key) {
  const e = _cache.get(key);
  if (!e) return undefined;
  if (Date.now() > e.exp) { _cache.delete(key); return undefined; }
  return e.val;
}
function cacheSet(key, val, ttlMs) {
  if (_cache.size >= CACHE_MAX) {
    // Map 保持插入序，删掉最旧的 100 条
    let n = 0;
    for (const k of _cache.keys()) { _cache.delete(k); if (++n >= 100) break; }
  }
  _cache.set(key, { val, exp: Date.now() + (ttlMs || 60000) });
}
// 带缓存的异步取数：同 key 并发调用共享同一个 in-flight Promise（合并重复外呼）
const _inflight = new Map();
function cached(key, ttlMs, fn) {
  const hit = cacheGet(key);
  if (hit !== undefined) return Promise.resolve(hit);
  if (_inflight.has(key)) return _inflight.get(key);
  const p = Promise.resolve()
    .then(fn)
    .then(function (v) {
      // 仅缓存"有效结果"（null/空数组不缓存，避免把偶发失败固化）
      const meaningful = v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0);
      if (meaningful) cacheSet(key, v, ttlMs);
      return v;
    })
    .catch(function (e) { return Promise.reject(e); })
    .finally(function () { _inflight.delete(key); });
  _inflight.set(key, p);
  return p;
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
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
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

// ---------- 证券代码搜索（东方财富 suggest，公开稳定） ----------
// 支持：A股（1./0. 沪深、北交所）、港股（116.）、美股（105.纳斯达克 / 106.纽交所 / 107.美交所）
async function searchStockCode(name) {
  const raw = String(name || '').replace(/\s/g, '');
  if (!raw) return null;
  // 行情代码映射在交易日内基本不变，缓存 10 分钟（提速：重复查询/多模块共用零外呼）
  return cached('code:' + raw, 10 * 60 * 1000, function () { return searchStockCodeUncached(raw); });
}

async function searchStockCodeUncached(raw) {
  // 候选查询词：原名 + 滑窗子串（suggest 接口按「input 是股票简称的连续子串」匹配，
  // 公司全称「贵州茅台酒股份有限公司」直接查会落空，滑窗子串可找回「贵州茅台」）
  const queries = [raw];
  const maxLen = Math.min(6, raw.length);
  for (let len = maxLen; len >= 2; len--) {
    for (let i = 0; i + len <= raw.length; i++) queries.push(raw.slice(i, i + len));
  }
  // 性能优化：候选滑窗很多（最长 15 个），逐个 await 会串行累加延迟。
  // 改为分批并发（每批 4 个），首批命中即返回——绝大多数公司在前 1-2 批就能命中，
  // 未命中的冷门名也比纯串行快数倍，且不会一次性打爆东财 suggest 接口。
  const BATCH = 4;
  for (let i = 0; i < queries.length; i += BATCH) {
    const slice = queries.slice(i, i + BATCH);
    let results;
    try {
      results = await Promise.all(slice.map(function (q) {
        return fetchText('https://searchapi.eastmoney.com/api/suggest/get?input=' + encodeURIComponent(q)
          + '&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8', 6000).then(function (t) { return { q: q, txt: t }; })
          .catch(function () { return { q: q, txt: null }; });
      }));
    } catch (e) { continue; }
    for (const r of results) {
      if (!r.txt) continue;
      const hit = pickStockFromSuggest(r.txt, r.q, raw);
      if (hit) return hit;
    }
  }
  return null;
}

// 从东财 suggest 返回中挑出与公司名互为子串的证券（防误配行业板块/基金）
// [整合修正] 原实现用**原始全名**做互为子串校验，但搜索是用滑窗子串做的：
//   查「蜜雪冰城」时靠子串「蜜雪」才命中港股票名「蜜雪集团」，而校验却拿「蜜雪冰城」去比「蜜雪集团」→ 必然不匹配，
//   于是蜜雪冰城被判定为"查不到上市公司"，财报/评分全部落空。
//   现在改为用**实际命中的那个查询词**校验，并标注 weakMatch（近似匹配）以便前端如实说明。
function pickStockFromSuggest(txt, queryUsed, rawFull) {
  let json;
  try { json = JSON.parse(txt); } catch (e) { return null; }
  const q = String(queryUsed || rawFull || '').replace(/\s/g, '');
  const rows = json.QuotationCodeTable && json.QuotationCodeTable.Data;
  if (!rows || rows.length === 0) return null;
  for (const r of rows) {
    const qid = r.QuoteID || '';
    const mkt = qid.split('.')[0];
    let market = null;
    if (/^[012]\./.test(qid)) market = mkt === '1' ? 'sh' : (mkt === '0' ? 'sz' : 'bj');
    else if (mkt === '116') market = 'hk';
    else if (mkt === '105' || mkt === '106' || mkt === '107') market = 'us';
    if (!market) continue;
    const b = (r.Name || '').replace(/\s/g, '');
    if (b.includes(q) || q.includes(b)) {
      const code = market === 'hk' ? String(r.Code).padStart(5, '0')
        : market === 'us' ? String(r.Code).toUpperCase()
        : (mkt === '1' ? 'sh' : (mkt === '0' ? 'sz' : 'bj')) + r.Code;
      const rawClean = String(rawFull || '').replace(/\s/g, '');
      return {
        code, shortName: r.Name, market, quoteId: qid,
        matchedBy: q,
        weakMatch: !!rawClean && q !== rawClean,
        matchNote: (rawClean && q !== rawClean)
          ? ('按名称近似匹配：用「' + q + '」检索到 ' + r.Name + '（' + code + '），请确认是同一主体。')
          : null
      };
    }
  }
  return null;
}

// ---------- 上市公司：东方财富财务三表（公开 F10 接口） ----------
function num(v) { return typeof v === 'number' && isFinite(v) ? v : NaN; }

function latestDates() {
  const now = new Date(Date.now() + 8 * 3600 * 1000); // UTC+8 北京时间
  const y = now.getUTCFullYear();
  const out = [];
  const md = ['12-31', '09-30', '06-30', '03-31'];
  for (let yy = y; yy >= y - 2; yy--) {
    for (const d of md) out.push(yy + '-' + d);
  }
  return out.join(',');
}

async function fetchOneTable(tb, code) {
  const map = { zcfzb: 'zcfzbAjaxNew', lrb: 'lrbAjaxNew', xjllb: 'xjllbAjaxNew' };
  const url = 'https://emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/' + map[tb]
    + '?companyType=4&reportDateType=0&reportType=1&dates=' + latestDates() + '&code=' + encodeURIComponent(code);
  const txt = await fetchText(url, 9000);
  const json = JSON.parse(txt);
  if (!json.data || !json.data[0]) throw new Error('empty');
  return json.data[0];
}

async function fetchFinance(code) {
  // 财报按报告期更新，缓存 30 分钟：单次分析内多个模块（打分/股票评估）共用同一份数据，避免重复三表外呼
  return cached('fin:' + code, 30 * 60 * 1000, function () { return fetchFinanceUncached(code); });
}

async function fetchFinanceUncached(code) {
  const tables = ['zcfzb', 'lrb', 'xjllb'];
  const results = await Promise.allSettled(tables.map(function (tb) { return fetchOneTable(tb, code); }));
  const out = {};
  for (let i = 0; i < results.length; i++) {
    if (results[i].status !== 'fulfilled') continue;
    const r = results[i].value;
    if (tables[i] === 'zcfzb') {
      out.reportDate = String(r.REPORT_DATE || '').slice(0, 10);
      out.totalAssets = num(r.TOTAL_ASSETS);
      out.totalLiab = num(r.TOTAL_LIABILITIES);
      out.monetary = num(r.MONETARYFUNDS);
      out.receivable = num(r.ACCOUNTS_RECE);
    } else if (tables[i] === 'lrb') {
      if (!out.reportDate) out.reportDate = String(r.REPORT_DATE || '').slice(0, 10);
      out.revenue = num(r.TOTAL_OPERATE_INCOME);
      out.opProfit = num(r.OPERATE_PROFIT);
      out.operateCost = num(r.OPERATE_COST);
      out.netProfit = num(r.NETPROFIT);
      out.parentNetProfit = num(r.PARENT_NETPROFIT);
      // 三项费用：这三个字段接口**一直都在返回**，只是以前没取。
      // 没有它们，技术/产品力/客户质量/品牌/行业前景只能靠新闻标题里的词去"感觉"；
      // 有了它们，这五维就变成"从财报算出来、可以逐条回指报表"（见 financeFromData）。
      out.researchExpense = num(r.RESEARCH_EXPENSE);
      out.saleExpense = num(r.SALE_EXPENSE);
      out.manageExpense = num(r.MANAGE_EXPENSE);
      // 同比增速：接口直接给，不必再拉上一期报表
      out.revenueYoy = num(r.TOTAL_OPERATE_INCOME_YOY);
      out.netProfitYoy = num(r.NETPROFIT_YOY);
      out.researchYoy = num(r.RESEARCH_EXPENSE_YOY);
    } else if (tables[i] === 'xjllb') {
      if (!out.reportDate) out.reportDate = String(r.REPORT_DATE || '').slice(0, 10);
      out.opCashflow = num(r.NETCASH_OPERATE);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function financeFromData(f) {
  if (!f || !isFinite(f.totalAssets) || f.totalAssets <= 0) return null;
  const debtRatio = isFinite(f.totalLiab) ? f.totalLiab / f.totalAssets * 100 : NaN;
  // 毛利率 = (营收-营业成本)/营收；净利率 = 净利润/营收
  const grossMargin = isFinite(f.operateCost) && isFinite(f.revenue) && f.revenue > 0 ? (f.revenue - f.operateCost) / f.revenue * 100 : NaN;
  const netMargin = isFinite(f.netProfit) && isFinite(f.revenue) && f.revenue > 0 ? f.netProfit / f.revenue * 100 : NaN;
  const cashRatio = isFinite(f.monetary) && isFinite(f.totalAssets) ? f.monetary / f.totalAssets * 100 : NaN;
  const recvRatio = isFinite(f.receivable) && isFinite(f.revenue) && f.revenue > 0 ? f.receivable / f.revenue * 100 : NaN;
  // 三项费用率：技术/产品力/客户质量/品牌/行业前景这五维以前靠新闻标题里的词加减分，
  // 现在改成从财报算 —— 每个分数都能回指到报表上的一个科目，投资人可以当场核。
  const rndRatio = isFinite(f.researchExpense) && f.revenue > 0 ? f.researchExpense / f.revenue * 100 : NaN;
  const saleRatio = isFinite(f.saleExpense) && f.revenue > 0 ? f.saleExpense / f.revenue * 100 : NaN;
  const manageRatio = isFinite(f.manageExpense) && f.revenue > 0 ? f.manageExpense / f.revenue * 100 : NaN;
  const clamp = function (x) { return Math.max(5, Math.min(98, Math.round(x))); };
  const yi = function (v) {
    if (!isFinite(v)) return '—';
    const a = Math.abs(v);
    return a >= 1e8 ? (v / 1e8).toFixed(2) + ' 亿' : (v / 1e4).toFixed(0) + ' 万';
  };

  const signals = [];
  let finance = 50;
  if (isFinite(debtRatio)) {
    if (debtRatio <= 40) { finance += 30; signals.push('资产负债率 ' + debtRatio.toFixed(1) + '%（≤40%，达标）'); }
    else if (debtRatio <= 60) { finance += 15; signals.push('资产负债率 ' + debtRatio.toFixed(1) + '%（40%-60%，尚可）'); }
    else if (debtRatio <= 75) { finance += 0; signals.push('资产负债率 ' + debtRatio.toFixed(1) + '%（60%-75%，偏高）'); }
    else { finance -= 15; signals.push('资产负债率 ' + debtRatio.toFixed(1) + '%（>75%，警示）'); }
  }
  if (isFinite(cashRatio)) {
    if (cashRatio >= 12) { finance += 10; signals.push('货币资金占总资产 ' + cashRatio.toFixed(1) + '%（充裕）'); }
    else if (cashRatio >= 6) { finance += 5; signals.push('货币资金占总资产 ' + cashRatio.toFixed(1) + '%'); }
    else { signals.push('货币资金占总资产 ' + cashRatio.toFixed(1) + '%（偏紧）'); }
  }
  if (isFinite(recvRatio)) {
    if (recvRatio <= 15) { finance += 10; signals.push('应收账款/营收 ' + recvRatio.toFixed(1) + '%（低，回款健康）'); }
    else if (recvRatio <= 40) { finance += 5; signals.push('应收账款/营收 ' + recvRatio.toFixed(1) + '%'); }
    else { finance -= 8; signals.push('应收账款/营收 ' + recvRatio.toFixed(1) + '%（偏高，警惕赊销依赖）'); }
  }

  // 「管理」以前用净利率代表管理能力 —— 净利率更像"赚钱能力"，不是"管得好不好"。
  // 有管理费用率就用它（管理效率的直接口径），没有才退回净利率。
  let management;
  if (isFinite(manageRatio)) {
    let m;
    if (manageRatio <= 5) m = 85;
    else if (manageRatio <= 10) m = 72;
    else if (manageRatio <= 15) m = 60;
    else m = 48;
    signals.push('管理费用率 ' + manageRatio.toFixed(2) + '%（管理费用 ' + yi(f.manageExpense) + '）');
    if (isFinite(netMargin)) {
      if (netMargin >= 15) m += 5;
      else if (netMargin < 0) m -= 10;
    }
    management = clamp(m);
  } else if (isFinite(netMargin)) {
    let m = 50;
    if (netMargin >= 15) { m += 30; signals.push('净利率 ' + netMargin.toFixed(1) + '%（优秀）'); }
    else if (netMargin >= 6) { m += 18; signals.push('净利率 ' + netMargin.toFixed(1) + '%'); }
    else if (netMargin >= 0) { m += 5; signals.push('净利率 ' + netMargin.toFixed(1) + '%（偏薄）'); }
    else { m -= 20; signals.push('净利率 ' + netMargin.toFixed(1) + '%（亏损）'); }
    management = clamp(m);
  }

  let cost = 50;
  if (isFinite(grossMargin)) {
    if (grossMargin >= 40) { cost += 30; signals.push('毛利率 ' + grossMargin.toFixed(1) + '%（高毛利，定价权强）'); }
    else if (grossMargin >= 20) { cost += 18; signals.push('毛利率 ' + grossMargin.toFixed(1) + '%'); }
    else if (grossMargin >= 8) { cost += 5; signals.push('毛利率 ' + grossMargin.toFixed(1) + '%（偏薄）'); }
    else { cost -= 10; signals.push('毛利率 ' + grossMargin.toFixed(1) + '%（微利，警惕成本挤压）'); }
  }

  // 「技术壁垒」= 研发费用率。研发投入是技术壁垒的财务投影：
  // 白酒常年 0.1%、芯片设计常年 15%+，这个差距不该由新闻标题里有没有"突破"来决定。
  let tech;
  if (isFinite(rndRatio)) {
    let s;
    if (rndRatio >= 15) s = 88;
    else if (rndRatio >= 8) s = 76;
    else if (rndRatio >= 4) s = 64;
    else if (rndRatio >= 1) s = 52;
    else s = 44;
    signals.push('研发费用率 ' + rndRatio.toFixed(2) + '%（研发费用 ' + yi(f.researchExpense) + '）');
    if (isFinite(f.researchYoy)) {
      if (f.researchYoy >= 20) { s += 5; signals.push('研发投入同比 +' + f.researchYoy.toFixed(1) + '%（在加码）'); }
      else if (f.researchYoy <= -10) { s -= 5; signals.push('研发投入同比 ' + f.researchYoy.toFixed(1) + '%（在压缩）'); }
    }
    tech = clamp(s);
  }

  // 「产品力」= 毛利率（定价权最直接的证据）+ 营收增速（产品还在不在卖得动）
  let product;
  if (isFinite(grossMargin)) {
    let s;
    if (grossMargin >= 60) s = 88;
    else if (grossMargin >= 40) s = 78;
    else if (grossMargin >= 25) s = 66;
    else if (grossMargin >= 15) s = 54;
    else s = 42;
    if (isFinite(f.revenueYoy)) {
      if (f.revenueYoy >= 15) s += 6;
      else if (f.revenueYoy >= 0) s += 2;
      else s -= 6;
      signals.push('营收同比 ' + (f.revenueYoy >= 0 ? '+' : '') + f.revenueYoy.toFixed(1) + '%（产品力按"还能不能卖动"折算）');
    }
    product = clamp(s);
  }

  // 「客户质量」= 应收账款占营收（能不能先收钱）+ 销售费用率（要不要靠砸钱抢客户）
  let customers;
  if (isFinite(recvRatio)) {
    let s;
    if (recvRatio <= 5) s = 88;        // 先款后货，客户求着你卖
    else if (recvRatio <= 15) s = 78;
    else if (recvRatio <= 30) s = 62;
    else if (recvRatio <= 50) s = 48;
    else s = 35;                        // 货出去了钱回不来
    signals.push('下游回款质量：应收账款/营收 ' + recvRatio.toFixed(1) + '%（客户质量的直接口径）');
    if (isFinite(saleRatio)) {
      if (saleRatio <= 5) { s += 6; signals.push('销售费用率仅 ' + saleRatio.toFixed(2) + '%（不靠砸钱获客）'); }
      else if (saleRatio > 25) { s -= 6; signals.push('销售费用率 ' + saleRatio.toFixed(2) + '%（获客依赖高投放）'); }
    }
    customers = clamp(s);
  }

  // 「行业前景」= 公司营收增速。这是**代理指标**不是行业数据本身：
  // 真行业景气度要行业口径的营收/利润增速或研报，本产品没有该数据源，
  // 所以用"这家公司自己在行业里的增速"代理，并在信号文案里写明是代理。
  let industry;
  if (isFinite(f.revenueYoy)) {
    let s;
    if (f.revenueYoy >= 25) s = 88;
    else if (f.revenueYoy >= 15) s = 80;
    else if (f.revenueYoy >= 5) s = 70;
    else if (f.revenueYoy >= 0) s = 58;
    else if (f.revenueYoy >= -10) s = 45;
    else s = 32;
    signals.push('营收增速 ' + (f.revenueYoy >= 0 ? '+' : '') + f.revenueYoy.toFixed(1) + '%（代理行业景气，非行业口径数据）');
    if (isFinite(f.netProfitYoy) && (f.netProfitYoy - f.revenueYoy) < -15) {
      s -= 6;
      signals.push('增收不增利：净利同比 ' + f.netProfitYoy.toFixed(1) + '% 明显低于营收增速');
    }
    industry = clamp(s);
  }

  // 「品牌地位」= 高毛利 + 不靠销售费用堆出来。
  // 毛利率 50% 以上却把 25% 营收砸进销售费用，那不是品牌，那是买流量。
  let brand;
  if (isFinite(grossMargin)) {
    let s;
    if (grossMargin >= 50) s = (isFinite(saleRatio) && saleRatio > 25) ? 62 : 85;
    else if (grossMargin >= 30) s = 68;
    else s = 50;
    if (isFinite(saleRatio) && saleRatio > 25 && grossMargin >= 50) {
      signals.push('毛利率高但销售费用率 ' + saleRatio.toFixed(2) + '%：溢价更像买流量买来的');
    }
    brand = clamp(s);
  }

  // 「团队实力」「诉讼风险」这两维没有财报口径 —— 不填数字，由调用方标"未评分"，
  // 而不是拿一个 50 分混进加权平均里冒充结论。
  return {
    finance: Math.max(5, Math.min(98, finance)),
    management: management,
    cost: Math.max(5, Math.min(98, cost)),
    tech: tech,
    product: product,
    customers: customers,
    industry: industry,
    brand: brand,
    signals,
    // 哪些维度真的算出来了 —— 调用方据此决定"这一维要不要参与加权"，
    // 不再用"没数据就填 50"去冒充一个结论。
    computed: ['finance', 'management', 'cost', 'tech', 'product', 'customers', 'industry', 'brand']
      .filter(function (k) { return typeof ({
        finance: finance, management: management, cost: cost, tech: tech,
        product: product, customers: customers, industry: industry, brand: brand
      })[k] === 'number'; })
  };
}

// ---------- 腾讯行情现价（A股 sh/sz 前缀、港股 hk 前缀、美股裸代码大写） ----------
// 返回扩展行情字段：现价/涨跌幅/市盈率TTM/市净率/总市值/52周高低点（字段位随市场略有差异，逐项判空）
async function fetchQuote(code) {
  // 行情缓存 30 秒：同一次分析内行情被多处引用；短 TTL 兼顾"近似实时"与"零重复外呼"
  return cached('qt:' + code, 30 * 1000, function () { return fetchQuoteUncached(code); });
}

async function fetchQuoteUncached(code) {
  try {
    const txt = await fetchText('https://qt.gtimg.cn/q=' + encodeURIComponent(code), 6000, 'gbk');
    const m = txt.match(/"([\s\S]*)"/);
    if (!m) return null;
    const parts = m[1].split('~');
    if (parts.length <= 40) return null;
    const f = function (i) { const v = parseFloat(parts[i]); return isFinite(v) ? v : null; };
    return {
      name: parts[1],
      price: parts[3],
      changePct: parts[32],
      date: parts[30],
      pe: f(39),                 // 市盈率 TTM
      pb: f(46),                 // 市净率
      totalMv: f(45),            // 总市值（亿元）
      high52w: f(41) || f(33),   // 52周最高（部分市场字段位不同）
      low52w: f(42) || f(34)     // 52周最低
    };
  } catch (e) { return null; }
}

// 港股/美股代码 → 腾讯行情代码（hk09988 / usBABA；A股直接用 sh600519 形式）
function toQuoteCode(stock) {
  if (!stock) return null;
  if (stock.market === 'hk') return 'hk' + stock.code;
  if (stock.market === 'us') return 'us' + String(stock.code).toUpperCase();
  return stock.code;
}

// ---------- 港股/美股财务（东方财富 datacenter F10，零鉴权公开接口） ----------
// 港股: RPT_HKF10_FN_BALANCE / _INCOME / _CASHFLOW（条目为中文 ITEM_NAME 行式）
// 美股: RPT_USF10_FN_BALANCE / _INCOME / _CASHFLOW（同上，SECUCODE 形如 BABA.N）
function hkUsSecucode(stock) {
  if (stock.market === 'hk') return stock.code + '.HK';
  if (stock.market === 'us') {
    // 东财美股 SECUCODE 统一为 CODE.N（无论纳斯达克/纽交所/美交所，接口均按 .N 收录）
    return String(stock.code).toUpperCase() + '.N';
  }
  return null;
}

async function fetchOverseasReport(reportName, secuCode, maxPages) {
  const rows = [];
  // 大页模式：pageSize=500 + 按报告期倒序，一页覆盖全部所需条目（美股 500 行含最新期全量字段），
  // 把请求数从 38 压到 2-3，规避东财 datacenter 的 IP 级限流窗口
  for (let p = 1; p <= (maxPages || 1); p++) {
    const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get?reportName=' + reportName
      + '&columns=ALL&filter=' + encodeURIComponent('(SECUCODE="' + secuCode + '")')
      + '&pageNumber=' + p + '&pageSize=500&sortColumns=REPORT_DATE&sortTypes=-1&source=F10&client=PC';
    try {
      const txt = await fetchText(url, 9000);
      const j = JSON.parse(txt);
      const data = (j.result && j.result.data) || [];
      if (data.length === 0) break;
      rows.push.apply(rows, data);
    } catch (e) { break; }
    // 已有最新报告期数据即够用（倒序排列，第一页必含最新期），不再翻页
    break;
  }
  return rows;
}

// 在 rows 中按条目名取值。已传入的 rows 应先经 nearRows 窗口过滤；
// 这里不再要求 REPORT_DATE 精确等于 date（美/港股条目日期有零散偏移，精确匹配会漏条目），
// 但要求"该条目名在同一报告期内只出现一次"时取距 date 最近的。
function pickItem(rows, date, names) {
  for (const n of names) {
    let best = null;
    let bestDiff = Infinity;
    for (const r of rows) {
      if (r.ITEM_NAME !== n || !isFinite(r.AMOUNT)) continue;
      const rd = String(r.REPORT_DATE || '').slice(0, 10);
      const diff = Math.abs(new Date(rd) - new Date(date)) / 86400000;
      if (diff < bestDiff) { bestDiff = diff; best = r.AMOUNT; }
    }
    if (best !== null && bestDiff <= 60) return best;
  }
  return NaN;
}

// 港/美股三表 → 与 A 股 financeFromData 相同的中间结构
// 美股条目分散在最多 16 页（收入/负债条目在远端页），翻页深度 16
async function fetchFinanceOverseas(stock) {
  const secu = hkUsSecucode(stock);
  if (!secu) return null;
  // 港股/美股财报缓存 30 分钟（提速：重复查询不再经历 datacenter 限流退避的 4-6s 空等）
  return cached('finov:' + secu, 30 * 60 * 1000, function () { return fetchFinanceOverseasUncached(stock, secu); });
}

async function fetchFinanceOverseasUncached(stock, secu) {
  const isHk = stock.market === 'hk';
  const prefix = isHk ? 'RPT_HKF10_FN_' : 'RPT_USF10_FN_';
  const maxPages = 1; // 大页模式：每表 1 个请求即含最新期全量条目
  // 东财 datacenter 限流敏感：美股 BAL 大页响应重，表间隔需 ≥4s，否则下一表整体被吞返回空。
  // 提速：把"先请求 BALANCE → 睡 4s → 再请求 INCOME"改为先查缓存预热并发——
  //   ① 两表并发发起（各自独立 filter，非同一 reportName，实测互不挤占限流窗口）；
  //   ② 失败重试的 6s 退避仅在真正空返回时才付出，命中时不空等。
  const fetchTable = async function (tbl) {
    let rows = await fetchOverseasReport(prefix + tbl, secu, maxPages);
    if (rows.length === 0) {
      await new Promise(function (r) { setTimeout(r, 5000); });
      rows = await fetchOverseasReport(prefix + tbl, secu, maxPages);
    }
    return rows;
  };
  const [balance, income] = await Promise.all([fetchTable('BALANCE'), fetchTable('INCOME')]);
  if (!balance.length && !income.length) return null;
  // 现金流量表：打分不用 opCashflow，且美股 CASHFLOW 报告名无数据（实测恒空），港股也常缺——跳过，省 6-8s 限流重试
  const cashflow = [];

  // 取三表共有的最新报告期
  const dates = [];
  for (const arr of [balance, income, cashflow]) {
    for (const r of arr) {
      const d = String(r.REPORT_DATE || '').slice(0, 10);
      if (d && dates.indexOf(d) < 0) dates.push(d);
    }
  }
  dates.sort().reverse();
  if (!dates.length) return null;
  const latest = dates[0];
  // 报告期必须出现在利润表（收入/利润口径以此为基准）
  const incomeDates = {};
  for (const r of income) incomeDates[String(r.REPORT_DATE || '').slice(0, 10)] = true;
  const refDate = incomeDates[latest] ? latest : dates.find(function (d) { return incomeDates[d]; });
  if (!refDate) return null;

  const out = { reportDate: refDate, market: stock.market, currency: 'CNY' };
  // 资产负债表（港/美条目名：总资产/总负债/现金及等价物|现金及现金等价物）
  // 美股条目分散在多页，refDate 前后 3 个月内同一报告的数据合并使用（部分条目 REPORT_DATE 偏移几天）
  const nearRows = function (rows, d) {
    return rows.filter(function (r) {
      const rd = String(r.REPORT_DATE || '').slice(0, 10);
      if (rd === d) return true;
      // 距 refDate 45 天内的同报告数据视为同一期（美/港股 REPORT_DATE 有零散偏移）
      const diff = Math.abs(new Date(rd) - new Date(d)) / 86400000;
      return diff <= 45;
    });
  };
  const balNear = nearRows(balance, refDate);
  const incNear = nearRows(income, refDate);
  const cfNear = nearRows(cashflow, refDate);

  out.totalAssets = pickItem(balNear, refDate, ['总资产']);
  out.totalLiab = pickItem(balNear, refDate, ['总负债', '流动负债合计']);
  out.monetary = pickItem(balNear, refDate, ['现金及等价物', '现金及现金等价物']);
  // 港股条目用「应收帐款」（帐/账 是两个字），只写「应收账款」会取不到 ——
  // 蜜雪的资产负债表里明明有这个科目，之前却判成"缺数据"，连带客户质量整维不评分。
  out.receivable = pickItem(balNear, refDate, ['应收账款', '应收帐款', '应收款项', '预付款项']);
  // 利润表（港：营业额/毛利/股东应占溢利|除税后溢利；美：营业收入/毛利/归属于母公司股东净利润）
  out.revenue = pickItem(incNear, refDate, isHk ? ['营业额', '营运收入'] : ['营业收入', '主营收入']);
  out.operateCost = isFinite(pickItem(incNear, refDate, ['营业成本', '主营成本'])) ? pickItem(incNear, refDate, ['营业成本', '主营成本'])
    : (isFinite(pickItem(incNear, refDate, ['毛利'])) && isFinite(out.revenue) ? out.revenue - pickItem(incNear, refDate, ['毛利']) : NaN);
  out.netProfit = pickItem(incNear, refDate, isHk ? ['股东应占溢利', '除税后溢利', '持续经营业务税后利润'] : ['归属于母公司股东净利润', '净利润']);
  // 现金流量表（条目名不稳定，尽力而为）
  out.opCashflow = pickItem(cfNear, refDate, ['经营活动产生的现金流量净额', '经营活动现金流量净额', '营运资金变动前经营现金流入']);

  // 港股利润表里其实有「销售及分销费用 / 行政开支 / 研发费用」，以前一个都没取 ——
  // 于是「客户质量」「管理与盈利」「技术壁垒」三维在港股永远算不出来（实测腾讯、蜜雪各缺 2 维）。
  // 国际准则的叫法和 A 股不同，条目名要按港股口径写。
  if (isHk) {
    out.saleExpense = pickItem(incNear, refDate, ['销售及分销费用', '销售及分销开支', '分销费用', '销售费用']);
    out.manageExpense = pickItem(incNear, refDate, ['行政开支', '行政费用', '管理费用']);
    out.researchExpense = pickItem(incNear, refDate, ['研发费用', '研究及开发费用', '研发开支']);
    // 营收同比必须用**同期**对比：refDate 是 2026-06-30（半年报）时，
    // 要拿 2025-06-30 的半年报比，不能拿 2025-12-31 的年报 —— 拿错就是"营收腰斩"的假信号。
    const prevRev = pickPrevYear(income, refDate, ['营业额', '营运收入']);
    if (isFinite(prevRev) && isFinite(out.revenue) && prevRev > 0) {
      out.revenueYoy = Math.round((out.revenue - prevRev) / Math.abs(prevRev) * 1000) / 10;
    }
  }
  return Object.keys(out).length > 2 ? out : null;
}

/** 取「上一年同一期」的值（±40 天窗口）。期间类型对不上就返回 NaN，绝不跨期硬比。 */
function pickPrevYear(rows, refDate, names) {
  const ref = new Date(refDate);
  if (isNaN(ref.getTime())) return NaN;
  const target = new Date(ref);
  target.setFullYear(ref.getFullYear() - 1);
  const dates = [];
  for (const r of rows) {
    const d = String(r.REPORT_DATE || '').slice(0, 10);
    if (d && dates.indexOf(d) < 0) dates.push(d);
  }
  let best = null;
  for (const d of dates) {
    const diff = Math.abs(new Date(d) - target) / 86400000;
    if (diff > 40) continue;          // 只认同期
    if (new Date(d) >= ref) continue; // 必须早于本期
    if (!best || diff < best.diff) best = { d: d, diff: diff };
  }
  if (!best) return NaN;
  return pickItem(rows, best.d, names);
}

// ---------- 新闻检索 ----------
// 通道1 必应网页版（新闻类结果较全）；通道2 百度（人物/公司查询质量高，且反爬宽松）；
// 通道3 搜狗（首查质量最高但限频 403 严格，仅作第三兜底）
async function searchNews(query, ms) {
  // 新闻检索缓存 5 分钟（提速主力）：同一次分析里公司主查/专利诉讼/中标合作/话题兜底
  // 会反复命中相近 query；精英逐人检索也共用同一公司名。缓存把重复外呼压到零。
  return cached('news:' + query + ':' + (ms || 0), 5 * 60 * 1000, async function () {
    const raw = await searchNewsUncached(query, ms);
    return filterRelevantNews(raw, query);
  });
}

// 检索核心词：去掉行政区前缀与公司后缀，取前两个字（"深圳市腾讯计算机系统有限公司" → "腾讯"）
const ADMIN_PREFIX = /^(?:中国|广东省|北京市|上海市|天津市|重庆市|深圳市|广州市|杭州市|南京市|成都市|武汉市|苏州市|西安市|郑州市|长沙市|青岛市|宁波市|厦门市|合肥市|济南市|福州市|东莞市|佛山市|无锡市|沈阳市|大连市|昆明市|南昌市|贵阳市|太原市|石家庄市|哈尔滨市|长春市)+/;
const COMPANY_SUFFIX = /(?:股份有限公司|有限责任公司|有限公司|集团|公司)$/;
function queryCore(query) {
  let s = String(query || '').trim().split(/\s+/)[0] || '';
  s = s.replace(ADMIN_PREFIX, '').replace(COMPANY_SUFFIX, '');
  // 去掉括号里的补充说明（"宁德时代（300750）" → "宁德时代"）
  s = s.replace(/[（(].*?[)）]/g, '');
  return s.slice(0, 2);
}

/**
 * 结果相关性过滤。
 * 为什么必须做：必应对中文分词漂移严重 —— 查"蜜雪冰城"会返回"蜜"字词典、
 * 查"北京字节跳动科技有限公司"会返回"北京旅游攻略"，这些标题进了正文就会
 * 虚增报道条数、并给维度打上没有依据的加减分。只保留标题含核心词的条目。
 */
function filterRelevantNews(items, query) {
  const list = Array.isArray(items) ? items : [];
  const core = queryCore(query);
  if (core.length < 2 || list.length === 0) return list;
  const kept = list.filter(function (it) { return String(it.title || '').indexOf(core) >= 0; });
  // 有相关结果就只留相关；一条都没有则退回原列表（宁可多、不可把真结果筛没）
  return kept.length > 0 ? kept : list;
}

async function searchNewsUncached(query, ms) {
  try {
    const txt = await fetchText('https://www.bing.com/search?q=' + encodeURIComponent(query) + '&mkt=zh-CN&setlang=zh-CN', ms || 9000);
    const items = [];
    const re = /<h2[^>]*><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g;
    let m;
    while ((m = re.exec(txt)) !== null && items.length < 10) {
      const title = m[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim();
      if (title) items.push({ title, url: m[1] });
    }
    if (items.length > 0) {
      // 噪声判定（比例制）：≥70% 标题是导航页/词典词条 → 必应分词漂移（人名查询常见），换百度
      const NOISE = /(官网|官方最新版下载|频道|首页|Home|腾讯网|Tencent 腾讯|最新版|轻松做|排行榜|百科|汉典|字典|汉语|拼音|部首|笔画|的意思|的解释|王者荣耀|起名|姓名测试|怎么读)/;
      const noiseCount = items.filter(function (it) { return it.title.length < 40 && NOISE.test(it.title); }).length;
      const looksNoise = noiseCount / items.length >= 0.7;
      if (!looksNoise) return items;
    }
    // 必应空结果或全导航噪声 → 百度 → 搜狗
    const bd = await searchNewsBaidu(query, ms || 9000);
    if (bd.length > 0) return bd;
    const sg = await searchNewsSogou(query, ms || 9000);
    if (sg.length > 0) return sg;
    return items;
  } catch (e) {
    try { return await searchNewsBaidu(query, ms || 9000); } catch (e2) { return []; }
  }
}

// 百度网页搜索（人物/公司查询质量高；结果标题在 <h3><a>）
// 百度反爬冷却：验证页出现后 10 分钟内直接短路返回空，避免每次请求白等 8s 且加重风控
let BAIDU_BLOCKED_UNTIL = 0;
const BAIDU_COOLDOWN_MS = 10 * 60 * 1000;
// 供其他检索通道（person-search）共享百度冷却状态，避免在已被风控时重复白打请求
function isBaiduCoolingDown() { return Date.now() < BAIDU_BLOCKED_UNTIL; }
function markBaiduCoolingDown() { BAIDU_BLOCKED_UNTIL = Date.now() + BAIDU_COOLDOWN_MS; }
async function searchNewsBaidu(query, ms) {
  if (Date.now() < BAIDU_BLOCKED_UNTIL) return []; // 冷却期内跳过
  try {
    const txt = await fetchText('https://www.baidu.com/s?wd=' + encodeURIComponent(query), ms);
    // 验证页检测：命中则进入冷却
    if (txt.length < 2500 && /安全验证|wappass|百度安全/.test(txt)) {
      markBaiduCoolingDown();
      return [];
    }
    const items = [];
    const re = /<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = re.exec(txt)) !== null && items.length < 10) {
      const title = m[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x[0-9a-f]+;/gi, '').replace(/&ensp;|&nbsp;|&mdash;/g, ' ').trim();
      if (title) items.push({ title, url: m[1] });
    }
    return items;
  } catch (e) {
    return [];
  }
}

// 搜狗网页搜索（人物/公司查询质量高；结果标题在 <h3><a>）
// 搜狗反爬冷却：同百度逻辑
let SOGOU_BLOCKED_UNTIL = 0;
const SOGOU_COOLDOWN_MS = 10 * 60 * 1000;
async function searchNewsSogou(query, ms) {
  if (Date.now() < SOGOU_BLOCKED_UNTIL) return [];
  try {
    const txt = await fetchText('https://www.sogou.com/web?query=' + encodeURIComponent(query), ms);
    if (txt.length < 6000 && /验证码|antispider/.test(txt)) {
      SOGOU_BLOCKED_UNTIL = Date.now() + SOGOU_COOLDOWN_MS;
      return [];
    }
    const items = [];
    const re = /<h3[^>]*>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/g;
    let m;
    while ((m = re.exec(txt)) !== null && items.length < 10) {
      let url = m[1];
      if (url.startsWith('/link')) url = 'https://www.sogou.com' + url;
      const title = m[2].replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x[0-9a-f]+;/gi, '').trim();
      if (title) items.push({ title, url });
    }
    return items;
  } catch (e) {
    return [];
  }
}

function newsToSignals(news) {
  const signals = [];
  const lit = /(诉讼|纠纷|仲裁|被告|起诉|立案|判决|赔偿)/;
  const ipLit = /(专利.*(诉讼|纠纷|无效)|知识产权.*(诉讼|纠纷)|(诉讼|纠纷).*专利|商标.*(争议|纠纷))/;
  const ip = /(专利|知识产权|核心技术|研发投入|发明专利|技术创新|突破)/;
  const bigCustomer = /(中标|签订.*合同|战略.*合作|供货|订单|大客户|签约|客户)/;
  const industry = /(前景|赛道|政策|风口|增长|景气|产能|过剩|下滑|萎缩|趋势|发展|升级|机遇)/;
  const product = /(复购|留存|付费|用户|销量|市占率|渗透率|发布|推出|上线|产品)/;
  const brand = /(龙头|领先|第一梯队|市场份额|行业前|排名|知名|影响力)/;
  const cost = /(毛利|成本|降本|提价|涨价|效率)/;

  let litCount = 0;
  for (const it of news) {
    const t = it.title;
    if (lit.test(t)) {
      litCount++;
      signals.push({ dim: 'litigation', text: t, url: it.url, positive: ipLit.test(t) || /(胜诉|驳回|和解)/.test(t) });
    } else if (ip.test(t)) {
      signals.push({ dim: 'tech', text: t, url: it.url, positive: true });
    } else if (bigCustomer.test(t)) {
      signals.push({ dim: 'customers', text: t, url: it.url, positive: true });
    } else if (industry.test(t)) {
      signals.push({ dim: 'industry', text: t, url: it.url, positive: !/(过剩|下滑|萎缩|淘汰)/.test(t) });
    } else if (product.test(t)) {
      signals.push({ dim: 'product', text: t, url: it.url, positive: true });
    } else if (brand.test(t)) {
      signals.push({ dim: 'brand', text: t, url: it.url, positive: true });
    } else if (cost.test(t)) {
      signals.push({ dim: 'cost', text: t, url: it.url, positive: /(降本|毛利.*升|提价)/.test(t) });
    } else if (/(创始人|董事长|CEO|首席|总经理|加入|履新)/.test(t)) {
      signals.push({ dim: 'team', text: t, url: it.url, positive: true });
    }
  }
  return { signals, litCount };
}

// ---------- 工商信息（企业搜索聚合渠道，尽力而为） ----------
// 注：企查查/爱企查无公开免费接口，存在较强反爬（爱企查接口需 token 校验、企查查需登录）。
// 这里做"公开可达渠道"的尝试：爱企查 web 搜索页、必应 site 检索，拿到什么用什么，失败即降级。
async function fetchCompanyProfile(company, legalPerson) {
  const channels = [];
  const out = { legalPersonConfirmed: null, industryHint: null, channels };

  // 渠道 1：爱企查搜索页（实测 302 跳登录/验证，基本拿不到字段）
  try {
    const txt = await fetchText('https://aiqicha.baidu.com/s?q=' + encodeURIComponent(company), 6000);
    const looksLogin = /请先登录|登录后|passport|安全验证|captcha|wappass/i.test(txt);
    if (txt && txt.length > 500 && !looksLogin) {
      // 页面可达 ≠ 取到了数据：这里没有任何可解析的登记字段，
      // 以前判 ok 属于"假绿灯"（用户看到通道全绿、字段却全空）。如实标 empty。
      channels.push({ name: '爱企查', status: 'empty', note: '页面可达，但未提供可解析的登记字段（需登录或反爬拦截）' });
    } else {
      channels.push({ name: '爱企查', status: 'blocked', note: '跳登录/触发安全验证，无字段可取' });
    }
  } catch (e) {
    channels.push({ name: '爱企查', status: 'failed', note: '网络受限' });
  }

  // 渠道 2：必应 site:aiqicha 精准检索（摘要中往往包含法定代表人与行业）
  try {
    const txt = await fetchText('https://www.bing.com/search?q=' + encodeURIComponent(company + ' 法定代表人 site:aiqicha.baidu.com OR site:qcc.com') + '&mkt=zh-CN', 8000);
    const re = /<h2[^>]*><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/g;
    let m; let hit = null;
    while ((m = re.exec(txt)) !== null) {
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      if (title.includes(company) || company.includes(title.slice(0, 6))) { hit = { title, url: m[1] }; break; }
    }
    // 在整页文本中找"法定代表人"字样
    const plain = txt.replace(/<[^>]+>/g, ' ');
    const lm = plain.match(new RegExp('法定代表人[：:\\s]*([\\u4e00-\\u9fa5]{2,4})'));
    if (lm) {
      out.legalPersonConfirmed = lm[1];
      if (legalPerson && lm[1] !== legalPerson) {
        out.legalPersonMismatch = true;
      }
    }
    channels.push({ name: '必应·工商检索（aiqicha/qcc 索引）', status: lm ? 'ok' : (hit ? 'ok' : 'empty'), note: lm ? '从公开摘要解析到法定代表人' : '未解析到关键摘要' });
  } catch (e) {
    channels.push({ name: '必应·工商检索（aiqicha/qcc 索引）', status: 'failed', note: '网络受限' });
  }

  return out;
}

// ---------- 公司核心成员检索（不依赖法人输入） ----------
const SURNAME_STR = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林罗高郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤';
// 渠道1：新浪财经高管页（A股，最稳，人名+职务表格）—— 从 vCI_CorpManagerInfo 链接提取人名与职务
// 渠道2：必应检索"头衔+人名"结构（港股/美股/未上市公司的兜底）
async function fetchSinaManagers(stockCode) {
  // stockCode: sh600519 / sz300750 / bj832566
  const m = /^(sh|sz|bj)(\d{6})$/i.exec(String(stockCode || ''));
  if (!m) return [];
  try {
    const txt = await fetchText('https://vip.stock.finance.sina.com.cn/corp/go.php/vCI_CorpManager/stockid/' + m[2] + '.phtml', 9000, 'gbk');
    const members = {};
    // 结构（允许 \r\n 与空白）：...Name=张德芹">张德芹</a></div></td> ... <div align="center">董事长</div>
    const re = /vCI_CorpManagerInfo\.php\?[^"]*?Name=([^"&]+)[^"]*">\s*([^<]+?)\s*<\/a>\s*<\/div>\s*<\/td>\s*<td[^>]*>\s*<div[^>]*>\s*([^<]+?)\s*<\/div>/g;
    let mm;
    while ((mm = re.exec(txt)) !== null) {
      const name = (mm[2] || '').trim();
      const title = (mm[3] || '').trim();
      if (!name || name.length < 2 || name.length > 4) continue;
      if (!/^[\u4e00-\u9fa5]{2,4}$/.test(name)) continue;
      if (!members[name]) members[name] = { name, titles: [] };
      if (title && members[name].titles.length < 3) {
        members[name].titles.push(title + '@新浪财经高管表');
      }
    }
    return Object.keys(members).map(function (k) { return members[k]; });
  } catch (e) {
    return [];
  }
}

async function searchCoreMembers(company, stockCode) {
  // 优先新浪高管表（A股精确名单）
  if (stockCode) {
    const sina = await fetchSinaManagers(stockCode);
    if (sina.length > 0) return sina;
  }
  // 兜底：搜狗/必应"头衔+人名"结构检索（港股/美股/未上市公司的兜底）
  // 查询用长尾词（是谁/个人简历）触发搜索引擎的人物知识卡片；标题过滤用"短名首词"放宽匹配
  const shortName = company.replace(/(股份|有限)?(责任)?公司$/g, '');
  // 短名首词：'杭州宇树科技有限公司'→'宇树'、'腾讯控股'→'腾讯控股'；用于放宽标题相关性判断
  const coreWord = shortName.length > 4 ? shortName.replace(/^(深圳|杭州|北京|上海|广州|成都|武汉|南京|苏州)/, '') : shortName;
  const queries = [
    company + ' 创始人 是谁',
    company + ' 董事长 是谁',
    shortName + ' CEO 个人简历'
  ];
  const results = await Promise.allSettled(queries.map(function (q) { return searchNews(q, 8000); }));
  const titles = [];
  results.forEach(function (r) {
    if (r.status === 'fulfilled') r.value.forEach(function (it) { titles.push(it.title + ' ' + (it.snippet || '')); });
  });

  // 提取"头衔 + 人名"结构的核心成员（创始人/董事长/CEO/总裁/CFO/CTO 等头衔后紧跟人名）
  const TITLE_RE = new RegExp('(创始人|联合创始人|董事长|董事总经理|首席执行官|CEO|总裁|总经理|首席(执行官|财务官|技术官)|CFO|CTO|COO|副总|合伙人)[:：、\\s]*([' + SURNAME_STR + '][' + SURNAME_STR + '\\u4e00-\\u9fa5]{1,2})', 'g');
  // 以及"人名 + 任/担任/出任 + 头衔"结构
  const REV_RE = new RegExp('([' + SURNAME_STR + '][' + SURNAME_STR + '\\u4e00-\\u9fa5]{1,2})(?=将?(出任|担任|接任|卸任|加入|履新|升任|出任))', 'g');

  const members = {};
  const knownNoise = /(腾讯网|腾讯视频|官网|下载|首页|Home|生活百科)/;
  // 查询核心词："腾讯控股"→["腾讯"]；"宇树科技"→["宇树"]——公司品牌词（去掉地域/行业后缀）
  const brandWords = [company, shortName, coreWord, shortName.replace(/(科技|技术|信息|网络|控股|集团|股份)$/, ''), shortName.slice(0, 4)];
  for (const t of titles) {
    // 过滤：标题命中任一品牌词，或本身就是人物词条（马化腾/创始人等+百科/简介），且不是导航噪声页
    const isPersonEntry = /(百度百科|简介|个人简历|是谁|创始人|董事长|总裁|CEO|高管|董事会)/.test(t) && /[\u4e00-\u9fa5]{2,4}/.test(t);
    const hitBrand = brandWords.some(function (w) { return w && w.length >= 2 && t.includes(w); });
    if (!hitBrand && !isPersonEntry) continue;
    if (knownNoise.test(t) && !/(创始人|董事长|总裁|CEO|首席|高管|董事)/.test(t)) continue;
    let m;
    while ((m = TITLE_RE.exec(t)) !== null) {
      const name = m[3];
      if (name.length < 2 || name.length > 3) continue;
      if (!members[name]) members[name] = { name, titles: [] };
      if (members[name].titles.length < 2) members[name].titles.push(m[1] + '@新闻检索');
    }
    while ((m = REV_RE.exec(t)) !== null) {
      const name = m[1];
      if (name.length < 2 || name.length > 3) continue;
      if (!members[name]) members[name] = { name, titles: [] };
      if (members[name].titles.length < 2) members[name].titles.push('任职变动@新闻检索');
    }
  }
  return Object.keys(members).map(function (k) { return members[k]; });
}

// ---------- 港股公司概况（东财 HK F10 公开接口） ----------
// 为什么需要它：港股/美股拿不到 A 股那套「股东研究 + 高管名单」接口，
// 此前港股公司的工商一节是彻底空的（实测蜜雪冰城：股东 0、高管 0、法人无），
// 覆盖率因此卡在 50%，结论只能是「稳定性有限」。
// 这个接口返回交易所披露口径的公司概况：全称/行业/成立日期/注册资本/董事长/注册地址。
async function fetchHkProfile(stock) {
  if (!stock || stock.market !== 'hk') return null;
  const code = String(stock.code).padStart(5, '0');
  const url = 'https://datacenter.eastmoney.com/securities/api/data/v1/get'
    + '?reportName=RPT_HKF10_INFO_ORGPROFILE&columns=ALL'
    + '&filter=' + encodeURIComponent('(SECUCODE="' + code + '.HK")')
    + '&source=F10&client=PC';
  return cached('hkprof:' + code, 60 * 60 * 1000, async function () {
    try {
      const txt = await fetchText(url, 9000);
      const json = JSON.parse(txt);
      const rows = (json.result && json.result.data) || [];
      if (!rows[0]) return null;
      const r = rows[0];
      const pick = function (k) { const v = r[k]; return v === undefined || v === null || v === '' ? null : String(v).trim(); };
      return {
        orgName: pick('ORG_NAME'),
        industry: pick('BELONG_INDUSTRY'),
        establishDate: (pick('FOUND_DATE') || '').slice(0, 10) || null,
        regCapital: pick('REG_CAPITAL'),
        chairman: pick('CHAIRMAN'),
        secretary: pick('SECRETARY'),
        regAddress: pick('REG_ADDRESS'),
        listingDate: (pick('LISTING_DATE') || '').slice(0, 10) || null,
        isin: pick('ISIN_CODE')
      };
    } catch (e) { return null; }
  });
}

// ---------- 维度综合推断（新闻 + 财务 + 演示库兜底） ----------
function inferDimsFromNews(newsSignals, base) {
  const dims = Object.assign({}, base);
  for (const s of newsSignals) {
    if (dims[s.dim] === undefined) continue;
    const cur = typeof dims[s.dim] === 'number' ? dims[s.dim] : 50;
    dims[s.dim] = Math.max(5, Math.min(95, cur + (s.positive ? 8 : -6)));
  }
  return dims;
}

module.exports = {
  searchNewsBaidu,
  searchStockCode, fetchFinance, financeFromData, fetchQuote, toQuoteCode,
  fetchFinanceOverseas, fetchOverseasReport, fetchHkProfile,
  searchNews, searchNewsSogou, newsToSignals, fetchCompanyProfile, inferDimsFromNews, fetchText,
  filterRelevantNews, queryCore,
  searchCoreMembers,
  // 百度风控冷却状态共享（person-search 复用，避免风控期重复白打请求）
  isBaiduCoolingDown
};
