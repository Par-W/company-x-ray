'use strict';

// 工商登记与股权数据聚合层（三级数据源，全部带超时与失败降级）
//   1) MCP Connector 直连：企查查 / 水滴信用（需用户配置 Token，见 mcp.local.json 或环境变量）
//      - 企查查: get_company_registration_info / get_shareholder_info / get_key_personnel / get_actual_controller
//      - 水滴  : get_company_info / get_company_partner / get_company_employee
//   2) 东方财富 F10 公开接口（仅 A 股）：十大股东 / 实际控制人 / 高管名单（含法定代表人与简历），零鉴权
//   3) 公开搜索索引兜底（sources.fetchCompanyProfile，由 analyze 层调用）
// 数据纪律：股东持股比例按数据源原样逐字引用（一层直接口径），不做穿透推算；
//          实际控制人仅引用专门接口返回值，不自行推断。

const fs = require('fs');
const path = require('path');
const { fetchText, fetchHkProfile } = require('./sources');
const publicRegistry = require('./public-registry');
// 第四级数据源：WorkBuddy 云服务免密钥大模型（AI 记忆库）
// SDK 为惰性 require（ai-memory 内部只在真正调用时才加载），缺少 SDK 时仅该通道失败，不影响主链路
const aiMemory = require('./ai-memory');

const DEFAULT_QCC_URL = 'https://agent.qcc.com/mcp/company/stream';
const DEFAULT_SHUIDI_URL = 'https://aidata.shuidi.cn/mcp';

// ---------- 配置读取：mcp.local.json 优先，其次环境变量 ----------
function loadMcpConfig() {
  const out = {};
  let local = {};
  try {
    const p = path.join(__dirname, '..', 'mcp.local.json');
    if (fs.existsSync(p)) local = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
  } catch (e) { local = {}; }
  const qccToken = (local.qcc && local.qcc.token) || process.env.QCC_MCP_TOKEN;
  if (qccToken) out.qcc = { name: '企查查', url: (local.qcc && local.qcc.url) || process.env.QCC_MCP_URL || DEFAULT_QCC_URL, token: qccToken };
  const sdToken = (local.shuidi && local.shuidi.token) || process.env.SHUIDI_MCP_TOKEN;
  if (sdToken) out.shuidi = { name: '水滴信用', url: (local.shuidi && local.shuidi.url) || process.env.SHUIDI_MCP_URL || DEFAULT_SHUIDI_URL, token: sdToken };
  return out;
}

function mcpConfigured() {
  const c = loadMcpConfig();
  return { qcc: !!c.qcc, shuidi: !!c.shuidi };
}

// ---------- 极简 MCP streamable-http 客户端（零依赖） ----------
function parseSseOrJson(buf, wantId) {
  const text = buf.toString('utf8');
  if (text.startsWith('event:') || text.startsWith('data:') || /\r?\nevent:/.test(text.slice(0, 100))) {
    let best = null;
    for (const ln of text.split(/\r?\n/)) {
      const m = /^data:\s*(.+)$/.exec(ln);
      if (!m) continue;
      try {
        const j = JSON.parse(m[1]);
        best = j;
        if (wantId != null && j.id === wantId) break;
      } catch (e) { /* 忽略无法解析的 data 行 */ }
    }
    return best;
  }
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function mcpRpc(cfg, body, sid, wantId) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, 15000);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': 'Bearer ' + cfg.token
    };
    if (sid) { headers['mcp-session-id'] = sid; headers['mcp-protocol-version'] = '2025-03-26'; }
    const res = await fetch(cfg.url, { method: 'POST', headers, signal: ctl.signal, body: JSON.stringify(body) });
    if (res.status === 401 || res.status === 403) {
      const err = new Error('auth'); err.code = 'AUTH'; throw err;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const newSid = res.headers.get('mcp-session-id') || sid;
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: parseSseOrJson(buf, wantId), sid: newSid };
  } finally {
    clearTimeout(t);
  }
}

