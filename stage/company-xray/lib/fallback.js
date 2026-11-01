'use strict';

// 免登录兜底数据源：东方财富 F10（A 股）+ 必应公开索引
// 任一 MCP 均未配置 / 均失败时仍能给出基础结果

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchText(url, ms, charset) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, ms || 8000);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (charset === 'gbk') {
      try { return new TextDecoder('gbk').decode(buf); } catch (e) { return buf.toString('utf8'); }
    }
    return buf.toString('utf8');
  } finally {
    clearTimeout(t);
  }
}

// 东财 suggest：股票代码匹配（滑窗子串策略，input 必须是股票简称连续子串）
async function searchStockCode(name) {
  const raw = String(name || '').replace(/\s/g, '');
  if (!raw) return null;
  const queries = [raw];
  const maxLen = Math.min(6, raw.length);
  for (let len = maxLen; len >= 2; len--) {
    for (let i = 0; i + len <= raw.length; i++) queries.push(raw.slice(i, i + len));
  }
  try {
    for (const q of queries) {
      const txt = await fetchText('https://searchapi.eastmoney.com/api/suggest/get?input=' + encodeURIComponent(q)
        + '&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=8', 6000);
      const json = JSON.parse(txt);
      const rows = json.QuotationCodeTable && json.QuotationCodeTable.Data;
      if (!rows || rows.length === 0) continue;
      for (const r of rows) {
        const qid = r.QuoteID || '';
        const mkt = qid.split('.')[0];
        let market = null;
        if (/^[012]\./.test(qid)) market = mkt === '1' ? 'sh' : (mkt === '0' ? 'sz' : 'bj');
        else if (mkt === '116') market = 'hk';
        else if (mkt === '105' || mkt === '106' || mkt === '107') market = 'us';
        if (!market || market !== 'sh' && market !== 'sz' && market !== 'bj') continue;
        const b = (r.Name || '').replace(/\s/g, '');
        if (b.includes(raw) || raw.includes(b)) {
          const code = (mkt === '1' ? 'sh' : (mkt === '0' ? 'sz' : 'bj')) + r.Code;
          return { code, shortName: r.Name, market };
        }
      }
    }
    return null;
  } catch (e) { return null; }
}

// 东财 F10 十大股东 + 实控人
async function fetchEmShareholders(code) {
  const txt = await fetchText('https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code=' + encodeURIComponent(code), 9000);
  const j = JSON.parse(txt);
  const out = { shareholders: [], actualController: null, endDate: null };
  const pickLatest = function (arr, key) {
    if (!Array.isArray(arr) || !arr.length) return [];
    const d = String(arr[0][key] || '').slice(0, 10);
    return arr.filter(function (r) { return String(r[key] || '').slice(0, 10) === d; });
  };
  const sdgd = pickLatest(j.sdgd, 'END_DATE');
  const sdlt = pickLatest(j.sdltgd, 'END_DATE');
  const useGd = sdgd.length > 0;
  const rows = useGd ? sdgd : sdlt;
  out.shareholders = rows.map(function (r, i) {
    return {
      name: String(r.HOLDER_NAME || '').trim(),
      ratio: isFinite(parseFloat(useGd ? r.HOLD_NUM_RATIO : r.FREE_HOLDNUM_RATIO)) ? parseFloat(useGd ? r.HOLD_NUM_RATIO : r.FREE_HOLDNUM_RATIO) : null,
      shares: r.HOLD_NUM != null ? Number(r.HOLD_NUM) : '',
      subscribed: '',
      rank: i + 1
    };
  }).filter(function (r) { return r.name; });
  if (rows.length) out.endDate = String(rows[0].END_DATE || '').slice(0, 10);
  if (Array.isArray(j.sjkzr) && j.sjkzr[0] && j.sjkzr[0].HOLDER_NAME) {
    out.actualController = String(j.sjkzr[0].HOLDER_NAME).trim();
  }
  return out;
}

// 东财 F10 董监高（含法定代表人标注与简历）
async function fetchEmManagers(code) {
  const txt = await fetchText('https://emweb.securities.eastmoney.com/PC_HSF10/CompanyManagement/PageAjax?code=' + encodeURIComponent(code), 9000);
  const j = JSON.parse(txt);
  const rows = Array.isArray(j.gglb) ? j.gglb : [];
  const personnel = rows.map(function (r) {
    return {
      name: String(r.PERSON_NAME || '').trim(),
      position: String(r.POSITION || '').trim(),
      tenure: String(r.INCUMBENT_TIME || '').trim(),
      resume: String(r.RESUME || '').trim()
    };
  }).filter(function (r) { return r.name; });
  let legalPerson = null;
  for (const p of personnel) {
    if (/法定代表人/.test(p.position)) { legalPerson = p.name; break; }
  }
  return { personnel, legalPerson };
}

// 必应公开索引：法定代表人兜底核验
async function searchLegalPersonBing(company) {
  try {
    const txt = await fetchText('https://www.bing.com/search?q=' + encodeURIComponent(company + ' 法定代表人 site:aiqicha.baidu.com OR site:qcc.com OR site:tianyancha.com') + '&mkt=zh-CN', 8000);
    const plain = txt.replace(/<[^>]+>/g, ' ');
    const lm = plain.match(/法定代表人[：:\s]*([\u4e00-\u9fa5]{2,5})/);
    return lm ? lm[1] : null;
  } catch (e) { return null; }
}

module.exports = { fetchText, searchStockCode, fetchEmShareholders, fetchEmManagers, searchLegalPersonBing };
