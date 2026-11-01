'use strict';

// 总编排：MCP 三源 + 兜底 → 最终档案

const agg = require('./aggregator');
const fb = require('./fallback');
const mcp = require('./mcp');
const ai = require('./ai-fallback');
const aiPeople = require('./ai-people');

async function buildProfile(company) {
  const t0 = Date.now();
  const name = String(company || '').trim();
  if (!name) return { ok: false, error: '请填写公司名称' };

  // 1) MCP 三源
  const { sources, merged } = await agg.fetchAll(name);
  const cfgStatus = mcp.configStatus();

  // 2) 兜底：A股 东财 F10（股东/高管/实控人）
  let emUsed = false;
  if (!merged.shareholders.length || !merged.personnel.length) {
    const stock = await fb.searchStockCode(name);
    if (stock) {
      const tasks = [];
      if (!merged.shareholders.length) tasks.push(fb.fetchEmShareholders(stock.code));
      if (!merged.personnel.length) tasks.push(fb.fetchEmManagers(stock.code));
      const rs = await Promise.allSettled(tasks);
      let idx = 0;
      if (!merged.shareholders.length) {
        const r = rs[idx++];
        if (r.status === 'fulfilled' && r.value.shareholders.length) {
          merged.shareholders = r.value.shareholders;
          merged.shareholderSource = '东方财富F10';
          merged.shareholderEndDate = r.value.endDate;
          if (!merged.actualController && r.value.actualController) {
            merged.actualController = r.value.actualController;
            merged.controllerSource = '东方财富F10';
          }
          emUsed = true;
        }
      }
      if (!merged.personnel.length) {
        const r = rs[idx++];
        if (r.status === 'fulfilled' && r.value.personnel.length) {
          merged.personnel = r.value.personnel.map(function (p) {
            return { name: p.name, position: p.position || '主要人员', sources: ['东方财富F10'], tenure: p.tenure || '', resume: p.resume || '' };
          });
          if (!merged.reg || !merged.reg.legalPerson) {
            if (!merged.reg) merged.reg = {};
            merged.reg.legalPerson = merged.reg.legalPerson || r.value.legalPerson;
            if (!merged.regSource && r.value.legalPerson) merged.regSource = '东方财富F10';
          }
          emUsed = true;
        }
      }
      sources.push({ key: 'em', name: '东方财富F10（免登录兜底）', available: true, ok: emUsed, channels: [{ source: '东方财富F10', tool: 'shareholders+managers', status: emUsed ? 'ok' : 'failed' }] });
    }
  }

  // 3) 法定代表人兜底：必应公开索引
  if (!merged.reg || !merged.reg.legalPerson) {
    const lp = await fb.searchLegalPersonBing(name);
    if (lp) {
      if (!merged.reg) merged.reg = {};
      merged.reg.legalPerson = lp;
      merged.regSource = merged.regSource || '必应公开索引';
    }
  }

  // 3.5) [整合新增] 本项目已复核事实库 + AI 抽取（人类反馈：蜜雪冰城一个人员都查不到）
  //   原链路只有「企查查MCP → 东财F10(仅A股) → 必应索引 → WorkBuddy云AI(硬编码路径，本机不可用)」，
  //   港股/非上市一律为空。这里补两级、且都遵守"不编造"：
  //     ① 本项目已复核事实库（离线、团队逐条核对、备注里含法人代表）
  //     ② AI 抽取：只从**真实抓取到的公开片段**里抽人，抽不到就返回空
  let localFacts = null;
  let aiPeopleInfo = null;
  if (!merged.personnel.length || !(merged.reg && merged.reg.legalPerson)) {
    const local = aiPeople.fromLocalLibrary(name);
    if (local) {
      localFacts = local.facts;
      if (!merged.personnel.length && local.people.length) {
        merged.personnel = local.people.map(function (p) {
          return { name: p.name, position: p.position, sources: [p.source], tenure: '', resume: '' };
        });
        merged.personnelSource = local.source;
      }
      if (!merged.reg) {
        const lp = local.people.find(function (p) { return /法定代表人/.test(p.position); });
        if (lp) { merged.reg = { legalPerson: lp.name }; merged.regSource = local.source; }
      }
    }
  }
  if (!merged.personnel.length) {
    try {
      const queries = [name + ' 法定代表人 董事长 是谁', name + ' 高管 股东 创始人', name + ' 工商 法人'];
      const urls = [];
      queries.forEach(function (q) {
        urls.push('https://www.bing.com/search?q=' + encodeURIComponent(q) + '&setlang=zh-CN');
      });
      urls.push('https://www.baidu.com/s?wd=' + encodeURIComponent(name + ' 法定代表人'));
      const pages = await Promise.allSettled(urls.map(function (u) { return fb.fetchText(u, 9000); }));
      const snippets = [];
      pages.forEach(function (r, i) {
        if (r.status !== 'fulfilled' || !r.value) return;
        const strip = String(r.value).replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
        if (!strip) return;
        // 切成 400 字窗口：整页压成一大坨时模型很难定位"人名+职务"，切片后命中率明显更高
        const src = i < queries.length ? '必应' : '百度';
        for (let p = 0; p < strip.length && snippets.length < 24; p += 400) {
          const seg = strip.slice(p, p + 480).trim();
          if (seg.length < 80) continue;
          if (!/法定代表人|董事长|创始人|总经理|执行董事|股东|CEO|法人/.test(seg)) continue;
          snippets.push({ title: src + '检索片段', snippet: seg, url: '' });
        }
      });
      const aiP = await aiPeople.aiExtractPeople(name, snippets);
      aiPeopleInfo = {
        used: !!(aiP.ok && aiP.people && aiP.people.length),
        model: aiP.model || null,
        error: aiP.error || null,
        snippetCount: snippets.length,
        note: 'AI 只从抓取到的公开片段里抽取人员，不凭记忆生成；可能不完整，请点来源链接核对。'
      };
      if (aiPeopleInfo.used) {
        merged.personnel = aiP.people.map(function (p) {
          return {
            name: p.name,
            position: p.position || '（片段中出现的人员）',
            sources: ['AI 从公开报道抽取（片段 ' + (p.ref || '?') + '）'],
            tenure: '', resume: p.evidence ? ('片段原文：' + String(p.evidence).slice(0, 120)) : ''
          };
        });
        merged.personnelSource = 'AI 从公开报道抽取';
      }
    } catch (e) {
      aiPeopleInfo = { used: false, error: String(e && e.message || e), snippetCount: 0 };
    }
  }

  // 3.6) [整合新增] AI 知识补全（人类授权：允许 AI 用自己的知识填人员，但必须显式标注 AI）
  //   与上一级的区别：上一级只准从抓到的片段抽；这一级允许用模型自身知识，故逐人给置信度、
  //   禁止编造精确数字，前端会显著标注「AI」并提示"可能过时，请自行核对"。
  let aiKnowledgeInfo = null;
  if (!merged.personnel.length || !(merged.reg && merged.reg.legalPerson)) {
    const official = (localFacts || []).find(function (f) { return f[0] === '官方主体'; });
    try {
      const kn = await aiPeople.aiKnowledgePeople(name, official ? official[1] : '');
      aiKnowledgeInfo = {
        used: !!(kn.ok && kn.people && kn.people.length),
        model: kn.model || null,
        error: kn.error || null,
        companyGuess: kn.companyGuess || '',
        disclaimer: '以下人员由 AI 依据自身知识给出（非实时接口），**可能过时或不完整**，请点右侧「查事迹 / 官方核对」按钮自行验证。'
      };
      if (aiKnowledgeInfo.used) {
        const conf = { high: '把握较高', medium: '把握中等', low: '把握较低' };
        merged.personnel = kn.people.map(function (p) {
          return {
            name: p.name,
            position: p.position + (p.holding ? ('（持股 ' + p.holding + '）') : ''),
            sources: ['AI 知识（' + (conf[p.confidence] || p.confidence) + '）' + (p.basis ? '：' + p.basis : '')],
            tenure: '', resume: '', aiKnowledge: true, confidence: p.confidence
          };
        });
        merged.personnelSource = 'AI 知识（可能过时，需自行核对）';
      }
    } catch (e) {
      aiKnowledgeInfo = { used: false, error: String(e && e.message || e) };
    }
  }

  // 4) AI 记忆库兜底（第四级）：联网渠道全面落空时，调大模型自身知识补档
  //    触发条件：无登记信息 且 无人员 且 无股东（即前面所有渠道都没拿到实质数据）
  let aiResult = null;
  const hasData = (merged.reg && merged.reg.legalPerson) || merged.personnel.length > 0 || merged.shareholders.length > 0;
  if (!hasData) {
    aiResult = await ai.aiFallback(name);
    if (aiResult.used) {
      if (!merged.reg && aiResult.reg) {
        merged.reg = aiResult.reg;
        merged.regSource = 'AI 记忆库';
      }
      if (!merged.actualController && aiResult.actualController) {
        merged.actualController = aiResult.actualController;
        merged.controllerSource = 'AI 记忆库';
      }
      if (!merged.shareholders.length && aiResult.shareholders.length) {
        merged.shareholders = aiResult.shareholders;
        merged.shareholderSource = 'AI 记忆库';
      }
      if (!merged.personnel.length && aiResult.personnel.length) {
        merged.personnel = aiResult.personnel;
      }
      // AI 补充的董事长：若人员列表中无人带"董事长"头衔则前置插入
      if (aiResult.chairman && !merged.personnel.some(function (p) { return /董事长/.test(p.position); })) {
        merged.personnel.unshift({ name: aiResult.chairman, position: '董事长（AI 记忆库）', sources: ['AI 记忆库'], tenure: '', resume: '' });
      }
    }
  }

  // 汇总渠道状态
  const channels = [];
  for (const s of sources) {
    for (const c of (s.channels || [])) channels.push(c);
  }

  // [整合修正] 空结果必须解释清楚，不能静默返回空
  //  实测：查「蜜雪冰城」时 reg/shareholders/personnel 全为空，但仍返回 ok:true，
  //  用户看到白页却不知道原因。根因：本模块的数据源是**东方财富 F10，只覆盖 A 股上市公司**，
  //  蜜雪冰城是港股、非 A 股，因此匹配不到。这里显式给出 noData 与原因，绝不假装查到了。
  const hasAny = !!(merged.reg || (merged.shareholders && merged.shareholders.length)
    || (merged.personnel && merged.personnel.length) || merged.actualController);
  const channelsTried = channels.map((c) => (c && (c.source || c.name)) ? ((c.source || c.name) + '[' + (c.status || '?') + ']') : '').filter(Boolean);
  let reason = '';
  if (!hasAny) {
    const chain = [
      '企查查 MCP（' + (cfgStatus ? '已配置' : '未配置') + '）',
      '东方财富 F10 / 行情搜索（仅覆盖 A 股上市公司）',
      '本项目已复核事实库（未收录该名称）',
      '必应 + 百度检索片段 → AI 抽取（未抽到"人名+职务"，AI 不凭记忆生成）',
    ];
    reason = '本模块依次尝试了：' + chain.join(' → ') + '，都没有拿到可用的人员信息。'
      + '这不代表该企业有问题，只说明本模块目前覆盖不到它。请用下方官方入口自查'
      + '（国家企业信用信息公示系统可查法定代表人/主要人员；港股/美股公司可查交易所披露文件）。';
  }

  return {
    ok: true,
    company: name,
    noData: !hasAny,
    noDataReason: reason || null,
    listedOnly: true,
    coverageNote: '数据源：东方财富 F10 / 行情搜索（A 股）；企查查 MCP 未配置；爱企查常被安全验证拦截。',
    channelsTried,
    reg: merged.reg,
    regSource: merged.regSource || null,
    actualController: merged.actualController,
    controllerSource: merged.controllerSource || null,
    shareholders: merged.shareholders,
    shareholderSource: merged.shareholderSource || null,
    shareholderEndDate: merged.shareholderEndDate || null,
    personnel: merged.personnel,
    personnelSource: merged.personnelSource || null,
    localFacts: localFacts,
    aiPeople: aiPeopleInfo,
    aiKnowledge: aiKnowledgeInfo,
    channels,
    aiFallback: aiResult ? {
      used: aiResult.used,
      note: aiResult.note || '',
      error: aiResult.error || null
    } : null,
    mcpConfigured: cfgStatus,
    elapsedMs: Date.now() - t0,
    analyzedAt: new Date().toISOString()
  };
}

module.exports = { buildProfile };
