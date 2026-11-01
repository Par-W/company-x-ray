'use strict';

// 美国 SEC EDGAR 官方 XBRL 财务数据 —— 美股财报的一手来源
//
// 为什么需要它：东财海外 F10 对美股只给 7 个字段（总资产/负债/货币资金/营收/成本/净利/报告期），
// 缺研发费用、销售费用、管理费用、应收账款、经营现金流、同比 —— 于是「技术壁垒」「客户质量」
// 「行业前景」这几维在美股上永远算不出来（实测阿里巴巴 5/10 维未评分）。
// 这不是"查不到"，是"没去查"：SEC 把这些数字按 XBRL 结构化公开，免费、无 key。
//
// 接口（三个，都是官方）：
//   ① https://www.sec.gov/files/company_tickers.json          ticker → CIK（约 800KB，本地缓存 24h）
//   ② https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json   全部 XBRL 事实
//   ③ https://data.sec.gov/submissions/CIK##########.json     提交文件列表（备用）
//
// SEC 的硬性要求：User-Agent 必须能联系到人，否则直接 403。别用默认 UA。

const fs = require('fs');
const path = require('path');

const UA = 'CompanyXRay/2.4 (financial-fraud-prevention; contact@companyxray.local)';

// 与东财字段名对齐 —— 上层 financeFromData 只认这几个名字，别另起一套
const CONCEPTS = {
  revenue: [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'RevenueFromContractWithCustomerIncludingAssessedTax',
    'SalesRevenueNet'
  ],
  operateCost: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold'],
  netProfit: ['NetIncomeLoss', 'ProfitLoss'],
  monetary: [
    'CashAndCashEquivalentsAtCarryingValue',
    'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'
  ],
  totalAssets: ['Assets'],
  totalLiab: ['Liabilities'],
  receivable: ['AccountsReceivableNetCurrent', 'AccountsReceivableGrossCurrent', 'ReceivablesNetCurrent'],
  opCashflow: ['NetCashProvidedByUsedInOperatingActivities'],
  researchExpense: ['ResearchAndDevelopmentExpense', 'ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost'],
  saleExpense: ['SellingAndMarketingExpense', 'MarketingExpense', 'SellingExpense'],
  manageExpense: ['GeneralAndAdministrativeExpense', 'SellingGeneralAndAdministrativeExpense']
};

// 期间型（利润表/现金流量表：一段时间的累计）vs 时点型（资产负债表：某一天）
const INSTANT = new Set(['monetary', 'totalAssets', 'totalLiab', 'receivable']);

const ANNUAL_FORMS = /^(10-K|20-F|40-F|10-K\/A|20-F\/A)$/;

// lib → invest-score → stage → front → 项目根，四级 '..'（少退一级会写到 front/runtime 里）
const _cacheDir = path.join(__dirname, '..', '..', '..', '..', 'runtime');
const _tickerFile = path.join(_cacheDir, 'sec-tickers.json');

function cacheFresh(file, ttlMs) {
  try {
    const st = fs.statSync(file);
    return Date.now() - st.mtimeMs < ttlMs;
  } catch (e) {
    return false;
  }
}

