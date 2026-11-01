'use strict';
// ============================================================================
// [整合新增] 共享 AI 人员模块（人类选 B：两个子应用共用一个）
//
// 合并来源：
//   · 人员透视 company-xray/lib/ai-people.js（本地事实库 + 片段抽取 + AI 知识补全）
//   · 投资评分 invest-score/lib/{ai-memory.js,registry.js,agent-db.js}（第四级 AI 记忆库 + 批量问人）
//
// 统一口径（吸收两边踩过的坑）：
//   ① 提示词一律"只输出一个 JSON 对象"，明禁 markdown 代码块与解释文字 —— 防"AI 未返回 JSON"；
//   ② 识别 finish_reason=length —— 该模型（deepseek-flash / glm-5.3-flash）**先输出思考链**，
//      额度给小了会被思考吃光、正文为空，必须明确报错而不是当成"查不到"；
//   ③ 批量问人必须**分块 + 串行**（实测 6 人 >60s 会超时，两块并发会互相拖慢到 ~70s）；
//   ④ 所有 AI 产出都带 AI 标记与置信度，前端显著标注，绝不与接口数据混淆。
//
// 密钥/地址解析顺序（人类要求：硬编码队友机器路径要改成可配置）：
//   环境变量 DEEPSEEK_API_KEY → 软件内设置 backend/data/ai_settings.json → WorkBuddy SDK（若可用）
//   SDK 路径可用环境变量 WORKBUDDY_SDK 覆盖；缺 SDK 时该通道**静默失败**，不影响主链路。
// ============================================================================

const fs = require('fs');
const path = require('path');

const SETTINGS = path.join(__dirname, '..', '..', '..', 'backend', 'data', 'ai_settings.json');
const SDK_NAME = '@tencent-ai/workbuddy-cloud-sdk';
const WORKBUDDY = {
  endpoint: 'https://company-xray.app.workbuddy.host',
  publishableKey: 'wbpk_ryQxdYP2vNDBK5vLQU5j11_WHwRzkovvRb7YXDNHX6p1WEGR2ddgNwn',
};

/**
 * WorkBuddy SDK 路径解析（[整合63] 吸收 P2 新提交 0b9008d 的 resolveSdkPath 思路）。
 *
 * 原先这里是一个硬编码的队友机器路径（C:/Users/WQJY/...），换台机器就必然失败。
 * 现在按顺序找：
 *   ① 环境变量 WORKBUDDY_SDK（本项目原有约定）
 *   ② 环境变量 WB_CLOUD_SDK_PATH（P2 的约定）
 *   ③ 本目录 / 上级 / 项目根 的 node_modules/<SDK_NAME>
 *   ④ 用户目录 ~/.workbuddy/binaries/node/workspace/node_modules/<SDK_NAME>（WorkBuddy 默认安装位置）
 *   ⑤ 都找不到 → 返回裸包名，交给 Node 自身模块解析（全局安装场景）
 * 找不到不会报错：aiConfig() 会如实返回 sdkAvailable=false，调用方自动回退到自带密钥。
 */
function resolveSdkPath() {
  const env = String(process.env.WORKBUDDY_SDK || process.env.WB_CLOUD_SDK_PATH || '').trim();
  if (env) return env;
  const candidates = [
    path.join(__dirname, 'node_modules', SDK_NAME),
    path.join(__dirname, '..', 'node_modules', SDK_NAME),
    path.join(__dirname, '..', '..', '..', 'node_modules', SDK_NAME),
  ];
  try {
    const os = require('os');
    if (os && os.homedir) {
      candidates.push(path.join(os.homedir(), '.workbuddy', 'binaries', 'node', 'workspace', 'node_modules', SDK_NAME));
    }
  } catch (e) { /* 忽略 */ }
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (e) { /* 忽略 */ }
  }
  return SDK_NAME;   // 兜底：交给 Node 自身解析
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

/** 解析可用的模型通道：优先自带密钥（本机可用），否则尝试 WorkBuddy SDK（免密钥，取决于机器上有没有装） */
function aiConfig() {
  let key = String(process.env.DEEPSEEK_API_KEY || '').trim();
  let model = String(process.env.DEEPSEEK_MODEL || '').trim();
  let base = String(process.env.DEEPSEEK_BASE_URL || '').trim();
  if (!key || !model || !base) {
    const s = readJson(SETTINGS) || {};
    key = key || String(s.api_key || '').trim();
    model = model || String(s.model || '').trim();
    base = base || String(s.base_url || '').trim();
  }
  if (!base) base = 'https://api.deepseek.com/v1';
  const sdkPath = resolveSdkPath();
  let sdkAvailable = false;
  try { sdkAvailable = !!require.resolve(sdkPath); } catch (e) { sdkAvailable = false; }
  return {
    key: key, model: model || 'deepseek-flash', base: base.replace(/\/+$/, ''),
    sdkPath: sdkPath, sdkAvailable: sdkAvailable, workbuddy: WORKBUDDY,
  };
}