async function mcpToolCall(cfg, sid, toolName, args, id) {
  const r = await mcpRpc(cfg, { jsonrpc: '2.0', id: id, method: 'tools/call', params: { name: toolName, arguments: args } }, sid, id);
  if (!r.data) throw new Error('空响应');
  if (r.data.error) throw new Error(r.data.error.message || '工具调用失败');
  const content = r.data.result && r.data.result.content;
  if (!content || !content[0]) throw new Error('无返回内容');
  const txt = content[0].text || '';
  try { return JSON.parse(txt); } catch (e) { return { _raw: txt.slice(0, 2000) }; }
}

async function withMcpSession(cfg, fn) {
  const init = await mcpRpc(cfg, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'invest-score-app', version: '1.0' } }
  }, null, 1);
  if (!init.data) throw new Error('MCP 初始化无响应');
  if (init.data.error) throw new Error('MCP 初始化失败：' + (init.data.error.message || '未知错误'));
  const sid = init.sid;
  try { await mcpRpc(cfg, { jsonrpc: '2.0', method: 'notifications/initialized' }, sid, null); } catch (e) { /* 通知失败不致命 */ }
  return fn(sid);
}

// ---------- 归一化：企查查 ----------
function pickQccReg(raw) {
  if (!raw || raw._raw) return null;
  const g = function (k) { return raw[k] != null && String(raw[k]).trim() ? String(raw[k]).trim() : null; };
  const legalPerson = g('法定代表人');
  if (!legalPerson && !g('统一社会信用代码') && !g('企业名称')) return null;
  return {
    legalPerson,
    creditNo: g('统一社会信用代码'),
    regCapital: g('注册资本'),
    establishDate: g('成立日期'),
    status: g('登记状态'),
    companyType: g('企业类型'),
    authority: g('登记机关')
  };
}

function pickQccShareholders(raw) {
  const rows = raw && raw['股东信息'];
  if (!Array.isArray(rows)) return [];
  return rows.map(function (r, i) {
    return {
      name: String(r['股东名称'] || '').trim(),
      ratio: parseFloat(r['持股比例']) || null,
      shares: r['持股数'] || '',
      rank: i + 1
    };
  }).filter(function (r) { return r.name; });
}

function pickQccPersonnel(raw) {
  const rows = raw && raw['主要人员信息'];
  if (!Array.isArray(rows)) return [];
  return rows.map(function (r) {
    return {
      name: String(r['姓名'] || '').trim(),
      position: String(r['职务'] || '').trim(),
      tenure: r['本届任期'] ? String(r['本届任期']).trim() : ''
    };
  }).filter(function (r) { return r.name; });
}

function pickQccController(raw) {
  // 尽力而为：仅引用接口显式给出的实控人名称，不做任何推断
  if (!raw || raw._raw) return null;
  if (typeof raw['实际控制人'] === 'string' && raw['实际控制人'].trim()) return raw['实际控制人'].trim();
  if (raw.data && typeof raw.data.name === 'string') return raw.data.name;
  if (typeof raw.name === 'string' && /公司|企业|中心|合伙|个人/.test(raw.name)) return raw.name;
  return null;
}

// ---------- 归一化：水滴信用 ----------
function pickShuidiReg(raw) {
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

function pickShuidiItems(raw, nameKey, ratioKeys, posKeys) {
  const d = raw && raw.data;
  const items = d && Array.isArray(d.items) ? d.items : (raw && Array.isArray(raw.items) ? raw.items : []);
  return items.map(function (it, i) {
    let name = '';
    for (const k of nameKey) { if (it[k]) { name = String(it[k]).trim(); break; } }
    if (!name) return null;
    let ratio = null;
    for (const k of ratioKeys || []) {
      const v = parseFloat(it[k]);
      if (isFinite(v)) { ratio = v; break; }
    }
    let position = '';
    for (const k of posKeys || []) { if (it[k]) { position = String(it[k]).trim(); break; } }
    return { name, ratio, shares: it.holder_num || '', rank: i + 1, position };
  }).filter(Boolean);
}

// ---------- 东财 F10（A 股公开接口，零鉴权） ----------
function latestGroup(arr, dateKey) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const latest = String(arr[0][dateKey] || '').slice(0, 10);
  return arr.filter(function (r) { return String(r[dateKey] || '').slice(0, 10) === latest; });
}

