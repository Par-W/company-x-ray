'use strict';

// 精英人物搜索判定层：
// 对 buildProfile 产出的四类角色（法定代表人/董事长/大股东/核心成员）逐人执行精英背景核查：
//   标记1 大厂履历：报道/检索中「人名 + 履历词 + 大厂」共现，或现任企业本身即大企业
//   标记2 专业提及：公开网络中有专业领域提及（技术/专利/行业/专访/获奖等），或 ≥2 独立报道
// 数据来源限定：①互联网搜索（必应/百度）②企查查/天眼查/爱企查/腾讯自选股/水滴信用等线上渠道
//               ③线上完全查无资料时回退 Agent 内置人物知识库（KNOWN_PEOPLE_DB + AI 记忆库）
// 前提规则：双标记的资料必须来自上述渠道之一，线上与内置库均查无 → 明确标注"不判定为精英"

const _kbModule = require('./known-people');
const KNOWN_PEOPLE_DB = _kbModule.KNOWN_PEOPLE_DB || _kbModule;
const personSearch = require('./person-search');
// Agent 内置数据库兜底（静态库未命中 → WorkBuddy 云服务免密钥大模型批量查人）
// SDK 惰性加载，缺 SDK 时该通道静默失败，不影响主链路
const agentDb = require('./agent-db');

const BIG_COMPANIES = /(阿里巴巴|阿里|蚂蚁集团|腾讯|字节跳动|抖音|百度|华为|小米|美团|京东|拼多多|网易|滴滴|快手|携程|宁德时代|比亚迪|京东方|中芯国际|大疆|顺丰|隆基绿能|贵州茅台|五粮液|泸州老窖|农夫山泉|伊利|蒙牛|海天|格力|美的|海尔|三一重工|福耀玻璃|恒瑞医药|药明康德|迈瑞医疗|中国平安|招商银行|工商银行|建设银行|中信证券|微软|谷歌|Google|Apple|苹果|亚马逊|Meta|Facebook|OpenAI|英伟达|特斯拉|高通|台积电|三星|宝马|奔驰|丰田)/;
const CAREER_RE = /(曾就职|曾任职|前|出身|加入过|供职|来自于|来自|创始人|联合创始人|董事长|CEO|首席|总裁|总经理|合伙人|投资人|董事|高管|资深|专家|工程师|总监)/;
const PRO_RE = /(专利|技术|研发|论文|专家|行业|标准|专访|演讲|获奖|荣誉|获评|获选|出席|发表|评测|测评)/;

// 人物专属检索（百度优先——必应对人名查询易漂移到词典噪声）
async function searchPersonNews(personName, company) {
  const queries = company
    ? ['"' + personName + '" ' + company + ' 董事长 简历', '"' + personName + '" ' + company + ' 高管']
    : ['"' + personName + '" 简历 职务'];
  for (const q of queries) {
    try {
      const r = await personSearch.searchNewsBaidu(q, 7000);
      if (r && r.length > 0) return r.slice(0, 6);
    } catch (e) { /* 换下一个 query */ }
  }
  try {
    return (await personSearch.searchNewsBing('"' + personName + '" ' + (company || ''), 7000)).slice(0, 6);
  } catch (e) {
    return [];
  }
}

// 单人双标记判定
function judgePersonMarkers(name, newsTitles, dossierTitles, currentCompany) {
  const hitNews = (newsTitles || []).filter(function (t) { return t.includes(name); });
  const markers = [];

  // 标记1：大厂履历
  let m1 = { hit: false, reason: '未检索到「' + name + '」与大厂任职相关的公开记录' };
  const cur = String(currentCompany || '').trim();
  if (cur && BIG_COMPANIES.test(cur)) {
    m1 = { hit: true, reason: '「' + name + '」现任职于' + (cur.match(BIG_COMPANIES) || [''])[0] + '（现任企业属大企业，直接计为大厂履历）' };
  }
  if (!m1.hit) {
    const allTitles = hitNews.concat(dossierTitles || []);
    for (const t of allTitles) {
      if (BIG_COMPANIES.test(t) && CAREER_RE.test(t)) {
        m1 = { hit: true, reason: '「' + name + '」有' + (t.match(BIG_COMPANIES) || [''])[0] + '相关任职/履历报道（' + t.slice(0, 40) + '…）' };
        break;
      }
    }
  }
  markers.push({ id: 'big_tech', label: '大厂履历', hit: m1.hit, reason: m1.reason });

  // 标记2：专业提及（dossier 以人名为 query，标题无需再含人名）
  let m2 = { hit: false, reason: '公开网络中未检索到「' + name + '」的专业领域提及' };
  const proTitle = hitNews.find(function (t) { return t.includes(name) && PRO_RE.test(t); })
    || (dossierTitles || []).find(function (t) { return PRO_RE.test(t); });
  if (proTitle) {
    m2 = { hit: true, reason: '「' + name + '」有专业领域公开提及（' + proTitle.slice(0, 40) + '…）' };
  } else if ((dossierTitles || []).length >= 3) {
    // ≥3 条独立人物专属资料才计媒体存在感（2 条即达标会让所有高管都被判精英，稀释判定价值）
    m2 = { hit: true, reason: '「' + name + '」在人物专属检索中命中 ' + dossierTitles.length + ' 条独立资料（媒体存在感达标）' };
  }
  markers.push({ id: 'pro_mention', label: '专业提及', hit: m2.hit, reason: m2.reason });

  const both = markers.every(function (m) { return m.hit; });
  const onlineHit = hitNews.length > 0 || (dossierTitles || []).length > 0;
  const sources = [];
  if (hitNews.length > 0) sources.push('互联网新闻检索');
  if ((dossierTitles || []).length > 0) sources.push('人物专属联网检索');
  return { markers, isElite: both, onlineHit, onlineSources: sources };
}

