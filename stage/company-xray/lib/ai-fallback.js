'use strict';

// AI 记忆库兜底（第四级数据源）：
// 联网渠道（MCP 三源 + 东财F10 + 必应索引）均未命中时，
// 调用 WorkBuddy 云服务免密钥大模型，从模型自身知识生成公司人员档案。
// ⚠️ 数据性质：模型记忆（非实时接口），可能过时或不完整，前端显著标注。

const path = require('path');
const SDK_PATH = 'C:/Users/WQJY/.workbuddy/binaries/node/workspace/node_modules/@tencent-ai/workbuddy-cloud-sdk';

// 云服务 publicConfig（激活应用时返回，publishableKey 仅标识应用、无权限，服务端校验 Origin）
const PUBLIC_CONFIG = {
  endpoint: 'https://company-xray.app.workbuddy.host',
  publishableKey: 'wbpk_ryQxdYP2vNDBK5vLQU5j11_WHwRzkovvRb7YXDNHX6p1WEGR2ddgNwn'
};

let cloudClient = null;
function getClient() {
  if (cloudClient) return cloudClient;
  // SDK 位于托管 node workspace，require 失败则禁用 AI 兜底（不影响主链路）
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
  // 优先 glm-5.3-flash（轻量快速，实测结构化输出最稳），否则取第一个启用模型
  const preferred = models.find(function (m) { return m.id === 'glm-5.3-flash' && m.disabled !== true; });
  const enabled = preferred || models.find(function (m) { return m.disabled !== true && m.enabled !== false; });
  if (!enabled) throw new Error('无启用模型');
  cachedModelId = enabled.id;
  return cachedModelId;
}

// 流式收集完整回答（云服务仅支持 stream:true）。
// 注意：SDK create() 不接受第二参 signal，超时改用 AbortController + 主动断流（destroy 由 abort 触发）
async function chatOnce(messages, timeoutMs) {
  const cloud = getClient();
  const modelId = await pickModel(cloud);
  const ctl = new AbortController();
  const timer = setTimeout(function () { ctl.abort(); }, timeoutMs || 90000);
  let answer = '';
  try {
    const stream = cloud.llm.chat.completions.create({
      model: modelId,
      messages: messages,
      stream: true,
      temperature: 0.3
    });
    for await (const chunk of stream) {
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      if (delta && delta.content) answer += delta.content;
    }
  } finally {
    clearTimeout(timer);
  }
  return answer.trim();
}

// 从模型回答中提取 JSON（容忍 ```json 包裹与前后杂文）
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
  '如果你完全没有听说过这家公司（ Likely 虚构或极小型公司），输出 {"unknown": true, "note": "知识库中无该公司信息"}。'
].join('\n');

async function aiFallback(company) {
  const out = { reg: null, chairman: null, actualController: null, shareholders: [], personnel: [], note: '', used: false, error: null };
  try {
    const answer = await chatOnce([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: String(company).trim() }
    ], 90000);
    const j = extractJson(answer);
    if (!j) {
      out.error = 'AI 返回无法解析';
      return out;
    }
    if (j.unknown) {
      out.note = j.note || 'AI 知识库中无该公司信息';
      out.used = true;
      return out;
    }
    out.reg = j.legalPerson ? { legalPerson: j.legalPerson, creditNo: null, regCapital: null, establishDate: null, status: null, companyType: null, authority: null } : null;
    out.chairman = j.chairman || null;
    out.actualController = j.actualController || null;
    out.shareholders = Array.isArray(j.shareholders)
      ? j.shareholders.filter(function (s) { return s && s.name; }).map(function (s, i) {
          return { name: String(s.name), ratio: isFinite(parseFloat(s.ratio)) ? parseFloat(s.ratio) : null, shares: '', subscribed: '', rank: i + 1 };
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

module.exports = { aiFallback, extractJson, chatOnce, PUBLIC_CONFIG };