async function fetchEmShareholders(code) {
  const txt = await fetchText('https://emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch/PageAjax?code=' + encodeURIComponent(code), 9000);
  const j = JSON.parse(txt);
  const out = { shareholders: [], actualController: null, endDate: null };
  const rows = latestGroup(j.sdgd, 'END_DATE').length ? latestGroup(j.sdgd, 'END_DATE') : latestGroup(j.sdltgd, 'END_DATE');
  const ratioKey = latestGroup(j.sdgd, 'END_DATE').length ? 'HOLD_NUM_RATIO' : 'FREE_HOLDNUM_RATIO';
  out.shareholders = rows.map(function (r, i) {
    return {
      name: String(r.HOLDER_NAME || '').trim(),
      ratio: isFinite(parseFloat(r[ratioKey])) ? parseFloat(r[ratioKey]) : null,
      shares: r.HOLD_NUM != null ? Number(r.HOLD_NUM) : '',
      rank: i + 1
    };
  }).filter(function (r) { return r.name; });
  if (rows.length) out.endDate = String(rows[0].END_DATE || '').slice(0, 10);
  if (Array.isArray(j.sjkzr) && j.sjkzr[0] && j.sjkzr[0].HOLDER_NAME) {
    out.actualController = String(j.sjkzr[0].HOLDER_NAME).trim();
  }
  return out;
}

async function fetchEmManagers(code) {
  const txt = await fetchText('https://emweb.securities.eastmoney.com/PC_HSF10/CompanyManagement/PageAjax?code=' + encodeURIComponent(code), 9000);
  const j = JSON.parse(txt);
  const rows = Array.isArray(j.gglb) ? j.gglb : [];
  // ⚠ 这里的原始字段远不止 name/position/tenure/resume —— 还有
  //   HOLD_NUM（高管持股数）/ SALARY（薪酬）/ AGE（年龄）/ HIGH_DEGREE（学历）/ SEX。
  //   它们是「团队实力」这一维能落到实处的依据（管理层与股东利益是否绑定、
  //   学历结构、年龄结构），第一版只取四个字段等于把这些全扔了。
  const personnel = rows.map(function (r) {
    const hold = r.HOLD_NUM != null && r.HOLD_NUM !== '' ? Number(r.HOLD_NUM) : null;
    const sal = r.SALARY != null && r.SALARY !== '' ? Number(r.SALARY) : null;
    const age = r.AGE != null && r.AGE !== '' ? Number(r.AGE) : null;
    return {
      name: String(r.PERSON_NAME || '').trim(),
      position: String(r.POSITION || '').trim(),
      tenure: String(r.INCUMBENT_TIME || '').trim(),
      resume: String(r.RESUME || '').trim(),
      // 新增：以下字段都可能为空（东财对部分公司不披露），
      // 空就是空，不要用 0 顶替 —— 0 持股与「未披露持股」是两回事。
      holdNum: (hold !== null && isFinite(hold)) ? hold : null,
      salary: (sal !== null && isFinite(sal)) ? sal : null,
      age: (age !== null && isFinite(age)) ? age : null,
      degree: String(r.HIGH_DEGREE || '').trim(),
      gender: String(r.SEX || '').trim()
    };
  }).filter(function (r) { return r.name; });
  let legalPerson = null;
  for (const p of personnel) {
    if (/法定代表人/.test(p.position)) { legalPerson = p.name; break; }
  }
  return { personnel, legalPerson };
}

/**
 * 东财 F10「公司基本资料」—— 团队实力这一维的补充来源。
 *
 * 为什么单独开一路：CompanyManagement 只给「人」，CompanySurvey 给的是
 * 「组织与治理的硬事实」，两者凑齐才谈得上评价团队：
 *   EMP_NUM          员工人数（团队规模）
 *   INDEDIRECTORS    独立董事名单（治理结构是否独立）
 *   FORMERNAME       曾用名（含 *ST 历史 —— 曾经被实施风险警示是硬事实）
 *   ACCOUNTFIRM_NAME 审计机构（谁在审这家公司）
 *   CHAIRMAN / PRESIDENT / SECRETARY 一把手构成（董事长与总经理是否分设）
 *
 * ⚠ EMP_NUM 是**最近一期年报口径**，不是实时值 —— 用它算人均产出之类
 *   的比率时要标数据期，不能当"今天有这么多人"。
 * ⚠ 这套接口只覆盖 A 股。港股走另一条路（hkf10），未上市没有。
 */