async function httpJson(url, ms) {
  const ac = new AbortController();
  const timer = setTimeout(function () { ac.abort(); }, ms || 20000);
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---------- ticker → CIK ----------
let _tickers = null;

async function loadTickers() {
  if (_tickers) return _tickers;
  if (cacheFresh(_tickerFile, 24 * 3600 * 1000)) {
    try {
      _tickers = JSON.parse(fs.readFileSync(_tickerFile, 'utf8'));
      return _tickers;
    } catch (e) { /* 落盘损坏就重拉 */ }
  }
  const raw = await httpJson('https://www.sec.gov/files/company_tickers.json', 25000);
  const map = {};
  for (const k of Object.keys(raw || {})) {
    const it = raw[k];
    if (!it || !it.ticker || !it.cik_str) continue;
    map[String(it.ticker).toUpperCase()] = {
      cik: String(it.cik_str),
      title: String(it.title || '')
    };
  }
  _tickers = map;
  try {
    fs.mkdirSync(_cacheDir, { recursive: true });
    fs.writeFileSync(_tickerFile, JSON.stringify(map), 'utf8');
  } catch (e) { /* 写不了就算了，内存缓存还在 */ }
  return map;
}

async function lookupCik(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (!t) return null;
  try {
    const m = await loadTickers();
    return m[t] || null;
  } catch (e) {
    return null;
  }
}

// ---------- XBRL 事实 → 年度序列 ----------
function pickUnit(node) {
  const units = (node && node.units) || {};
  const keys = Object.keys(units);
  if (!keys.length) return null;
  // 货币单位优先（shares 之类不要）
  const money = keys.filter(function (u) { return /^(USD|CNY|HKD|EUR|RMB)$/i.test(u); });
  return (money.length ? money : keys)[0];
}

/**
 * 某个概念的**年度**序列，按结束日期升序。
 * 只收年度报表（10-K / 20-F）的 FY 值 —— 拿季度累计值算同比是最常见的错。
 * 同一期间会被多次申报重复记录，按 filed 取最新。
 */
function annualSeries(facts, concept) {
  const node = facts && facts[concept];
  if (!node) return [];
  const unit = pickUnit(node);
  if (!unit) return [];
  const arr = (node.units || {})[unit] || [];
  const byEnd = {};
  for (const x of arr) {
    if (!x || typeof x.val !== 'number' || !isFinite(x.val)) continue;
    if (!ANNUAL_FORMS.test(String(x.form || ''))) continue;
    if (x.fp !== 'FY') continue;
    const end = String(x.end || '');
    if (!end) continue;
    const prev = byEnd[end];
    if (!prev || String(x.filed || '') >= String(prev.filed || '')) {
      byEnd[end] = { end: end, val: x.val, filed: x.filed, fy: x.fy, form: x.form };
    }
  }
  return Object.keys(byEnd).sort().map(function (k) { return byEnd[k]; });
}

/** 时点型概念取「不晚于 anchor 的最近一条」。
 *  不能先取全局最新再比较 —— 那样只要最新一期在 anchor 之后（很常见：
 *  10-Q 的季末晚于 10-K 的年末），整组就被丢掉，资产负债表字段全空（苹果就是这样丢了 4 个字段）。 */
function latestInstant(facts, concept, anchor, toleranceDays) {
  const node = facts && facts[concept];
  if (!node) return null;
  const unit = pickUnit(node);
  if (!unit) return null;
  const arr = (node.units || {})[unit] || [];
  const tol = (toleranceDays || 45) * 86400000;
  const a = anchor ? new Date(anchor).getTime() : null;
  let best = null;
  for (const x of arr) {
    if (!x || typeof x.val !== 'number' || !isFinite(x.val)) continue;
    const end = String(x.end || '');
    if (!end) continue;
    const t = new Date(end).getTime();
    if (a !== null && Math.abs(t - a) > tol) continue;   // 只要锚点附近的
    if (!best || end > best.end) best = { end: end, val: x.val, form: x.form };
  }
  return best;
}

function yoy(series, end) {
  if (!series || series.length < 2) return NaN;
  // 找到对应期间的位置；优先精确匹配 end
  let idx = -1;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].end === end) { idx = i; break; }
  }
  if (idx < 1) return NaN;
  const cur = series[idx];
  const prev = series[idx - 1];
  if (!prev || !cur || !isFinite(prev.val) || prev.val === 0) return NaN;
  // 只接受一年左右的间隔（防止财年切换造成的错配）
  const d1 = new Date(cur.end).getTime();
  const d0 = new Date(prev.end).getTime();
  const days = (d1 - d0) / 86400000;
  if (!(days > 300 && days < 430)) return NaN;
  return (cur.val - prev.val) / Math.abs(prev.val) * 100;
}

