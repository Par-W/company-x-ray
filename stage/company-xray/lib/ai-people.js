'use strict';
// [整合] 人员透视的人员补全模块 —— 现在只是**共享 AI 模块的薄壳**（人类选 B：两个子应用共用一个）
//
// 共享实现在 front/stage/shared/ai.js（密钥解析、严格 JSON 提示词、截断识别、批量分块等都在那里）。
// 本文件保留两件"只属于人员透视"的事：
//   ① fromLocalLibrary()：读本项目「已复核事实库」（backend/data/brands.json / entities.json），
//      这是**离线、团队逐条核对过**的事实，优先级最高，命中就不必调用 AI；
//   ② 保持导出接口不变，profile.js 无需改动。
//
// 诚实口径：AI 产出必须带 AI 标记与置信度；片段抽取只准引用片段原文，抽不到就返回空。

const fs = require('fs');
const path = require('path');
const shared = require('../../shared/ai');

const BRANDS = path.join(__dirname, '..', '..', '..', '..', 'backend', 'data', 'brands.json');
const ENTITIES = path.join(__dirname, '..', '..', '..', '..', 'backend', 'data', 'entities.json');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

/** ① 本项目已复核事实库：官方主体、备案号，以及备注里的法人代表（团队逐条核对过） */
function fromLocalLibrary(name) {
  const raw = String(name || '').replace(/\s/g, '');
  if (!raw) return null;
  const brands = readJson(BRANDS) || [];
  const hit = brands.find(function (b) {
    const bn = String(b['品牌名'] || '').replace(/\s/g, '');
    const en = String(b['官方主体'] || '').replace(/\s/g, '');
    return (bn && (bn.includes(raw) || raw.includes(bn))) || (en && (en.includes(raw) || raw.includes(en)));
  });
  const entities = readJson(ENTITIES) || [];
  const ent = entities.find(function (e) {
    const cn = String(e['公司名'] || '').replace(/\s/g, '');
    return cn && (cn.includes(raw) || raw.includes(cn));
  });
  if (!hit && !ent) return null;

  const people = [];
  const note = (hit && hit['_备注']) || '';
  const lp = /法人代表\s*([^\s；;，,。]+)/.exec(note);
  if (lp) people.push({ name: lp[1], position: '法定代表人', source: '本项目已复核事实库（商务部备案页等）' });
  const facts = [];
  const official = (hit && hit['官方主体']) || (ent && ent['公司名']) || '';
  if (official) facts.push(['官方主体', official]);
  if (hit && hit['备案编号']) facts.push(['特许经营备案编号', hit['备案编号']]);
  if (hit && hit['商标持有人']) facts.push(['商标持有人', hit['商标持有人']]);
  if (hit && hit['ICP主体']) facts.push(['ICP主体', hit['ICP主体']]);
  if (hit && hit['官网域名']) facts.push(['官网域名', hit['官网域名']]);
  if (ent && ent['成立日']) facts.push(['成立日期', ent['成立日']]);
  if (ent && ent['状态']) facts.push(['登记状态', ent['状态']]);
  if (hit && hit['复核状态']) facts.push(['复核状态', hit['复核状态']]);
  return { people: people, facts: facts, source: '本项目已复核事实库（离线，含官方来源链接）' };
}

/** ② AI 知识补全（允许模型用自身知识，逐人给置信度；具体实现在共享模块） */
async function aiKnowledgePeople(company, hintOfficial) {
  const r = await shared.knowledgePeople(company, hintOfficial);
  return { ok: r.ok, people: r.people || [], model: r.model || null, error: r.error || null, companyGuess: r.companyGuess || '' };
}

/** ③ AI 从公开片段抽取（只准引用片段，抽不到返回空） */
async function aiExtractPeople(company, snippets) {
  const r = await shared.extractPeople(company, snippets);
  return { ok: r.ok, people: r.people || [], model: r.model || null, error: r.error || null, raw: '' };
}

module.exports = {
  aiConfig: shared.aiConfig,          // 密钥/地址解析也统一走共享模块（含 SDK 路径可配置）
  fromLocalLibrary: fromLocalLibrary,
  aiExtractPeople: aiExtractPeople,
  aiKnowledgePeople: aiKnowledgePeople,
};
