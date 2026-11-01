'use strict';

// Agent 内置数据库兜底（第五级数据源）——两级实现：
//   A) 静态知识库 KNOWN_PEOPLE_DB（66 位知名企业家，精确命中即用）
//   B) WorkBuddy 云服务免密钥大模型（静态库未命中时，调大模型自身知识生成人物档案）
// 触发前提（用户 2026-10-03 指定）：互联网搜索（企查查/天眼查/爱企查/腾讯自选股/水滴信用/百度/必应）
// 均未查到该人物资料时，才调用本模块。大模型结果为"记忆数据"（非实时），前端显著标注。

const path = require('path');
const fs = require('fs');
// 解构 66 人库（known-people.js 导出 { KNOWN_PEOPLE_DB: {...66人...} }）
const _kbModule = require('./known-people');
const KNOWN_PEOPLE_DB = _kbModule.KNOWN_PEOPLE_DB;

// 云服务 publicConfig（company-xray 已开通的应用，publishableKey 仅标识应用、无权限，服务端校验 Origin）
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

// 流式收集完整回答（云服务仅支持 stream:true）；超时用 AbortController 主动断流
async function chatOnce(messages, timeoutMs) {
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
      if (timedOut) break;  // 双保险：SDK 未响应 abort 时也在下一块主动收工
      const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      if (delta && delta.content) answer += delta.content;
    }
  } finally {
    clearTimeout(timer);
  }
  if (timedOut && !answer.trim()) {
    const err = new Error('AI 响应超时（' + Math.round(limit / 1000) + 's）'); err.code = 'TIMEOUT'; throw err;
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

const PERSON_PROMPT = [
  '你是企业高管人物资料知识库。用户给出【人名】和【所属公司】，请根据你的知识（截至训练数据）回答该人物:',
  '1. known 是否知名人物（true/false：全国性或行业内有公开报道的企业创始人/董事长/知名职业经理人为 true）',
  '2. title 头衔（如"XX公司创始人兼董事长"）',
  '3. background 背景介绍（学历、创业经历、行业地位，60 字内；查无此人填空字符串）',
  '4. isBigTech 是否有大厂任职经历（true/false：曾在知名大企业任职或现任职于知名大企业）',
  '5. bigTechReason 大厂履历说明（isBigTech 为 true 时填写，否则空字符串）',
  '6. isProMention 是否有专业领域公开提及（true/false：专利/技术/行业专家/获奖/演讲等）',
  '7. proReason 专业提及说明（isProMention 为 true 时填写，否则空字符串）',
  '只输出一个 JSON 对象，不要输出任何其他文字。',
  '如果你完全没有听说过这个人物，输出 {"known": false, "title": "", "background": "", "isBigTech": false, "bigTechReason": "", "isProMention": false, "proReason": ""}。'
].join('\n');

// 单人档案查询：先查静态库，未命中再调大模型
async function lookupPersonFromAgentDB(name, company) {
  // A) 静态知识库精确命中
  if (KNOWN_PEOPLE_DB[name]) {
    const kb = KNOWN_PEOPLE_DB[name];
    return {
      used: true,
      channel: 'Agent内置人物知识库（静态）',
      known: { hit: true, title: kb.title, background: kb.background, source: 'Agent内置人物知识库（静态）' },
      isBigTech: true,
      bigTechReason: kb.title + '（内置库收录，直接计为大厂履历）',
      isProMention: true,
      proReason: '内置库收录（公开常识级人物）'
    };
  }
  // B) 大模型记忆兜底（静态库未命中）——45s 超时，快速失败
  try {
    const answer = await chatOnce([
      { role: 'system', content: PERSON_PROMPT },
      { role: 'user', content: '人名：' + name + '\n所属公司：' + (company || '未知') }
    ], 45000);
    const j = extractJson(answer);
    if (!j) return { used: false, channel: 'Agent数据库（大模型）', error: 'AI 返回无法解析' };
    if (!j.known || !j.title) {
      return { used: true, channel: 'Agent数据库（大模型）', known: null, note: '大模型知识库中无该人物资料' };
    }
    return {
      used: true,
      channel: 'Agent数据库（大模型）',
      known: { hit: true, title: j.title, background: j.background || '', source: 'Agent数据库（大模型记忆，非实时）' },
      isBigTech: j.isBigTech === true,
      bigTechReason: j.bigTechReason || '',
      isProMention: j.isProMention === true,
      proReason: j.proReason || '',
      note: '数据来自大模型记忆，可能过时'
    };
  } catch (e) {
    return { used: false, channel: 'Agent数据库（大模型）', error: (e && e.message || 'AI 调用失败').slice(0, 80) };
  }
}

// 批量查人（串行，避免并发限流；带进度回调）
async function lookupPeopleFromAgentDB(people, company, onProgress) {
  const results = {};
  for (const p of people) {
    if (onProgress) onProgress(p.name);
    results[p.name] = await lookupPersonFromAgentDB(p.name, company);
  }
  return results;
}

// 人物批量合并查询（性能优化）：把 N 个人合成一次大模型调用，45-60s 内出全部结果
// （逐人串行 = N×45s；逐人并行 = 也受限于大模型并发排队。合并调用是唯一数量级优化）
// 精简版批量提示词：只回 4 个布尔/短字段，不回 title/background/长理由
// （实测：带 title+background+两段理由时 5 人要 48s、6 人直接 60s 超时；精简后输出 token 大幅下降）
const BATCH_PROMPT = [
  '你是企业高管人物资料知识库。用户给出多个人物（JSON 数组，含 name 和所属公司）。',
  '对每个人只输出 4 个字段：name（原样返回）、known（是否知名企业人物 true/false）、',
  'isBigTech（是否有知名大企业任职经历 true/false）、isProMention（是否有专业领域公开提及：专利/技术/专家/获奖 true/false）。',
  '只输出一个 JSON：{"people":[{"name":"张三","known":true,"isBigTech":true,"isProMention":false},...]}。',
  '不要输出 title、background、reason 等任何其他字段，不要任何解释文字，不要 markdown 代码块。'
].join('\n');

// 单次批量调用（不拆分）。
// 实测：3 人 ≈27s，6 人 >60s 会超时 → 调用方应分块（见 lookupPeopleBatch）
async function lookupPeopleBatchRaw(names, company, timeoutMs) {
  const out = { used: false, results: {}, error: null };
  if (!names || names.length === 0) return out;
  try {
    const answer = await chatOnce([
      { role: 'system', content: BATCH_PROMPT },
      { role: 'user', content: JSON.stringify(names.map(function (n) { return { name: n, company: company || '未知' }; })) }
    ], timeoutMs || 60000);
    const j = extractJson(answer);
    if (!j || !Array.isArray(j.people)) {
      out.error = 'AI 返回无法解析';
      return out;
    }
    for (const item of j.people) {
      if (!item || !item.name) continue;
      out.results[item.name] = {
        used: true,
        channel: 'Agent数据库（大模型·批量）',
        known: item.known && item.title ? { hit: true, title: item.title, background: item.background || '', source: 'Agent数据库（大模型记忆·批量）' } : null,
        isBigTech: item.isBigTech === true,
        bigTechReason: item.bigTechReason || '',
        isProMention: item.isProMention === true,
        proReason: item.proReason || '',
        note: '数据来自大模型记忆（批量查询），可能过时'
      };
    }
    // 未被 AI 返回的人补"查无"
    for (const n of names) {
      if (!out.results[n]) {
        out.results[n] = { used: true, channel: 'Agent数据库（大模型·批量）', known: null, note: '大模型知识库中无该人物资料' };
      }
    }
    out.used = true;
  } catch (e) {
    out.error = (e && e.message || 'AI 批量调用失败').slice(0, 80);
  }
  return out;
}

// 分块批量查人：每块 chunk 人（默认 4），块间按 concurrency 并发
// 实测口径（glm-5.3-flash）：3 人 ≈27s、4 人 ≈28s、5 人 ≈48s、6 人 >60s 超时、两块并发会互相拖慢到 ~70s
// → 取 chunk=4、concurrency=1（串行），既能装满单次调用又不会触发超时导致整批结果丢失
async function lookupPeopleBatch(names, company, opts) {
  const o = opts || {};
  const chunk = o.chunk || 4;
  const concurrency = Math.max(1, o.concurrency || 1);
  const timeoutMs = o.timeoutMs || 60000;
  const list = (names || []).slice();
  const merged = { used: false, results: {}, error: null };
  if (list.length === 0) return merged;

  const blocks = [];
  for (let i = 0; i < list.length; i += chunk) blocks.push(list.slice(i, i + chunk));

  let cursor = 0;
  async function worker() {
    while (cursor < blocks.length) {
      const b = blocks[cursor++];
      const r = await lookupPeopleBatchRaw(b, company, timeoutMs);
      if (r.error) merged.error = r.error;
      for (const k of Object.keys(r.results || {})) {
        merged.results[k] = r.results[k];
        merged.used = true;
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, blocks.length); i++) workers.push(worker());
  await Promise.all(workers);
  return merged;
}

module.exports = { lookupPersonFromAgentDB, lookupPeopleFromAgentDB, lookupPeopleBatch, lookupPeopleBatchRaw, chatOnce, extractJson, KNOWN_PEOPLE_DB, PUBLIC_CONFIG };