/** 在一组候选概念里，选「最后一个期间最新」的那条序列 */
function bestSeries(facts, list) {
  let best = null;
  for (const c of list) {
    const s = annualSeries(facts, c);
    if (!s.length) continue;
    if (!best || s[s.length - 1].end > best[best.length - 1].end) best = s;
  }
  return best || [];
}

/** 取序列里 end 最接近 target 的那条（容忍 ±tolerance 天） */
function pickAt(series, target, toleranceDays) {
  if (!series || !series.length) return null;
  const t = new Date(target).getTime();
  let best = null;
  for (const it of series) {
    const d = Math.abs(new Date(it.end).getTime() - t) / 86400000;
    if (d > (toleranceDays || 40)) continue;
    if (!best || d < best.d) best = { d: d, item: it };
  }
  return best ? best.item : null;
}

/**
 * 取一家美股公司的财报字段（与东财海外返回的结构对齐，多出来的字段是东财没有的）。
 * 失败返回 null，上层按"没取到"处理，不编数。
 *
 * ⚠ 所有字段必须对齐到**同一个财报期**。
 * 第一版踩过的坑：各字段各自取"第一个有值的概念"，结果苹果的收入取到了 2018 年
 * （2019 年后换用了另一个 XBRL 概念），成本取到了最新年 —— 毛利率算出来是负的。
 * 现在先定锚点期间（营收概念里最新的那个 end），其余字段只在 ±40 天内取值。
 */
async function fetchSecFinance(ticker) {
  const cik = await lookupCik(ticker);
  if (!cik) return null;
  const padded = String(cik.cik).padStart(10, '0');
  let d;
  try {
    d = await httpJson('https://data.sec.gov/api/xbrl/companyfacts/CIK' + padded + '.json', 30000);
  } catch (e) {
    return null;
  }
  const facts = (d && d.facts && d.facts['us-gaap']) || {};
  if (!Object.keys(facts).length) return null;

  // ① 锚点：营收序列里最新的期间
  const revSeries = bestSeries(facts, CONCEPTS.revenue);
  if (!revSeries.length) return null;
  const anchor = revSeries[revSeries.length - 1].end;

  const out = {
    reportDate: anchor,
    market: 'us',
    currency: null,
    entityName: d.entityName || cik.title,
    cik: cik.cik,
    source: 'SEC EDGAR XBRL'
  };

  for (const key of Object.keys(CONCEPTS)) {
    if (INSTANT.has(key)) {
      // 时点值：取锚点附近最近的一条（资产负债表日通常等于或略早于利润表期末）
      let pick = null;
      for (const c of CONCEPTS[key]) {
        const v = latestInstant(facts, c, anchor, 45);
        if (!v) continue;
        if (!pick || v.end > pick.end) pick = v;
      }
      if (pick) out[key] = pick.val;
    } else {
      const s = bestSeries(facts, CONCEPTS[key]);
      if (!s.length) continue;
      // 与锚点对齐：优先精确同一期末，容忍 ±40 天（财年结束日偶尔差一两天）
      let hit = s.find(function (x) { return x.end === anchor; });
      if (!hit) hit = pickAt(s, anchor, 40);
      if (!hit) continue;   // 期间对不上宁可不取，也不拿错年份的数
      out[key] = hit.val;
      const y = yoy(s, hit.end);
      if (isFinite(y)) out[key + 'Yoy'] = Math.round(y * 10) / 10;
    }
  }

  // 币种：从原始单位带出来（阿里报表是 CNY，不是 USD —— 不能想当然按美元）
  const anyNode = facts[CONCEPTS.totalAssets[0]] || facts[CONCEPTS.revenue[0]];
  if (anyNode) {
    const u = pickUnit(anyNode);
    if (u) out.currency = /^CNY|RMB$/i.test(u) ? 'CNY' : u.toUpperCase();
  }

  // 一个都没取到就当失败，别返回一个空壳让上层以为有数据
  const gotKeys = Object.keys(out).filter(function (k) {
    return typeof out[k] === 'number' && isFinite(out[k]);
  });
  if (gotKeys.length < 3) return null;
  out.fieldCount = gotKeys.length;
  return out;
}

