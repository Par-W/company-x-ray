'use strict';

// AI 记忆库（WorkBuddy 云服务大模型兜底）：
// 工商实体接口（MCP/东财F10/公开索引）均未覆盖时，从大模型自身知识补档公司工商信息。
// 复用 company-xray 已开通的云服务应用（免密钥 publishableKey）。

const PUBLIC_CONFIG = {
  endpoint: 'https://company-xray.app.workbuddy.host',
  publishableKey: 'wbpk_ryQxdYP2vNDBK5vLQU5j11_WHwRzkovvRb7YXDNHX6p1WEGR2ddgNwn'
};

const SDK_PATH = 'C:/Users/WQJY/.workbuddy/binaries/node/workspace/node_modules/@tencent-ai/workbuddy-cloud-sdk';

let cloudClient = null;
function getClient() {
  if (cloudClient) return cloudClient;
  const { createWorkBuddyCloud } = require(SDK_PATH);
  cloudClient = createWorkBuddyCloud({
    endpoint: PUBLIC_CONFIG.endpoint,
    publishableKey: PUBLIC_CONFIG.publishableKey
  });
  return cloudClient;
}

let cachedModelId = null;
async function pickModel(cloud) {
  if (cachedModelId) return cachedModelId;
  const models = await cloud.llm.models.list();
  if (!models || models.length === 0) throw new Error('无可用模型');
  const preferred = models.find(function (m) { return m.id === 'glm-5.3-flash' && m.disabled !== true; });
  const enabled = preferred || models.find(function (m) { return m.disabled !== true && m.enabled !== false; });
  if (!enabled) throw new Error('无启用模型');
  cachedModelId = enabled.id;
  return cachedModelId;
}

async function chatOnce(messages, timeoutMs) {
  // [整合] 缺 WorkBuddy SDK 时（本机默认如此：SDK 路径指向队友机器）回退到**共享 AI 模块**（自带密钥）,
  //   让"免密钥通道在本机不可用"不再成为断点；两边都没有则如实抛错，由调用方降级为「AI 记忆库不可用」。
  const shared = require('../../shared/ai');
  const cfg = shared.aiConfig();
  if (!cfg.sdkAvailable) {
    const r = await shared.chatJSON(messages, { timeoutMs: timeoutMs || 60000, temperature: 0.3 });
    if (!r.ok) throw new Error(r.error || 'AI 调用失败');
    return r.rawFull || r.raw || '';
  }
  const cloud = getClient();
  const modelId = await pickModel(cloud);
  const limit = timeoutMs || 90000;
  let timedOut = false;
  const ctl = new AbortController();
  const timer = setTimeout(function () { timedOut = true; ctl.abort(); }, limit);
  let answer = '';
  try {
    const stream = cloud.llm.chat.completions.create({
      model: modelId,
      messages: messages,
      stream: true,
      temperature: 0.3,
      signal: ctl.signal   // 修复：原实现创建了 AbortController 却未传 signal，超时形同虚设
    });
    for await (const chunk of stream) {
      if (timedOut) break;  // 双保险：若 SDK 未响应 abort，也在收到下一块时主动收工
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      if (delta && delta.content) answer += delta.content;
    }
  } finally {
    clearTimeout(timer);
  }
  // 超时但已收集到部分内容：仍尽量解析（extractJson 容忍截断），无内容才抛错
  if (timedOut && !answer.trim()) {
    const err = new Error('AI 响应超时（' + Math.round(limit / 1000) + 's）'); err.code = 'TIMEOUT'; throw err;
  }
  return answer.trim();
}

function extractJson(text) {
  if (!text) return null;
  let m = text.match(/```json\s*([\s\S]*?)```/);
  if (!m) m = text.match(/```\s*([\s\S]*?)```/);
  const body = m ? m[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch (e) { return null; }
}

const SYSTEM_PROMPT = [
  '你是公司工商信息知识库。用户给出一个公司名称，请根据你的知识（截至训练数据）回答该公司的:',
  '1. legalPerson 法定代表人姓名',
  '2. chairman 董事长姓名（与法代相同则填同值）',
  '3. actualController 实际控制人（自然人或机构，不确定填 null）',
  '4. shareholders 大股东数组，每项 {name, ratio}（ratio 为百分比数字，不确定填 null），最多10条，按持股比例降序',
  '5. personnel 核心团队数组，每项 {name, position}（创始人/CEO/总裁/总经理/首席X官/董事/监事等），最多12条',
  '6. note 一句话备注（数据截至时间、可能的过时风险）',
  '只输出一个 JSON 对象，不要输出任何其他文字。字段缺失填 null 或空数组。',
  '如果你完全没有听说过这家公司（Likely 虚构或极小型公司），输出 {"unknown": true, "note": "知识库中无该公司信息"}。'
].join('\n');

// 公司级工商信息查询（AI 记忆库）
// opts.fast=true 时输出精简（只问法人/董事长/实控人/核心团队，跳过股东明细）——缩短大模型生成时间
async function aiCompanyLookup(company, opts) {
  const fast = opts && opts.fast;
  const out = { reg: null, chairman: null, actualController: null, shareholders: [], personnel: [], note: '', used: false, unknown: false, error: null };
  const sys = fast
    ? SYSTEM_PROMPT + '\n【精简模式·务必遵守】只输出一个 JSON 对象，不要任何解释、不要 markdown 代码块、不要多余字段。'
      + 'shareholders 固定输出 []；personnel 最多 6 人，每项只有 name 与 position 两个字段；'
      + 'legalPerson / chairman / actualController 只填姓名字符串或 null；note 不超过 20 字。'
    : SYSTEM_PROMPT;
  try {
    const answer = await chatOnce([
      { role: 'system', content: sys },
      { role: 'user', content: String(company).trim() }
    ], fast ? 40000 : 60000); // 提速：fast 模式 60s → 40s（大模型实测 20-35s 出结果），避免长尾空等
    const j = extractJson(answer);
    if (!j) {
      out.error = 'AI 返回无法解析';
      return out;
    }
    if (j.unknown) {
      out.unknown = true;
      out.note = j.note || 'AI 知识库中无该公司信息';
      out.used = true;
      return out;
    }
    out.legalPerson = j.legalPerson || null;
    out.chairman = j.chairman || null;
    out.actualController = j.actualController || null;
    out.shareholders = Array.isArray(j.shareholders)
      ? j.shareholders.filter(function (s) { return s && s.name; }).map(function (s, i) {
          const ratioNum = parseFloat(String(s.ratio).replace(/[^\d.]/g, ''));
          return { name: String(s.name), ratio: isFinite(ratioNum) ? ratioNum : null, shares: '', subscribed: '', rank: i + 1 };
        })
      : [];
    out.personnel = Array.isArray(j.personnel)
      ? j.personnel.filter(function (p) { return p && p.name; }).map(function (p) {
          return { name: String(p.name), position: String(p.position || '核心成员'), sources: ['AI 记忆库'], tenure: '', resume: '' };
        })
      : [];
    out.note = j.note || '';
    out.used = true;
  } catch (e) {
    out.error = (e && e.message || 'AI 调用失败').slice(0, 80);
  }
  return out;
}

module.exports = { aiCompanyLookup, chatOnce, extractJson };