async function fetchEmSurvey(code) {
  const txt = await fetchText('https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code=' + encodeURIComponent(code), 9000);
  // 东财这个接口偶尔带 UTF-8 BOM —— JSON.parse 会直接抛错。
  // 与其在这里 try/catch 整个接口，不如把 BOM 摘掉：摘掉不影响正常响应。
  const clean = txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt;
  const j = JSON.parse(clean);
  const row = (Array.isArray(j.jbzl) && j.jbzl[0]) || null;
  if (!row) return null;

  const emp = row.EMP_NUM != null && row.EMP_NUM !== '' ? Number(row.EMP_NUM) : null;
  const indep = String(row.INDEDIRECTORS || '').split(',')
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
  // 曾用名里带 *ST / ST / 退 的，说明历史上被实施过风险警示。
  // 这不是"现在有问题"，但它是**已经发生过的事实**，必须让读者看见。
  const former = String(row.FORMERNAME || '').trim();
  const stHistory = former.split(/→|->|＞/).map(function (x) { return x.trim(); })
    .filter(function (x) { return /ST|退|风险警示/.test(x); });

  return {
    name: String(row.SECURITY_NAME_ABBR || '').trim(),
    industry: String(row.EM2016 || '').trim(),
    employees: (emp !== null && isFinite(emp)) ? emp : null,
    independentDirectors: indep,
    formerName: former,
    stHistory: stHistory,
    auditor: String(row.ACCOUNTFIRM_NAME || '').trim(),
    lawFirm: String(row.LAW_FIRM || '').trim(),
    chairman: String(row.CHAIRMAN || '').trim(),
    president: String(row.PRESIDENT || '').trim(),
    secretary: String(row.SECRETARY || '').trim(),
    legalPerson: String(row.LEGAL_PERSON || '').trim(),
    established: String(row.ORG_PROFILE || '').match(/成立于(\d{4})年/),
    regCapital: row.REG_CAPITAL != null && row.REG_CAPITAL !== '' ? Number(row.REG_CAPITAL) : null,
    profile: String(row.ORG_PROFILE || '').trim()
  };
}

// ---------- 第四级：AI 记忆库（WorkBuddy 云服务免密钥大模型） ----------
// 触发前提：前面三级（MCP / 东财F10 / 公开索引）未覆盖到法定代表人或核心团队时才启用，
// 结果标记为「AI 记忆库」（非实时），供前端与精英判定层区别对待。
async function aiMemoryFill(out, company, opts) {
  const res = { applied: false, channel: '', note: '' };
  try {
    const mem = await aiMemory.aiCompanyLookup(company, { fast: true });
    if (mem.error) {
      res.note = 'AI 记忆库不可用：' + mem.error;
      return res;
    }
    if (mem.unknown) {
      res.note = 'AI 记忆库：' + (mem.note || '知识库中无该公司信息');
      return res;
    }

    const before = { reg: !!out.reg, people: out.personnel.length, sh: out.shareholders.length, ac: !!out.actualController };

    if ((!out.reg || !out.reg.legalPerson) && mem.legalPerson) {
      out.reg = {
        legalPerson: mem.legalPerson, creditNo: null, regCapital: null,
        establishDate: null, status: null, companyType: null, authority: null
      };
    }
    if (!out.actualController && mem.actualController) out.actualController = mem.actualController;
    if (out.shareholders.length === 0 && mem.shareholders.length) {
      out.shareholders = mem.shareholders;
      out.source = out.source || 'ai';
      out.sourceNote = out.sourceNote || 'AI 记忆库';
    }
    // 核心团队：按姓名去重合并，AI 给出的人员统一打上 sources:['AI 记忆库']
    const byName = {};
    for (const p of out.personnel) byName[p.name] = p;
    let added = 0;
    for (const p of (mem.personnel || [])) {
      if (!p.name) continue;
      if (byName[p.name]) {
        if (!byName[p.name].position && p.position) byName[p.name].position = p.position;
        continue;
      }
      const item = {
        name: p.name,
        position: p.position || '核心成员',
        sources: ['AI 记忆库'],
        tenure: '',
        resume: ''
      };
      byName[p.name] = item;
      out.personnel.push(item);
      added++;
    }
    // 董事长单独给出时补进人员池
    if (mem.chairman && !byName[mem.chairman]) {
      const item = { name: mem.chairman, position: '董事长', sources: ['AI 记忆库'], tenure: '', resume: '' };
      byName[mem.chairman] = item;
      out.personnel.push(item);
      added++;
    }

    const changed = (!before.reg && !!out.reg) || out.personnel.length > before.people
      || (before.sh === 0 && out.shareholders.length > 0) || (!before.ac && !!out.actualController);
    if (!changed) {
      res.note = 'AI 记忆库：未补充到新的工商信息';
      return res;
    }
    res.applied = true;
    res.channel = 'ai';
    res.note = 'AI 记忆库（WorkBuddy 云服务·免密钥大模型）补充：'
      + (out.reg && out.reg.legalPerson ? '法定代表人 ' + out.reg.legalPerson + '；' : '')
      + (added ? '核心团队 +' + added + ' 人；' : '')
      + (out.shareholders.length && before.sh === 0 ? '股东 ' + out.shareholders.length + ' 条；' : '')
      + '数据来自模型记忆，非实时工商登记，可能过时。';
  } catch (e) {
    res.note = 'AI 记忆库调用失败：' + ((e && e.message) || '未知错误').slice(0, 80);
  }
  return res;
}

