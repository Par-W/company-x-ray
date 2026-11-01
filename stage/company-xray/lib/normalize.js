'use strict';

// 三源工商数据归一化：企查查 / 水滴信用 / 天眼查 → 统一结构
// 数据纪律：股东持股比例按数据源原样逐字引用（一层直接口径），不做穿透推算；
//          实际控制人仅引用专门接口返回值。

// ---------- 通用字段抓取 ----------
function pick(obj, keys) {
  for (const k of keys) {
    const v = obj && obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function toRatio(v) {
  if (v == null) return null;
  const s = String(v).replace('%', '').trim();
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}

// ---------- 企查查（返回中文键 JSON） ----------
function normQccReg(raw) {
  if (!raw || raw._raw) return null;
  const legalPerson = pick(raw, ['法定代表人', 'legal_person']);
  if (!legalPerson && !pick(raw, ['统一社会信用代码']) && !pick(raw, ['企业名称'])) return null;
  return {
    legalPerson,
    creditNo: pick(raw, ['统一社会信用代码']),
    regCapital: pick(raw, ['注册资本']),
    establishDate: pick(raw, ['成立日期']),
    status: pick(raw, ['登记状态']),
    companyType: pick(raw, ['企业类型']),
    authority: pick(raw, ['登记机关'])
  };
}

function normQccShareholders(raw) {
  const rows = raw && raw['股东信息'];
  if (!Array.isArray(rows)) return [];
  return rows.map(function (r, i) {
    return {
      name: pick(r, ['股东名称']) || '',
      ratio: toRatio(pick(r, ['持股比例'])),
      shares: pick(r, ['持股数']) || '',
      subscribed: pick(r, ['认缴出资额']) || '',
      rank: i + 1
    };
  }).filter(function (r) { return r.name; });
}

function normQccPersonnel(raw) {
  const rows = raw && raw['主要人员信息'];
  if (!Array.isArray(rows)) return [];
  return rows.map(function (r) {
    return {
      name: pick(r, ['姓名']) || '',
      position: pick(r, ['职务']) || '',
      tenure: pick(r, ['本届任期']) || ''
    };
  }).filter(function (r) { return r.name; });
}

function normQccController(raw) {
  if (!raw || raw._raw) return null;
  if (typeof raw['实际控制人'] === 'string' && raw['实际控制人'].trim()) return raw['实际控制人'].trim();
  if (raw.data && typeof raw.data.name === 'string') return raw.data.name;
  if (typeof raw.name === 'string' && /公司|企业|中心|合伙|财政|国资|委员会/.test(raw.name)) return raw.name;
  return null;
}

// ---------- 水滴信用 ----------
function normShuidiReg(raw) {
  const d = raw && raw.data;
  if (!d || !d.legal_person) return null;
  return {
    legalPerson: d.legal_person || null,
    creditNo: d.credit_no || null,
    regCapital: d.capital || null,
    establishDate: d.establish_date ? String(d.establish_date).slice(0, 10) : null,
    status: d.company_status || null,
    companyType: d.company_type || null,
    authority: d.authority || null
  };
}

function normShuidiShareholders(raw) {
  const d = raw && raw.data;
  const items = d && Array.isArray(d.items) ? d.items : (raw && Array.isArray(raw.items) ? raw.items : []);
  return items.map(function (it, i) {
    return {
      name: pick(it, ['partner_name', '股东名称', 'name']) || '',
      ratio: toRatio(pick(it, ['stock_ratio', '持股比例', 'subscribed_capital_ratio'])),
      shares: it.holder_num || '',
      subscribed: pick(it, ['subscribed_capital', '认缴出资额']) || '',
      rank: i + 1
    };
  }).filter(function (r) { return r.name; });
}

function normShuidiPersonnel(raw) {
  const d = raw && raw.data;
  const items = d && Array.isArray(d.items) ? d.items : (raw && Array.isArray(raw.items) ? raw.items : []);
  return items.map(function (it) {
    return {
      name: pick(it, ['employee_name', '姓名', 'name']) || '',
      position: pick(it, ['position', '职务']) || '',
      tenure: ''
    };
  }).filter(function (r) { return r.name; });
}

// ---------- 天眼查（call_tool 返回 JSON 或 Markdown 表格） ----------
// 登记信息：尝试常见 JSON 键，失败则从文本提取
function normTycReg(json, rawText) {
  const src = (json && (json.data || json.result || json)) || null;
  let legalPerson = null, creditNo = null, regCapital = null, establishDate = null, status = null, companyType = null, authority = null;
  if (src && typeof src === 'object' && !Array.isArray(src)) {
    legalPerson = pick(src, ['legalPersonName', '法定代表人', 'legal_person']);
    creditNo = pick(src, ['creditNo', '统一社会信用代码']);
    regCapital = pick(src, ['regCapital', '注册资本']);
    establishDate = pick(src, ['estiblishTime', 'fromTime', '成立日期']);
    status = pick(src, ['regStatus', 'regInstitute', '登记状态', '企业状态']);
    companyType = pick(src, ['companyOrgType', '企业类型']);
    authority = pick(src, ['regInstitute', '登记机关']);
    if (establishDate && /^\d{13}$/.test(establishDate)) {
      establishDate = new Date(Number(establishDate)).toISOString().slice(0, 10);
    }
  }
  if (!legalPerson && rawText) {
    const m = rawText.match(/法定代表人[：:\s]*([\u4e00-\u9fa5]{2,5})/);
    if (m) legalPerson = m[1];
    const mc = rawText.match(/统一社会信用代码[：:\s]*([0-9A-Z]{18})/);
    if (mc) creditNo = mc[1];
    const mr = rawText.match(/注册资本[：:\s]*([\d.,]+\s*万?[人民币元]*)/);
    if (mr) regCapital = mr[1];
    const ms = rawText.match(/(存续|在业|注销|吊销|迁入|迁出|停业|清算)/);
    if (ms) status = ms[1];
  }
  if (!legalPerson && !creditNo) return null;
  return { legalPerson, creditNo, regCapital, establishDate, status, companyType, authority };
}

// 从 Markdown 表格行解析（| 陈华 | 董事长,法定代表人,董事 | ... |）
function parseMarkdownPeople(rawText) {
  const people = [];
  if (!rawText) return people;
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').map(function (c) { return c.trim(); }).filter(function (c, i, a) { return !(i === 0 && c === '') && !(i === a.length - 1 && c === ''); });
    if (cells.length < 2) continue;
    if (cells.every(function (c) { return /^[-: ]*$/.test(c); })) continue; // 分隔行
    if (/姓名|人员|职位|职务|股东名称|投资人/.test(cells[0]) && !/[\u4e00-\u9fa5]{2,4}(?![a-z])/.test(cells[0].replace(/姓名|人员|职位|职务|股东名称|投资人/g, ''))) continue;
    // 姓名是 2-5 个中文字符的第一列
    const nameMatch = cells[0].match(/^([\u4e00-\u9fa5·]{2,5})$/);
    if (!nameMatch) continue;
    const rest = cells.slice(1).filter(function (c) { return !/^[-: ]*$/.test(c); });
    people.push({ name: nameMatch[1], position: rest.join(' / '), tenure: '' });
  }
  return people;
}

function normTycPeople(rawText) {
  // 天眼查 call_tool 可能返回 Markdown 表格（get_company_people / 主要人员维度）
  return parseMarkdownPeople(rawText);
}

function normTycShareholders(rawText) {
  const rows = [];
  if (!rawText) return rows;
  const lines = rawText.split(/\r?\n/);
  let rank = 0;
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split('|').map(function (c) { return c.trim(); }).filter(function (c, i, a) { return !(i === 0 && c === '') && !(i === a.length - 1 && c === ''); });
    if (cells.length < 2) continue;
    if (cells.every(function (c) { return /^[-: ]*$/.test(c); })) continue;
    // 股东名称列：公司名或自然人名
    const nameCell = cells.find(function (c) { return /公司|企业|中心|合伙|事务所|集团|^[A-Z]{2,}|\([\u4e00-\u9fa5]+\)|（[\u4e00-\u9fa5]+）/.test(c) || /^[\u4e00-\u9fa5·]{2,5}$/.test(c); });
    if (!nameCell) continue;
    const ratioCell = cells.map(function (c) { const m = c.match(/([\d.]+)\s*%/); return m ? parseFloat(m[1]) : null; }).find(function (v) { return v != null; });
    const sharesCell = cells.map(function (c) { const m = c.match(/^([\d,]+)$/.source) ? null : null; return m; }) && null;
    const sharesMatch = cells.map(function (c) { const m = c.replace(/,/g, '').match(/^(\d{4,})$/); return m ? m[1] : null; }).find(Boolean);
    rank++;
    rows.push({
      name: nameCell,
      ratio: ratioCell != null ? ratioCell : null,
      shares: sharesMatch || '',
      subscribed: '',
      rank
    });
  }
  return rows;
}

module.exports = {
  normQccReg, normQccShareholders, normQccPersonnel, normQccController,
  normShuidiReg, normShuidiShareholders, normShuidiPersonnel,
  normTycReg, normTycPeople, normTycShareholders, parseMarkdownPeople
};