// 由 Agent 数据库（静态库 / WorkBuddy 云服务大模型记忆）结果生成双标记判定
function judgeFromAgentDb(name, db) {
  const hit1 = !!(db && db.isBigTech === true);
  const hit2 = !!(db && db.isProMention === true);
  const known = !!(db && db.known && db.known.hit);
  return {
    markers: [
      {
        id: 'big_tech', label: '大厂履历', hit: hit1,
        reason: hit1
          ? 'Agent 数据库判定：「' + name + '」' + (db.bigTechReason || '有知名大企业任职经历')
          : 'Agent 数据库（静态库 + 大模型记忆）中未收录「' + name + '」的大厂任职记录'
      },
      {
        id: 'pro_mention', label: '专业提及', hit: hit2,
        reason: hit2
          ? 'Agent 数据库判定：「' + name + '」' + (db.proReason || '有专业领域公开提及')
          : 'Agent 数据库（静态库 + 大模型记忆）中未收录「' + name + '」的专业领域提及'
      }
    ],
    isElite: known && hit1 && hit2,
    onlineHit: false,
    onlineSources: [],
    dbFallback: true
  };
}

// 主入口：对 profile 结果做精英人物搜索判定
// profile: 公司档案（含 personnel / shareholders / reg.legalPerson / actualController / newsTitles）
// aiDossiers: { 人名: {position, background} } —— 由 AI 记忆库给出的人员，跳过联网检索直接走 Agent 数据库判定
async function searchElitePeople(profile, aiDossiers) {
  const company = profile.company;
  let newsTitles = Array.isArray(profile.newsTitles) ? profile.newsTitles : [];

  // ① 构建四类角色候选池
  const candidates = [];
  const seen = {};
  const addCandidate = function (name, role) {
    if (!name || seen[name]) return;
    seen[name] = true;
    candidates.push({ name, role });
  };

  // 法定代表人
  const lp = (profile.reg && profile.reg.legalPerson) || null;
  if (lp) addCandidate(lp, '法定代表人');
  // 董事长 + 核心成员
  for (const p of (profile.personnel || [])) {
    const role = /董事长/.test(p.position || '') ? '董事长' : (p.position || '核心成员');
    addCandidate(p.name, role);
  }
  // 大股东（自然人）
  for (const s of (profile.shareholders || [])) {
    if (isNatural(s.name)) addCandidate(s.name, '大股东' + (s.ratio != null ? '（持股 ' + s.ratio + '%）' : ''));
  }
  // 实际控制人
  if (profile.actualController && isNatural(profile.actualController)) {
    addCandidate(profile.actualController, '实际控制人');
  }

  // ② 逐人联网检索 + 双标记判定（静态库已收录 / AI 记忆库给出的人员跳过联网，直接走 Agent 数据库）
  const raws = [];
  const needDb = [];
  let kbFallbackUsed = false;
  for (const c of candidates.slice(0, 12)) {
    const inStaticKb = !!KNOWN_PEOPLE_DB[c.name];
    const hasAiDossier = !!(aiDossiers && aiDossiers[c.name]);
    const dossierTitles = [];
    if (!inStaticKb && !hasAiDossier) {
      try {
        const r = await searchPersonNews(c.name, company);
        for (const it of r) dossierTitles.push(it.title);
      } catch (e) { /* 检索失败不致命 */ }
    }

    const jm = judgePersonMarkers(c.name, newsTitles, dossierTitles, company);
    let agentDbFallback = false;
    let staticJm = null;

    // 兜底1：静态知识库精确命中（直接判精英，无需联网与大模型）
    if (inStaticKb) {
      const kb = KNOWN_PEOPLE_DB[c.name];
      agentDbFallback = true;
      kbFallbackUsed = true;
      staticJm = {
        markers: [
          { id: 'big_tech', label: '大厂履历', hit: true, reason: '互联网/工商渠道均未查到「' + c.name + '」资料，回退 Agent 内置数据库：「' + c.name + '」为' + kb.title },
          { id: 'pro_mention', label: '专业提及', hit: true, reason: 'Agent 内置数据库收录（' + kb.background.slice(0, 50) + '）' }
        ],
        isElite: true,
        onlineHit: false,
        onlineSources: []
      };
    }

    // 兜底2：线上查无资料，或该人来自 AI 记忆库 → 交给 Agent 数据库（大模型批量查人）
    const toDb = !inStaticKb && (hasAiDossier || !jm.onlineHit);
    if (toDb) needDb.push(c.name);

    raws.push({ c: c, jm: jm, staticJm: staticJm, agentDbFallback: agentDbFallback, toDb: toDb, hasAiDossier: hasAiDossier });
  }

  // ③ Agent 数据库批量兜底（WorkBuddy 云服务免密钥大模型，一次调用判定全部待查人员）
  let dbMap = {};
  if (needDb.length > 0) {
    try {
      const batch = await agentDb.lookupPeopleBatch(needDb, company);
      dbMap = (batch && batch.results) || {};
      if (Object.keys(dbMap).length > 0) kbFallbackUsed = true;
    } catch (e) { dbMap = {}; }
  }

  // ④ 合成最终人员结果
  const people = [];
  for (const rw of raws) {
    const c = rw.c;
    let jm = rw.staticJm || rw.jm;
    let agentDbFallback = rw.agentDbFallback;

    if (rw.toDb) {
      const db = dbMap[c.name];
      if (db && db.known && db.known.hit) {
        agentDbFallback = true;
        jm = judgeFromAgentDb(c.name, db);
      } else {
        const msg = rw.hasAiDossier
          ? '该人来自 AI 记忆库，Agent 数据库（静态库 + 大模型记忆）亦未收录其背景——按规则不判定为精英（不排除信息未公开）'
          : '互联网及各工商数据渠道均未检索到该人资料，Agent 内置数据库与大模型记忆库亦无记录——按规则不判定为精英（不排除信息未公开）';
        jm = Object.assign({}, rw.jm, {
          markers: rw.jm.markers.map(function (m) { return Object.assign({}, m, { hit: false, reason: msg }); }),
          isElite: false
        });
      }
    }

    people.push({
      name: c.name,
      role: c.role,
      markers: jm.markers,
      isElite: jm.isElite,
      onlineHit: jm.onlineHit,
      onlineSources: jm.onlineSources || [],
      agentDbFallback,
      type: jm.isElite ? (agentDbFallback ? '精英人物（线上查无资料·Agent数据库判定）' : '精英人物（双标记齐全·线上渠道）') : (jm.onlineHit ? '未集齐双标记' : '线上与内置库均无资料'),
      reason: jm.markers.map(function (m) { return m.label + (m.hit ? '✔' : '✘') + '：' + m.reason; }).join('；')
    });
  }

  const anyElite = people.some(function (p) { return p.isElite; });
  return {
    searched: true,
    people,
    isElite: anyElite,
    source: anyElite ? (kbFallbackUsed ? '工商角色逐人比对 + Agent数据库兜底' : '公开报道逐人双标记比对') : '双标记未命中',
    reason: anyElite
      ? '以下人员集齐「大厂履历 + 专业提及」双标记：' + people.filter(function (p) { return p.isElite; }).map(function (p) { return p.name + '（' + p.role + '）'; }).join('、')
      : '董事长/法人/大股东/核心成员均未集齐双标记（判定前提：资料须来自互联网搜索或各工商数据线上渠道；线上查无时回退 Agent 内置数据库；仍未命中则不判定）',
    eliteCount: people.filter(function (p) { return p.isElite; }).length
  };
}

function isNatural(name) {
  if (!name) return false;
  if (!/^[\u4e00-\u9fa5]{2,4}$/.test(String(name).trim())) return false;
  return !/(公司|企业|中心|基金|资本|投资|证券|银行|保险|信托|合伙|集团|控股|管理|咨询|工作室|研究所|产品|账户|计划|组合|结算)/.test(name);
}

module.exports = { searchElitePeople, judgePersonMarkers, KNOWN_PEOPLE_DB };