// ---------- 主编排：三级数据源 + AI 记忆库兜底 ----------
async function fetchRegistry({ company, stock }, opts) {
  const channels = [];
  const notes = [];
  const out = {
    reg: null, shareholders: [], personnel: [], actualController: null,
    source: null, sourceNote: '', channels, notes,
    shareholderEndDate: null, legalPersonMismatch: false,
    survey: null,       // 东财F10·基本资料（员工人数/独立董事/曾用名/审计机构）—— 团队实力维度的补充依据
    fieldSource: {}   // 每个字段到底来自哪一级（mcp / em / hkf10 / web / ai），文案据此措辞
  };
  const cfgs = loadMcpConfig();
  const order = ['qcc', 'shuidi'].filter(function (k) { return cfgs[k]; });

  // ---- 第一级：MCP Connector（企查查优先，缺什么用水滴补什么） ----
  for (const key of order) {
    const cfg = cfgs[key];
    try {
      const got = await withMcpSession(cfg, async function (sid) {
        const r = { reg: null, shareholders: [], personnel: [], actualController: null };
        if (key === 'qcc') {
          if (!out.reg) r.reg = pickQccReg(await mcpToolCall(cfg, sid, 'get_company_registration_info', { searchKey: company }, 10));
          if (!out.shareholders.length) r.shareholders = pickQccShareholders(await mcpToolCall(cfg, sid, 'get_shareholder_info', { searchKey: company }, 11));
          if (!out.personnel.length) r.personnel = pickQccPersonnel(await mcpToolCall(cfg, sid, 'get_key_personnel', { searchKey: company }, 12));
          if (!out.actualController) r.actualController = pickQccController(await mcpToolCall(cfg, sid, 'get_actual_controller', { searchKey: company }, 13));
        } else {
          if (!out.reg) r.reg = pickShuidiReg(await mcpToolCall(cfg, sid, 'get_company_info', { company_name: company }, 10));
          if (!out.shareholders.length) r.shareholders = pickShuidiItems(await mcpToolCall(cfg, sid, 'get_company_partner', { company_name: company }, 11),
            ['partner_name', '股东名称', 'name'], ['stock_ratio', '持股比例', 'ratio'], []) ;
          if (!out.personnel.length) r.personnel = pickShuidiItems(await mcpToolCall(cfg, sid, 'get_company_employee', { company_name: company }, 12),
            ['employee_name', '姓名', 'name'], [], ['position', '职务']).map(function (p) { return { name: p.name, position: p.position, tenure: '' }; });
        }
        return r;
      });
      const gotAny = (got.reg && !out.reg) || (!out.shareholders.length && got.shareholders.length) || (!out.personnel.length && got.personnel.length) || (!out.actualController && got.actualController);
      if (got.reg && !out.reg) out.reg = got.reg;
      if (!out.shareholders.length && got.shareholders.length) out.shareholders = got.shareholders;
      if (!out.personnel.length && got.personnel.length) out.personnel = got.personnel;
      if (!out.actualController && got.actualController) out.actualController = got.actualController;
      channels.push({
        name: cfg.name + ' MCP·工商接口', status: gotAny ? 'ok' : 'empty',
        note: gotAny
          ? (got.reg ? '登记信息' : '') + (got.shareholders.length ? ' 股东' + got.shareholders.length + '条' : '') + (got.personnel.length ? ' 主要人员' + got.personnel.length + '人' : '') + (got.actualController ? ' 实控人' : '')
          : '接口可达但未返回该企业数据'
      });
      if (out.reg && out.shareholders.length && out.personnel.length) break; // 数据已齐，不再消耗下一个源
    } catch (e) {
      if (e.code === 'AUTH') {
        channels.push({ name: cfg.name + ' MCP·工商接口', status: 'blocked', note: 'Token 无效或过期（检查 mcp.local.json / 环境变量）' });
      } else {
        channels.push({ name: cfg.name + ' MCP·工商接口', status: 'failed', note: '接口不可达：' + e.message });
      }
    }
  }
  if (out.reg || out.shareholders.length || out.personnel.length) {
    out.source = 'mcp';
    out.sourceNote = order.length ? cfgs[order[0]].name + 'MCP' : '';
  }

  // ---- 第二级：东财 F10（A 股公开数据；MCP 未覆盖的部分用它补，并附带高管简历） ----
  if (stock && /^(sh|sz|bj)/i.test(stock.code)) {
    const code = stock.code;
    const [shR, mgR] = await Promise.allSettled([fetchEmShareholders(code), fetchEmManagers(code)]);
    if (shR.status === 'fulfilled') {
      if (!out.shareholders.length && shR.value.shareholders.length) {
        out.shareholders = shR.value.shareholders;
        out.shareholderEndDate = shR.value.endDate;
        if (!out.source) { out.source = 'em'; out.sourceNote = '东方财富F10'; }
      }
      if (!out.actualController && shR.value.actualController) {
        out.actualController = shR.value.actualController;
        notes.push('实际控制人（东财F10·股东研究）：' + shR.value.actualController + '。');
      }
      channels.push({
        name: '东方财富F10·股东研究', status: shR.value.shareholders.length ? 'ok' : 'empty',
        note: shR.value.shareholders.length ? '十大股东（' + shR.value.endDate + '）' + (shR.value.actualController ? '，实控人 ' + shR.value.actualController : '') : '未返回股东数据'
      });
    } else {
      channels.push({ name: '东方财富F10·股东研究', status: 'failed', note: '接口不可达' });
    }
    if (mgR.status === 'fulfilled') {
      // 高管简历并入（按姓名去重合并，MCP 人员在前）
      const byName = {};
      for (const p of out.personnel) byName[p.name] = p;
      for (const p of mgR.value.personnel) {
        if (byName[p.name]) {
          if (!byName[p.name].resume && p.resume) byName[p.name].resume = p.resume;
          if (!byName[p.name].tenure && p.tenure) byName[p.name].tenure = p.tenure;
          // 新增字段也要并入：MCP 那边的记录可能没有持股/薪酬/学历
          if (byName[p.name].holdNum == null && p.holdNum != null) byName[p.name].holdNum = p.holdNum;
          if (byName[p.name].salary == null && p.salary != null) byName[p.name].salary = p.salary;
          if (byName[p.name].age == null && p.age != null) byName[p.name].age = p.age;
          if (!byName[p.name].degree && p.degree) byName[p.name].degree = p.degree;
        } else {
          byName[p.name] = p;
          out.personnel.push(p);
        }
      }
      if (!out.reg && mgR.value.legalPerson) {
        out.reg = { legalPerson: mgR.value.legalPerson, creditNo: null, regCapital: null, establishDate: null, status: null, companyType: null, authority: null };
        if (!out.source) { out.source = 'em'; out.sourceNote = '东方财富F10'; }
      }
      channels.push({
        name: '东方财富F10·高管名单', status: mgR.value.personnel.length ? 'ok' : 'empty',
        note: mgR.value.personnel.length ? mgR.value.personnel.length + ' 名董监高（含简历）' + (mgR.value.legalPerson ? '，法定代表人 ' + mgR.value.legalPerson : '') : '未返回高管数据'
      });
    } else {
      channels.push({ name: '东方财富F10·高管名单', status: 'failed', note: '接口不可达' });
    }

    // 基本资料：员工人数 / 独立董事 / 曾用名（ST 历史）/ 审计机构。
    // 这一路与「高管名单」是独立的接口，失败不影响上面两路。
    try {
      const sv = await fetchEmSurvey(code);
      if (sv) {
        out.survey = sv;
        if (!out.source) { out.source = 'em'; out.sourceNote = '东方财富F10'; }
        channels.push({
          name: '东方财富F10·公司基本资料', status: 'ok',
          note: (sv.employees != null ? '员工 ' + sv.employees + ' 人' : '')
            + (sv.independentDirectors.length ? '，独立董事 ' + sv.independentDirectors.length + ' 人' : '')
            + (sv.auditor ? '，审计 ' + sv.auditor : '')
            + (sv.stHistory.length ? '，曾用名含 ' + sv.stHistory.join('/') : '')
        });
      }
    } catch (e) {
      channels.push({ name: '东方财富F10·公司基本资料', status: 'failed', note: '接口不可达' });
    }
  }

  // ---- 第二级补充：港股公司概况（东财 HK F10） ----
  // 港股没有 A 股那套「股东研究 / 高管名单」接口，此前这一节整块是空的。
  // 交易所披露口径的公司概况能给到：全称 / 所属行业 / 成立日期 / 注册资本 / 董事长 / 注册地址。
  if (stock && stock.market === 'hk') {
    let hk = null;
    try { hk = await fetchHkProfile(stock); } catch (e) { hk = null; }
    if (hk) {
      if (!out.reg) {
        out.reg = { legalPerson: null, creditNo: null, regCapital: null, establishDate: null, status: null, companyType: null, authority: null };
      }
      if (!out.reg.regCapital && hk.regCapital) { out.reg.regCapital = hk.regCapital; out.fieldSource.regCapital = 'hkf10'; }
      if (!out.reg.establishDate && hk.establishDate) { out.reg.establishDate = hk.establishDate; out.fieldSource.establishDate = 'hkf10'; }
      if (!out.reg.legalPerson && hk.chairman) {
        // 董事长 ≠ 法定代表人，这里**不冒充**：只把董事长记进团队，法定代表人留空待检索层核
        out.reg.chairman = hk.chairman;
      }
      // 董事长/秘书并入人员池（标注来源，供精英判定层识别）
      const addPerson = function (raw, position) {
        String(raw || '').split(/[,，、]/).forEach(function (n) {
          const name = n.trim();
          if (!name || name.length > 6) return;
          if (out.personnel.some(function (p) { return p.name === name; })) return;
          out.personnel.push({ name: name, position: position, tenure: '', resume: '', sources: ['东财港股F10'] });
        });
      };
      addPerson(hk.chairman, '董事长');
      addPerson(hk.secretary, '公司秘书');
      if (!out.source) { out.source = 'hkf10'; out.sourceNote = '东方财富·港股F10'; }
      notes.push('港股公司概况（东财 F10）：' + [hk.orgName, hk.industry, hk.establishDate ? '成立 ' + hk.establishDate : '', hk.regCapital ? '注册资本 ' + hk.regCapital : '', hk.chairman ? '董事长 ' + hk.chairman : ''].filter(Boolean).join('；') + '。董事长不一定兼任法定代表人，法定代表人另按检索层核。');
      channels.push({
        name: '东方财富·港股公司概况', status: 'ok',
        note: [hk.orgName || '', hk.industry || '', hk.establishDate ? '成立 ' + hk.establishDate : '', hk.regCapital ? '注册资本 ' + hk.regCapital : ''].filter(Boolean).join(' / ')
      });
    } else {
      channels.push({ name: '东方财富·港股公司概况', status: 'empty', note: '该股票未返回公司概况' });
    }
  }

  // ---- 第三级：公开检索摘要（360 / 搜狗） ----
  // 只在前两级没拿到「法定代表人」或「注册资本」时启用。
  // 结果是 reported（报道线索）级 —— 必须标注「需核对」，不得当成工商登记。
  const needWeb = !out.reg || !out.reg.legalPerson || !out.reg.regCapital;
  if (needWeb && company) {
    const web = await publicRegistry.fetchPublicRegistry(company);
    for (const c of web.channels) channels.push(c);
    const f = web.fields || {};
    if (Object.keys(f).length) {
      if (!out.reg) {
        out.reg = { legalPerson: null, creditNo: null, regCapital: null, establishDate: null, status: null, companyType: null, authority: null };
      }
      if (!out.reg.legalPerson && f.legalPerson) { out.reg.legalPerson = f.legalPerson; out.fieldSource.legalPerson = 'web'; }
      if (!out.reg.regCapital && f.regCapital) { out.reg.regCapital = f.regCapital; out.fieldSource.regCapital = 'web'; }
      if (!out.reg.establishDate && f.establishDate) { out.reg.establishDate = f.establishDate; out.fieldSource.establishDate = 'web'; }
      if (!out.reg.creditNo && f.creditNo) { out.reg.creditNo = f.creditNo; out.fieldSource.creditNo = 'web'; }
      if (!out.reg.status && f.status) { out.reg.status = f.status; out.fieldSource.status = 'web'; }
      if (!out.source) { out.source = 'web'; out.sourceNote = '公开检索摘要'; }
      out.webFields = f;
      out.evidence = web.evidence;
      notes.push('以下工商字段来自公开检索摘要（'
        + Array.from(new Set((web.evidence || []).map(function (e) { return e.engine; }))).join('、')
        + '）：' + Object.keys(f).map(function (k) { return publicRegistry.labelOf(k) + ' ' + f[k]; }).join('；')
        + '。属报道线索，**未获官方登记接口确认，请到国家企业信用信息公示系统核对**。');
    }
  }

  // ---- 第四级：AI 记忆库（WorkBuddy 云服务免密钥大模型） ----
  // 仅在前三级未覆盖「法定代表人」或「核心团队」时才调用，避免拖慢已拿到数据的查询
  const needAi = !opts || opts.skipAiMemory !== true;
  if (needAi && (!out.reg || !out.reg.legalPerson || out.personnel.length === 0)) {
    const ai = await aiMemoryFill(out, company, opts);
    channels.push({
      name: 'AI 记忆库（WorkBuddy 云服务·免密钥）',
      status: ai.applied ? 'ok' : 'empty',
      note: ai.note || (ai.applied ? '已补充' : '未启用')
    });
    if (ai.applied) {
      notes.push(ai.note);
      if (!out.source) { out.source = 'ai'; out.sourceNote = 'AI 记忆库'; }
    } else if (ai.note) {
      out.aiNote = ai.note;
    }
  }

  // ---- 汇总说明 ----
  const fieldSource = out.fieldSource || {};
  if (out.shareholders.length) {
    const top = out.shareholders.slice(0, 3).map(function (s) {
      return s.name + (s.ratio != null ? '（' + s.ratio + '%）' : '');
    }).join('、');
    notes.push('股权结构（一层直接股东，比例按数据源原样引用）：前三大股东 ' + top + (out.shareholders.length > 3 ? ' 等 ' + out.shareholders.length + ' 条' : '') + '，来源：' + (out.source === 'mcp' ? out.sourceNote : (out.source === 'ai' ? 'AI 记忆库（非实时）' : '东方财富F10')) + '。');
  }
  if (out.reg && out.reg.legalPerson && fieldSource.legalPerson !== 'web') {
    // 出处必须与字段实际来源一致：检索摘要来的**不能**写成"工商登记"
    // （检索摘要那条已在上面统一写过一次说明，这里不重复）
    const lpSrc = fieldSource.legalPerson || out.source;
    const srcTxt = lpSrc === 'mcp' ? '（' + out.sourceNote + '，T+0）'
      : lpSrc === 'ai' ? '（AI 记忆库·非实时，未获工商登记接口确认）'
      : '（东财F10高管标注）';
    notes.push('法定代表人：工商登记为「' + out.reg.legalPerson + '」' + srcTxt + '。');
  }
  return out;
}

module.exports = { fetchRegistry, loadMcpConfig, mcpConfigured, fetchEmShareholders, fetchEmManagers, fetchEmSurvey, aiMemoryFill };
