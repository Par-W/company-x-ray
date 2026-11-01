'use strict';

// 三源编排：对同一公司并发/级联查询企查查、水滴信用、天眼查，合并去重
// 免登录兜底：东方财富 F10（A股）/ 必应公开索引（全部）

const mcp = require('./mcp');
const nz = require('./normalize');
const { fetchText } = require('./fallback');

const TOOL_TIMEOUT = 25000;

// 单源查询（某家 MCP 可用工具组合）
async function querySource(key, company) {
  const cfgs = mcp.loadConfig();
  const cfg = cfgs[key];
  if (!cfg) return { key, name: mcp.SOURCE_NAMES[key], available: false, channels: [] };
  const out = { key, name: cfg.name, available: true, channels: [], reg: null, shareholders: [], personnel: [], actualController: null, planNote: null };
  try {
    await mcp.withSession(cfg, async function (sid) {
      let id = 10;
      const step = async function (toolName, args, norm, kind) {
        try {
          const r = await mcp.callTool(cfg, sid, toolName, args, ++id, TOOL_TIMEOUT);
          const v = norm ? norm(r.json, r.raw) : r.raw;
          out.channels.push({ source: out.name, tool: toolName, status: 'ok' });
          return v;
        } catch (e) {
          const note = e.code === 'PLAN' ? '需VIP' : (e.code === 'AUTH' ? 'Token无效' : (e.code === 'RATE' ? '限流' : (e.message || '失败').slice(0, 40)));
          out.channels.push({ source: out.name, tool: toolName, status: e.code === 'PLAN' ? 'plan' : 'failed', note });
          if (e.code === 'PLAN') out.planNote = note;
          return null;
        }
      };

      if (key === 'qcc') {
        out.reg = await step('get_company_registration_info', { searchKey: company }, nz.normQccReg, 'reg') || out.reg;
        out.shareholders = await step('get_shareholder_info', { searchKey: company }, nz.normQccShareholders, 'sh') || out.shareholders;
        out.personnel = await step('get_key_personnel', { searchKey: company }, nz.normQccPersonnel, 'pp') || out.personnel;
        out.actualController = await step('get_actual_controller', { searchKey: company }, nz.normQccController, 'ctl') || out.actualController;
      } else if (key === 'shuidi') {
        out.reg = await step('get_company_info', { company_name: company }, nz.normShuidiReg, 'reg') || out.reg;
        out.shareholders = await step('get_company_partner', { company_name: company }, nz.normShuidiShareholders, 'sh') || out.shareholders;
        out.personnel = await step('get_company_employee', { company_name: company }, nz.normShuidiPersonnel, 'pp') || out.personnel;
      } else if (key === 'tyc') {
        // 天眼查：免费档仅 search / basic_profile / registration_info 可用
        out.reg = await step('get_company_registration_info', { company_name: company }, nz.normTycReg, 'reg') || out.reg;
        // 主要人员（需VIP，免费档会返回 PLAN 提示，如实记录）
        const tycPp = await step('get_company_people', { company_name: company }, null, 'pp');
        if (tycPp && tycPp.raw) {
          const ppl = nz.normTycPeople(tycPp.raw);
          if (ppl.length) out.personnel = ppl;
        }
        const tycSh = await step('get_stock_shareholders', { company_name: company, page: 1, page_size: 10 }, null, 'sh');
        if (tycSh && tycSh.raw) {
          const shs = nz.normTycShareholders(tycSh.raw);
          if (shs.length) out.shareholders = shs;
        }
      }
    });
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = (e.code === 'AUTH' ? 'Token 无效或过期' : (e.message || '连接失败').slice(0, 60));
    out.channels.push({ source: out.name, tool: 'session', status: e.code === 'AUTH' ? 'auth' : 'failed', note: out.error });
  }
  return out;
}

// 三源合并：登记信息优先级 qcc > tyc > shuidi（企查查 T+0 最全），股东/人员合并去重
function mergeResults(results) {
  const merged = { reg: null, shareholders: [], personnel: [], actualController: null };
  const bySource = {};
  for (const r of results) bySource[r.key] = r;

  // 登记：qcc > tyc > shuidi
  for (const k of ['qcc', 'tyc', 'shuidi']) {
    const r = bySource[k];
    if (r && r.available && r.reg) { merged.reg = r.reg; merged.regSource = r.name; break; }
  }

  // 股东：取条数最多的源（避免不同源颗粒度混合），标注来源
  let bestSh = null;
  for (const k of ['qcc', 'tyc', 'shuidi']) {
    const r = bySource[k];
    if (r && r.available && r.shareholders && r.shareholders.length > (bestSh ? bestSh.list.length : 0)) {
      bestSh = { list: r.shareholders, source: r.name };
    }
  }
  if (bestSh) { merged.shareholders = bestSh.list; merged.shareholderSource = bestSh.source; }

  // 人员：多源合并去重（姓名为键，职务用「 / 」拼接，标注来源）
  const ppMap = {};
  for (const k of ['qcc', 'tyc', 'shuidi']) {
    const r = bySource[k];
    if (!r || !r.available || !r.personnel) continue;
    for (const p of r.personnel) {
      if (!ppMap[p.name]) {
        ppMap[p.name] = { name: p.name, positions: [], sources: [], tenures: [] };
      }
      if (p.position && ppMap[p.name].positions.indexOf(p.position) === -1) ppMap[p.name].positions.push(p.position);
      if (r.name && ppMap[p.name].sources.indexOf(r.name) === -1) ppMap[p.name].sources.push(r.name);
      if (p.tenure && ppMap[p.name].tenures.indexOf(p.tenure) === -1) ppMap[p.name].tenures.push(p.tenure);
    }
  }
  merged.personnel = Object.keys(ppMap).map(function (n) {
    const p = ppMap[n];
    return { name: n, position: p.positions.join(' / ') || '主要人员', sources: p.sources, tenure: p.tenures[0] || '' };
  });
  // 董事长/法定代表人排最前
  merged.personnel.sort(function (a, b) {
    const rank = function (p) {
      if (/董事长|法定代表/.test(p.position)) return 0;
      if (/总经理|CEO|总裁|首席|董事/.test(p.position)) return 1;
      if (/监事/.test(p.position)) return 2;
      return 3;
    };
    return rank(a) - rank(b);
  });

  // 实控人：qcc 优先，其次其他源
  for (const k of ['qcc', 'tyc', 'shuidi']) {
    const r = bySource[k];
    if (r && r.available && r.actualController) { merged.actualController = r.actualController; merged.controllerSource = r.name; break; }
  }
  return merged;
}

async function fetchAll(company) {
  const keys = ['qcc', 'shuidi', 'tyc'];
  const results = await Promise.allSettled(keys.map(function (k) { return querySource(k, company); }));
  const srcResults = results.map(function (r, i) {
    if (r.status === 'fulfilled') return r.value;
    return { key: keys[i], name: mcp.SOURCE_NAMES[keys[i]], available: true, ok: false, error: (r.reason && r.reason.message) || '异常', channels: [{ source: mcp.SOURCE_NAMES[keys[i]], tool: 'session', status: 'failed', note: (r.reason && r.reason.message || '').slice(0, 50) }] };
  });
  const merged = mergeResults(srcResults);
  return { sources: srcResults, merged };
}

module.exports = { fetchAll, querySource, mergeResults };