let _cloud = null;
/** WorkBuddy 免密钥通道（惰性加载；缺 SDK 时抛错，由调用方降级） */
function getCloud() {
  const cfg = aiConfig();
  if (!cfg.sdkAvailable) throw new Error('未安装 WorkBuddy SDK（可用 WORKBUDDY_SDK 指定路径）：' + cfg.sdkPath);
  if (_cloud) return _cloud;
  const { createWorkBuddyCloud } = require(cfg.sdkPath);
  _cloud = createWorkBuddyCloud({ endpoint: WORKBUDDY.endpoint, publishableKey: WORKBUDDY.publishableKey });
  return _cloud;
}

/** 统一的 JSON 约束后缀（所有提示词都加，防 markdown / 解释文字） */
const JSON_RULE = '\n【输出要求·务必遵守】只输出一个 JSON 对象，不要任何解释文字，不要 markdown 代码块，不要多余字段。';

/**
 * 调用兼容 OpenAI 协议的 /chat/completions，并强制解析出 JSON。
 * @returns {{ok:boolean, json:object|null, error:string|null, raw:string, model:string, via:string}}
 */
async function chatJSON(messages, opts) {
  const o = opts || {};
  const cfg = aiConfig();
  const maxTokens = o.maxTokens || 8000;          // 思考链会吃额度，给小了正文为空
  const temperature = o.temperature == null ? 0.2 : o.temperature;
  const timeoutMs = o.timeoutMs || 60000;

  if (!cfg.key) {
    return { ok: false, json: null, error: '未配置 AI 密钥（可在软件「设置」里填，或设环境变量 DEEPSEEK_API_KEY）', raw: '', model: '', via: 'none' };
  }
  const ctl = new AbortController();
  const timer = setTimeout(function () { ctl.abort(); }, timeoutMs);
  let res, text;
  try {
    res = await fetch(cfg.base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify({ model: cfg.model, messages: messages, temperature: temperature, max_tokens: maxTokens }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      text = await res.text().catch(function () { return ''; });
      return { ok: false, json: null, error: 'AI HTTP ' + res.status + '：' + String(text).slice(0, 160), raw: '', model: cfg.model, via: 'api' };
    }
    const j = await res.json();
    const choice = (j.choices || [])[0] || {};
    if (choice.finish_reason === 'length') {
      return { ok: false, json: null, raw: '', model: cfg.model, via: 'api',
        error: 'AI 输出被长度截断（该模型先输出思考链，额度不足时正文为空）' };
    }
    const content = (choice.message || {}).content || '';
    const m = /\{[\s\S]*\}/.exec(content);
    if (!m) return { ok: false, json: null, error: 'AI 未返回 JSON', raw: content.slice(0, 300), model: cfg.model, via: 'api' };
    try {
      return { ok: true, json: JSON.parse(m[0]), error: null, raw: content.slice(0, 400), rawFull: content, model: cfg.model, via: 'api' };
    } catch (e) {
      return { ok: false, json: null, error: 'AI 返回的 JSON 无法解析', raw: content.slice(0, 300), rawFull: content, model: cfg.model, via: 'api' };
    }
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? ('AI 超时（>' + Math.round(timeoutMs / 1000) + 's）') : String((e && e.message) || e);
    return { ok: false, json: null, error: msg, raw: '', model: cfg.model, via: 'api' };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- 人员：由模型知识给出
const CONF = ['high', 'medium', 'low'];

/** AI 知识补全：允许使用模型自身知识，但逐人给置信度、禁止编造精确数字 */
async function knowledgePeople(company, hintOfficial, opts) {
  const sys = '你是资料整理助手。允许使用你自身的知识回答，但必须严格遵守：'
    + '① 只写你有较高把握的公开人物，不确定的一律不写，宁可少写；'
    + '② 不要编造精确数字（持股比例、任职起止、年龄等），不确定就留空字符串；'
    + '③ 若不确定该公司是否有这个人，就不要输出；'
    + '④ 只输出 JSON。';
  const user = '公司名称：' + company
    + (hintOfficial ? ('\n已知官方主体：' + hintOfficial) : '')
    + '\n\n请列出该公司主要人员（法定代表人/董事长/总经理/创始人/执行董事/主要股东等），输出：'
    + '\n{"company_guess":"你判断的公司全称","people":[{"name":"","position":"","confidence":"high|medium|low","basis":"一句话依据","holding":""}]}'
    + '\n人数不限但只列有把握的；公司不了解就返回 {"people":[]}，不要硬凑。' + JSON_RULE;
  const r = await chatJSON([{ role: 'system', content: sys }, { role: 'user', content: user }], opts);
  if (!r.ok) return { ok: false, people: [], error: r.error, model: r.model };
  const j = r.json || {};
  const people = (j.people || [])
    .filter(function (p) { return p && p.name && String(p.name).trim().length >= 2; })
    .slice(0, 15)
    .map(function (p) {
      return {
        name: String(p.name).trim(),
        position: String(p.position || '（AI 给出的职务）').trim(),
        confidence: CONF.indexOf(p.confidence) >= 0 ? p.confidence : 'medium',
        basis: String(p.basis || '').slice(0, 120),
        holding: String(p.holding || '').slice(0, 24),
      };
    });
  return { ok: true, people: people, model: r.model, companyGuess: j.company_guess || '', raw: r.raw };
}

// ---------------------------------------------------------------- 人员：只从抓到的片段抽取
async function extractPeople(company, snippets, opts) {
  if (!snippets || !snippets.length) return { ok: false, people: [], error: '没有可用的公开片段' };
  const corpus = snippets.slice(0, 12).map(function (s, i) {
    return '[' + (i + 1) + '] ' + String(s.title || '') + ' — ' + String(s.snippet || s.text || '').slice(0, 300);
  }).join('\n');
  const sys = '你是资料整理助手。只能依据用户提供的公开片段抽取事实，严禁使用你自己的记忆或推测；片段里没有的不要写。只输出 JSON。';
  const user = '公司名称：' + company + '\n\n公开片段：\n' + corpus
    + '\n\n抽取人员，输出：{"people":[{"name":"","position":"","evidence":"引用片段原句","ref":片段编号}]}'
    + '\nposition 只能是片段中出现过的职务；没有"人名+职务"就返回 {"people":[]}。' + JSON_RULE;
  const r = await chatJSON([{ role: 'system', content: sys }, { role: 'user', content: user }], opts);
  if (!r.ok) return { ok: false, people: [], error: r.error, model: r.model };
  const people = ((r.json || {}).people || [])
    .filter(function (p) { return p && p.name; })
    .slice(0, 12)
    .map(function (p) {
      return { name: String(p.name).trim(), position: String(p.position || '').trim(),
               evidence: String(p.evidence || '').slice(0, 160), ref: p.ref || null };
    });
  return { ok: true, people: people, model: r.model };
}

// ---------------------------------------------------------------- 工商登记兜底（投资评分第四级用）
/** AI 记忆库：由模型知识补出法定代表人/核心团队/股东（**非实时**，调用方必须标注为 AI） */
async function registryFill(company, opts) {
  const sys = '你是企业登记资料知识库。允许使用自身知识，但不得编造精确数字（统一社会信用代码、注册资本、成立日期、持股比例一律留空或 null）；只输出 JSON。';
  const user = '公司名称：' + company + '\n\n输出：'
    + '{"unknown":false,"legalPerson":"姓名或null","chairman":"姓名或null","actualController":"姓名或null",'
    + '"personnel":[{"name":"","position":""}],"note":"不超过20字"}'
    + '\n只列有把握的；不了解该公司就把 unknown 设为 true、其余留空。' + JSON_RULE;
  const r = await chatJSON([{ role: 'system', content: sys }, { role: 'user', content: user }],
    Object.assign({ temperature: 0.1 }, opts || {}));
  if (!r.ok) return { ok: false, error: r.error, used: false, model: r.model };
  const j = r.json || {};
  return {
    ok: true, used: !j.unknown, model: r.model,
    legalPerson: j.legalPerson || null, chairman: j.chairman || null,
    actualController: j.actualController || null,
    personnel: (j.personnel || []).filter(function (p) { return p && p.name; }).slice(0, 10),
    note: String(j.note || '').slice(0, 40),
  };
}

// ---------------------------------------------------------------- 批量问人（精英判定用）
/** 批量判定：每块 chunk 人、**串行**执行（实测并发会互相拖慢甚至超时） */
async function batchLookup(names, company, opts) {
  const o = opts || {};
  const chunk = o.chunk || 4;
  const timeoutMs = o.timeoutMs || 60000;
  const list = (names || []).slice();
  const out = { used: false, results: {}, errors: [], chunks: 0 };
  if (!list.length) return out;
  const sys = '你是企业高管人物资料知识库。对每个人只输出 4 个字段：name（原样返回）、'
    + 'known（是否知名企业人物 true/false）、isBigTech（是否有知名大企业任职经历 true/false）、'
    + 'isProMention（是否有专业领域公开提及：专利/技术/专家/获奖 true/false）。'
    + '不要输出 title、background、reason 等任何其他字段。只输出 JSON。';
  for (let i = 0; i < list.length; i += chunk) {
    const block = list.slice(i, i + chunk);
    const user = '公司：' + (company || '') + '\n人物：' + JSON.stringify(block.map(function (n) { return { name: n }; }))
      + '\n输出：{"people":[{"name":"","known":false,"isBigTech":false,"isProMention":false}]}' + JSON_RULE;
    const r = await chatJSON([{ role: 'system', content: sys }, { role: 'user', content: user }],
      Object.assign({ temperature: 0.1 }, o, { timeoutMs: timeoutMs }));
    out.chunks += 1;
    if (!r.ok) { out.errors.push(r.error); continue; }
    out.used = true;
    ((r.json || {}).people || []).forEach(function (p) {
      if (p && p.name) out.results[p.name] = { known: !!p.known, isBigTech: !!p.isBigTech, isProMention: !!p.isProMention };
    });
  }
  return out;
}

module.exports = { aiConfig, resolveSdkPath, getCloud, chatJSON, JSON_RULE, knowledgePeople, extractPeople, registryFill, batchLookup };
