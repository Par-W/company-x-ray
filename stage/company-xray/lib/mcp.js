'use strict';

// 零依赖 MCP streamable-http 客户端（公司人员透视专用）
// 支持企查查 / 水滴信用 / 天眼查 三家 MCP 服务直连。
// Token 配置：mcp.local.json（优先）或环境变量 QCC_MCP_TOKEN / SHUIDI_MCP_TOKEN / TYC_MCP_TOKEN

const fs = require('fs');
const path = require('path');

const DEFAULT_URLS = {
  qcc: 'https://agent.qcc.com/mcp/company/stream',
  shuidi: 'https://aidata.shuidi.cn/mcp',
  tyc: 'https://mcp.tianyancha.com/v1'
};

const SOURCE_NAMES = { qcc: '企查查', shuidi: '水滴信用', tyc: '天眼查' };

function loadConfig() {
  let local = {};
  try {
    const p = path.join(__dirname, '..', 'mcp.local.json');
    if (fs.existsSync(p)) local = JSON.parse(fs.readFileSync(p, 'utf8')) || {};
  } catch (e) { local = {}; }
  const out = {};
  const defs = [
    { key: 'qcc', env: 'QCC_MCP_TOKEN', lk: 'qcc' },
    { key: 'shuidi', env: 'SHUIDI_MCP_TOKEN', lk: 'shuidi' },
    { key: 'tyc', env: 'TYC_MCP_TOKEN', lk: 'tyc' }
  ];
  for (const d of defs) {
    const token = (local[d.lk] && local[d.lk].token) || process.env[d.env];
    if (token) {
      out[d.key] = {
        name: SOURCE_NAMES[d.key],
        url: (local[d.lk] && local[d.lk].url) || process.env[d.env + '_URL'] || DEFAULT_URLS[d.key],
        token
      };
    }
  }
  return out;
}

function configStatus() {
  const c = loadConfig();
  return { qcc: !!c.qcc, shuidi: !!c.shuidi, tyc: !!c.tyc };
}

// ---------- SSE / JSON 双格式解析 ----------
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

async function mcpRpc(cfg, body, sid, wantId, timeoutMs) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, timeoutMs || 20000);
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': 'Bearer ' + cfg.token
    };
    if (sid) { headers['mcp-session-id'] = sid; headers['mcp-protocol-version'] = '2025-03-26'; }
    const res = await fetch(cfg.url, { method: 'POST', headers, signal: ctl.signal, body: JSON.stringify(body) });
    if (res.status === 401 || res.status === 403) {
      const err = new Error('鉴权失败（Token 无效/过期）'); err.code = 'AUTH'; throw err;
    }
    if (res.status === 429) {
      const err = new Error('调用频率受限'); err.code = 'RATE'; throw err;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const newSid = res.headers.get('mcp-session-id') || sid;
    const buf = Buffer.from(await res.arrayBuffer());
    return { data: parseSseOrJson(buf, wantId), sid: newSid };
  } finally {
    clearTimeout(t);
  }
}

async function withSession(cfg, fn) {
  const init = await mcpRpc(cfg, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'company-xray', version: '1.0' } }
  }, null, 1);
  if (!init.data) throw new Error('MCP 初始化无响应');
  if (init.data.error) throw new Error('MCP 初始化失败：' + (init.data.error.message || '未知错误'));
  const sid = init.sid;
  try { await mcpRpc(cfg, { jsonrpc: '2.0', method: 'notifications/initialized' }, sid, null, 8000); } catch (e) { /* 通知失败不致命 */ }
  return fn(sid);
}

// tools/call：content[0].text 解析为 JSON（各家 MCP 均返回 JSON 文本或 Markdown）
async function callTool(cfg, sid, toolName, args, id, timeoutMs) {
  const r = await mcpRpc(cfg, {
    jsonrpc: '2.0', id: id, method: 'tools/call',
    params: { name: toolName, arguments: args || {} }
  }, sid, id, timeoutMs);
  if (!r.data) throw new Error('空响应');
  if (r.data.error) {
    const msg = r.data.error.message || '工具调用失败';
    const err = new Error(msg);
    if (/VIP|SVIP|entitlement|权限|升级/i.test(msg)) err.code = 'PLAN';
    throw err;
  }
  const result = r.data.result || {};
  if (result.isError) {
    const txt = (result.content && result.content[0] && result.content[0].text) || '';
    const err = new Error(txt.slice(0, 200) || '工具返回错误');
    if (/VIP|SVIP|entitlement|权限|升级/i.test(txt)) err.code = 'PLAN';
    throw err;
  }
  const content = result.content;
  if (!content || !content[0]) throw new Error('无返回内容');
  const txt = content[0].text || '';
  try { return { json: JSON.parse(txt), raw: txt }; } catch (e) { return { json: null, raw: txt }; }
}

module.exports = { loadConfig, configStatus, withSession, callTool, SOURCE_NAMES };