/**
 * 8-K 的 Item 5.02 = 「董事或某些高级管理人员的离任；选举董事；任命某些管理人员」。
 * 这是美股版的高管变动公告，用来补「团队实力」这一维 —— 美股没有巨潮那样的公告库，
 * 但 SEC 把事项编码结构化了。
 *
 * ⚠ 只对美国本土申报人有效（10-K 体系）。中概股是外国私人发行人，报 6-K，
 *   items 字段为空（实测阿里 674 条申报里一条编码都没有）。这种情况如实返回
 *   hasItemField=false，上层标"不覆盖"，而不是当成"没有高管变动"。
 */
async function fetchOfficerChanges(ticker, months) {
  const cik = await lookupCik(ticker);
  if (!cik) return null;
  const padded = String(cik.cik).padStart(10, '0');
  let d;
  try {
    d = await httpJson('https://data.sec.gov/submissions/CIK' + padded + '.json', 25000);
  } catch (e) {
    return null;
  }
  const r = d && d.filings && d.filings.recent;
  if (!r || !Array.isArray(r.form)) return null;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (months || 24));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const items = [];
  let hasItemField = false;
  let has8K = false;
  const n = r.form.length;
  for (let i = 0; i < n; i++) {
    const raw = String((r.items && r.items[i]) || '');
    if (raw) hasItemField = true;
    const form = String(r.form[i] || '');
    if (form === '8-K' || form === '8-K/A') has8K = true;
    if (form !== '8-K' && form !== '8-K/A') continue;
    const codes = raw.split(',').map(function (s) { return s.trim(); });
    if (codes.indexOf('5.02') < 0) continue;
    const date = String(r.filingDate[i] || '');
    if (!date || date < cutoffStr) continue;
    const accn = String(r.accessionNumber[i] || '').replace(/-/g, '');
    const doc = String(r.primaryDocument[i] || '');
    items.push({
      date: date,
      // 标题刻意用中性词：Item 5.02 同时涵盖"离任"和"任命"，
      // 编码本身不区分方向，写成"离任"会让每一次任命都被算成负面信号。
      title: (form === '8-K/A' ? '8-K/A（修正）' : '8-K') + ' Item 5.02：董事或高管变动披露',
      url: accn && doc ? 'https://www.sec.gov/Archives/edgar/data/' + cik.cik + '/' + accn + '/' + doc : ''
    });
  }
  items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  // 中概股报 6-K，从不报 8-K —— 这时「0 条 5.02」不代表没变动，而是这套口径不适用
  const applicable = has8K && hasItemField;
  return { applicable: applicable, items: items, count: items.length, cik: cik.cik };
}

/** 把 SEC 数据补进已有 finance（只补空缺，不覆盖已有非空值） */
function mergeInto(finance, sec) {
  if (!finance || !sec) return finance;
  const out = Object.assign({}, finance);
  const filled = [];
  for (const k of Object.keys(sec)) {
    if (k === 'source' || k === 'fieldCount' || k === 'cik' || k === 'entityName') continue;
    const v = sec[k];
    if (typeof v !== 'number' || !isFinite(v)) continue;
    const cur = out[k];
    if (typeof cur === 'number' && isFinite(cur)) continue;   // 东财已经给了就不动
    out[k] = v;
    filled.push(k);
  }
  out.secFilled = filled;
  out.secSource = 'SEC EDGAR XBRL';
  if (!out.reportDate && sec.reportDate) out.reportDate = sec.reportDate;
  if (!out.currency && sec.currency) out.currency = sec.currency;
  return out;
}

module.exports = { fetchSecFinance, fetchOfficerChanges, lookupCik, mergeInto, annualSeries, latestInstant, yoy, CONCEPTS };
