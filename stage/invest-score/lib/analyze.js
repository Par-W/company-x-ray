'use strict';

const { scoreCompany, DIM_LABELS } = require('./scoring');
const { buildReport } = require('./report');
const { searchElitePeople } = require('./elite-search');
const { findSeed } = require('./seed');
const topicsLib = require('./topics');
const src = require('./sources');
const registry = require('./registry');
const { assessStock } = require('./stockAssess');
const caliber = require('./caliber');
const { fetchTrust } = require('./trust');
const disclosure = require('./disclosure');
const secEdgar = require('./sec-edgar');

// 通道 key → 人话（口径文件里的 label，不在代码里另写一份）
function channelLabel(key) {
  const c = caliber.CHANNELS.find(function (x) { return x.key === key; });
  return c ? c.label : key;
}

async function analyze({ company, legalPerson, type }) {
  const t0 = Date.now();
  const companyTrim = String(company || '').trim();
  const lpTrim = String(legalPerson || '').trim();
  const isListed = type !== 'unlisted';
  const channels = [];
  const dataNotes = [];

  // 1) 上市公司：行情搜索确认代码
  let stock = null;
  if (isListed) {
    stock = await src.searchStockCode(companyTrim);
    channels.push(stock
      ? { name: '东方财富·行情搜索', status: 'ok', note: '命中 ' + stock.code + ' ' + stock.shortName }
      : { name: '东方财富·行情搜索', status: 'empty', note: '未匹配到 A 股代码' });
  }

  // 1.5) 交易所披露（巨潮资讯）—— 立刻发起，与后面的取数并行跑。
  //      它要翻页翻满时间窗（2~3 秒），串在后面白等；而它决定的「诉讼 / 团队」两维
  //      恰恰是之前唯一没有任何真实来源的两维。
  const discP = (stock && stock.code)
    ? disclosure.fetchDisclosures(
      { code: stock.code, name: stock.shortName || companyTrim },
      { months: 24 }
    ).catch(function (e) {
      return { status: 'failed', note: '披露检索异常：' + String((e && e.message) || '').slice(0, 60) };
    })
    : Promise.resolve(null);

  // 1.6) 美股另有 SEC 的 8-K 事项（高管变动）—— 同样并行发起
  const officerP = (stock && stock.market === 'us')
    ? secEdgar.fetchOfficerChanges(stock.code, 24).catch(function () { return null; })
    : Promise.resolve(null);

  // 2) 财务数据（东方财富）+ 现价佐证：A股走 F10 三表；港股/美股走东财 datacenter HK/US F10 + 腾讯行情
  //    美股额外并行拉 SEC EDGAR 的 XBRL：东财海外只给 7 个字段（没有研发/销售/管理费用、
  //    应收账款、现金流、同比），而这几项恰好是「技术壁垒」「客户质量」「行业前景」三维的原料 ——
  //    实测阿里巴巴因此 5/10 维未评分。SEC 把同样的数字按 XBRL 结构化公开，免费无 key。
  let finance = null;
  let quote = null;
  if (isListed && stock) {
    const isA = stock.market === 'sh' || stock.market === 'sz' || stock.market === 'bj';
    const isUS = stock.market === 'us';
    const finP = isA ? src.fetchFinance(stock.code) : src.fetchFinanceOverseas(stock);
    const secP = isUS
      ? secEdgar.fetchSecFinance(stock.code).catch(function () { return null; })
      : Promise.resolve(null);
    const [fin, qt, secFin] = await Promise.allSettled([finP, src.fetchQuote(src.toQuoteCode(stock)), secP]);
    if (fin.status === 'fulfilled') finance = fin.value;
    if (qt.status === 'fulfilled') quote = qt.value;
    const secData = secFin.status === 'fulfilled' ? secFin.value : null;
    // 东财海外对部分美股（如 AAPL）根本不返回数据；这时 SEC 不是"补充"而是**唯一来源**，
    // 不能因为 finance 为空就跳过合并 —— 那会让一家财报齐全的公司十维全空。
    let filledBySec = [];
    if (secData) {
      const baseFin = finance || { market: 'us', source: 'SEC EDGAR XBRL' };
      const merged = secEdgar.mergeInto(baseFin, secData);
      filledBySec = merged.secFilled || [];
      finance = merged;
    }
    if (!isA) {
      // 美股财报币种可能是 USD，行情接口返回里带币种标注（部分在 parts 内），财务打分是比率制不受币种影响
      channels.push(finance
        ? { name: '东方财富·财务报表（' + (stock.market === 'hk' ? '港股' : '美股') + ' F10）', status: 'ok', note: '获取到 ' + (finance.reportDate || '最新') + ' 报告期数据' }
        : { name: '东方财富·财务报表（' + (stock.market === 'hk' ? '港股' : '美股') + ' F10）', status: 'empty', note: '未获取到该股票财务数据，财务维度按中性分处理' });
      if (isUS) {
        channels.push(secData
          ? { name: 'SEC EDGAR·XBRL 财报', status: 'ok',
            note: '补充 ' + filledBySec.length + ' 项东财未返回的科目（'
              + (filledBySec.slice(0, 5).join('、') || '—') + '），报告期 ' + (secData.reportDate || '—') }
          : { name: 'SEC EDGAR·XBRL 财报', status: 'empty', note: '未取到该公司的 XBRL 事实（可能非 SEC 注册发行人）' });
        if (filledBySec.length) {
          dataNotes.push('美股财报已用 SEC EDGAR 的 XBRL 数据补齐 ' + filledBySec.length + ' 项科目：'
            + filledBySec.join('、') + '（东财海外 F10 不含这些字段）。');
        }
      }
      if (finance) dataNotes.push('该公司为' + (stock.market === 'hk' ? '港股' : '美股') + '上市公司（' + stock.code + '），财务数据来自东方财富海外 F10 通道；比率为无量纲比值，不受报告币种影响。');
      else dataNotes.push('注意：该公司为' + (stock.market === 'hk' ? '港股' : '美股') + '上市公司（' + stock.code + '），海外 F10 未返回其财务数据，财务相关维度按中性分 50 处理。');
    } else {
      channels.push(finance
        ? { name: '东方财富·财务报表', status: 'ok', note: '获取到 ' + (finance.reportDate || '最新') + ' 报告期数据' }
        : { name: '东方财富·财务报表', status: 'failed', note: '接口不可达' });
    }
    channels.push(quote
      ? { name: '腾讯行情·现价', status: 'ok', note: '现价 ' + quote.price + '（' + (quote.date || '') + '）' }
      : { name: '腾讯行情·现价', status: 'failed', note: '不可达' });
  }

  // 2.5) 股票投资评估（知识规则引擎：估值 PE/PB + 52周位置 + 现金流质量 → 股票判断）
  let stockAssessment = null;
  if (isListed && stock && quote) {
    const finScoredForStock = finance ? src.financeFromData(finance) : null;
    stockAssessment = assessStock({ quote, finance, financeScored: finScoredForStock, stock });
    channels.push({
      name: '股票投资评估（知识规则）', status: stockAssessment.applicable ? 'ok' : 'empty',
      note: stockAssessment.applicable
        ? '估值分 ' + stockAssessment.valuationScore + ' / 股票综合 ' + stockAssessment.stockScore + ' → ' + (stockAssessment.verdict ? stockAssessment.verdict.label : '—')
        : '行情数据不足，跳过股票评估'
    });
  }

  // 3) 工商与股权信息（三级数据源：MCP Connector → 东财F10 → 公开索引）
  const reg = await registry.fetchRegistry({ company: companyTrim, stock });
  channels.push.apply(channels, reg.channels);
  for (const n of reg.notes) dataNotes.push(n);
  let profile = null;
  if (!reg.reg || !reg.reg.legalPerson) {
    // MCP/F10 均未拿到法定代表人 → 公开索引兜底核验
    profile = await src.fetchCompanyProfile(companyTrim, lpTrim);
    for (const c of profile.channels) channels.push(c);
    if (profile.legalPersonConfirmed) {
      if (!reg.reg) reg.reg = { legalPerson: profile.legalPersonConfirmed, creditNo: null, regCapital: null, establishDate: null, status: null, companyType: null, authority: null };
      else reg.reg.legalPerson = reg.reg.legalPerson || profile.legalPersonConfirmed;
      dataNotes.push('法定代表人经公开搜索索引交叉核验为「' + profile.legalPersonConfirmed + '」。');
    }
  }
  if (reg.reg && reg.reg.legalPerson && lpTrim && lpTrim !== reg.reg.legalPerson) {
    reg.legalPersonMismatch = true;
  }
  if (reg.legalPersonMismatch) {
    dataNotes.push('注意：工商登记的法定代表人与您填写的不一致（登记为「' + reg.reg.legalPerson + '」），请人工核实。');
  }

  // 4) 新闻检索：公司主查 + 法人关联查（并行）；港/美股补一查"中文名+股票代码"提高召回
  const queries = isListed
    ? [companyTrim, companyTrim + ' 专利 诉讼', companyTrim + ' 中标 合作']
    : [companyTrim + (lpTrim ? ' ' + lpTrim : ''), companyTrim + ' 融资', companyTrim + ' 诉讼 纠纷'];
  if (isListed && stock && (stock.market === 'hk' || stock.market === 'us')) {
    queries.push(stock.shortName + ' ' + (stock.market === 'hk' ? '港股' : stock.code));
  }
  const newsResults = await Promise.allSettled(queries.map(function (q) { return src.searchNews(q); }));
  let news = [];
  newsResults.forEach(function (r, i) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      news = news.concat(r.value.map(function (n) { return Object.assign({ q: queries[i] }, n); }));
    }
  });
  channels.push(news.length > 0
    ? { name: '必应新闻检索', status: 'ok', note: '获取 ' + news.length + ' 条公开报道' }
    : { name: '必应新闻检索', status: 'empty', note: '未获取到有效报道' });

  const { signals: newsSignals } = src.newsToSignals(news);

  // 5) 演示库兜底
  const seed = findSeed(companyTrim, type);
  const usingSeed = !!seed;
  if (usingSeed) {
    dataNotes.push('部分维度取自内置演示数据（联网渠道对该公司的覆盖有限），页面已按演示模式标注。');
  }

  // 6) 维度合成：财务实数 → 新闻修正 → 演示库 → 缺省中性 50
  const DIM_KEYS = ['industry', 'team', 'tech', 'product', 'cost', 'management', 'customers', 'brand', 'finance', 'litigation'];
  let dims = {};
  // ⚠ 不再预填 50：以前十维全部先给 50，等于"没查到数据的维度全部按中性参与加权"，
  //   于是任何查不到东西的公司都会得到"50 分上下"的假结论（华为十维全空 → 51 分
  //   →"目前看来并不是非常适合投资"）。没依据的维度就该不参与加权，标"未评分"。
  const baseDims = {};

  // 每一维的分数从哪来 —— 报告要逐条交代出处，读者才能自己核对（不给"凭空 50 分"含糊过去）
  const dimTrace = {};
  for (const k of DIM_KEYS) {
    dimTrace[k] = { source: '无公开数据', newsHits: 0, newsDelta: 0 };
  }

  const finScored = finance ? src.financeFromData(finance) : null;
  if (finScored) {
    // 财报口径能算出来的维度全都算（v2.2.1 起是 8 维：财务/管理/成本/技术/产品力/客户质量/行业前景/品牌）。
    // 以前只算 3 维，其余 5 维靠新闻标题里的关键词加减 —— 那不是"查出来的"。
    for (const k of (finScored.computed || [])) {
      baseDims[k] = finScored[k];
      dimTrace[k].source = '财报指标计算';
    }
    for (const s of finScored.signals) dataNotes.push('财务信号：' + s);
  }

  // 5.5) 交易所披露 → 诉讼 / 团队两维（一手来源，优先于演示样本与新闻）
  //      为什么这两维只能靠它：诉讼与高管变动都是**强制披露**事项，
  //      「公告里没有」才有信息量；「新闻里没有」只说明没人写。
  const disc = await discP;
  const teamWhy = [];
  const litWhy = [];   // 诉讼维度的依据单独走一路（报告页 litWhy 读它）
  if (disc) {
    if (disc.channel) {
      channels.push(disc.channel);
    } else {
      channels.push({
        name: disc.market === 'hkex' ? '港交所披露易·交易所公告' : '巨潮资讯·交易所披露',
        status: disc.status === 'unsupported' ? 'skipped' : 'empty',
        note: disc.note || '未取得披露数据'
      });
    }
    for (const f of disc.flags || []) dataNotes.push('披露提示：' + f);
    if (disc.status === 'ok' && !disc.complete) {
      dataNotes.push('披露覆盖不完整（实际覆盖 ' + (disc.earliest || '?') + ' 起），'
        + '所以「未见诉讼公告」只能说明翻到的这段时间里没有，不等于历史无诉讼。');
    }

    const litRes = disclosure.litigationScore(disc);
    if (litRes && typeof litRes.score === 'number') {
      baseDims.litigation = litRes.score;
      dimTrace.litigation.source = '交易所披露';
      // 诉讼维度的依据要进报告：分级扣分的每一档都必须可回指到公告。
      if (litRes.why && litRes.why.length) {
        litWhy.push.apply(litWhy, litRes.why);
      }
    }
    const teamRes = disclosure.teamScore(reg.personnel, disc, reg.survey);
    if (teamRes && typeof teamRes.score === 'number') {
      baseDims.team = teamRes.score;
      // 依据跟着证据走：没有公告数据时只能标成人员名单，不能冒充有官方原文
      dimTrace.team.source = teamRes.basis || '交易所披露';
      if (teamRes.why.length) {
        for (const w of teamRes.why) teamWhy.push(w);
        dataNotes.push('团队与治理：' + teamRes.why.join('；') + '。');
      }
    }
  }

  // 5.6) 美股：巨潮/港交所都不覆盖，但 SEC 的 8-K Item 5.02 是"高管变动"的结构化披露。
  //      只对**美国本土申报人**有效 —— 中概股报 6-K，没有事项编码（applicable=false），
  //      这时不能说"没有高管变动"，只能说这套口径不适用。
  if (stock && stock.market === 'us' && (!disc || disc.status !== 'ok')) {
    const chg = await officerP;
    if (chg && chg.applicable) {
      channels.push({
        name: 'SEC EDGAR·8-K 事项',
        status: 'ok',
        note: '近 24 个月 ' + chg.count + ' 条 Item 5.02（董事/高管变动披露）'
      });
      const fake = {
        status: 'ok',
        months: 24,
        cats: { management: { label: '高管与治理变动', count: chg.count, items: chg.items } }
      };
      const tr = disclosure.teamScore(reg.personnel, fake);
      if (tr && typeof tr.score === 'number') {
        baseDims.team = tr.score;
        dimTrace.team.source = '交易所披露';   // SEC 8-K 属于交易所/监管披露，同为 verified 档
        for (const w of tr.why) teamWhy.push(w);
        dataNotes.push('团队与治理（SEC 8-K）：' + tr.why.join('；') + '。');
      }
    } else if (chg) {
      channels.push({
        name: 'SEC EDGAR·8-K 事项',
        status: 'skipped',
        note: '该发行人以 6-K 申报（外国私人发行人），无 8-K 事项编码，高管变动无法结构化核对'
      });
    }
  }

  // 演示库基线：仅当**这一维还没有真实来源**时才允许覆盖，
  // 避免真实数据被演示设定静默覆盖（保证真实来源优先级最高）。
  if (seed) {
    for (const k of Object.keys(seed.dims)) {
      const cur = dimTrace[k] && dimTrace[k].source;
      if (cur && cur !== '无公开数据' && cur !== '缺省中性') continue;
      baseDims[k] = seed.dims[k];
      dimTrace[k].source = '内置演示样本';
    }
  }

  // 新闻信号：只做"微调"，不再由一条新闻标题定义一个维度。
  //   • 有财报依据的维度：新闻要 **2 条同方向**才动分，且只动 ±3（硬数据优先）
  //   • 没有依据的维度：新闻是唯一线索，同样要 2 条同向才给分，基准仍是中性、上限 ±12
  //   • 凑不到 2 条同向 → 这一维不参与加权（宁可不评分，也不拿一条标题定生死）
  dims = Object.assign({}, baseDims);
  const newsByDim = {};
  newsSignals.forEach(function (sg) {
    (newsByDim[sg.dim] = newsByDim[sg.dim] || []).push(sg);
  });
  const clampDim = function (x) { return Math.max(5, Math.min(98, Math.round(x))); };
  for (const k of DIM_KEYS) {
    const list = newsByDim[k] || [];
    if (!list.length) continue;
    const pos = list.filter(function (s) { return s.positive; }).length;
    const neg = list.length - pos;
    const tr = dimTrace[k];
    // 硬依据 = 财报实数或交易所公告。这两类都是"文件里有"，新闻只能在旁边微调；
    // 之前只把财报算作硬依据，于是「诉讼风险 82（公告层面无诉讼）」会被两条标题党
    // 直接重算成 50± —— 公告被新闻覆盖，优先级完全反了。
    const hasHard = tr.source === '财报指标计算' || tr.source === '交易所披露';
    if (hasHard) {
      tr.newsHits = list.length;
      if (pos >= 2 && neg === 0) { dims[k] = clampDim(dims[k] + 3); tr.newsDelta = 3; }
      else if (neg >= 2 && pos === 0) { dims[k] = clampDim(dims[k] - 3); tr.newsDelta = -3; }
      continue;
    }
    if (pos >= 2 && pos > neg) {
      dims[k] = clampDim(50 + Math.min(12, pos * 4));
      tr.source = '公开报道（2 条以上同向）';
      tr.newsHits = pos;
      tr.newsDelta = Math.min(12, pos * 4);
    } else if (neg >= 2 && neg > pos) {
      dims[k] = clampDim(50 - Math.min(12, neg * 4));
      tr.source = '公开报道（2 条以上同向）';
      tr.newsHits = neg;
      tr.newsDelta = -Math.min(12, neg * 4);
    } else {
      // 报道有，但方向不一致或只有一条 —— 不足以给分，仍标"未评分"
      tr.newsHits = list.length;
    }
  }

  // 7) 精英人物搜索判定（替换原 checkElite 方法，来自 company-xray 精英搜索方案）：
  //    候选人 = 董事长 / 法定代表人 / 大股东 / 核心成员 / 实际控制人（与上市/未上市查询绑定，自动搜索）
  //    → 逐人联网搜索（百度优先人物检索）→ 大厂履历 + 专业提及双标记
  //    → 线上查无资料时回退 Agent 数据库（静态库 66 人 + WorkBuddy 云服务免密钥大模型记忆）
  //    → 检出 N 名精英人物，每名总分 +1，不设加分上限（scoreCompany 内生效）
  let eliteResult = null;
  try {
    // 构造 elite-search 需要的 profile 形状（复用已取得的工商数据，避免重复请求）
    const profileShape = {
      company: companyTrim,
      reg: reg.reg ? { legalPerson: reg.reg.legalPerson } : null,
      actualController: reg.actualController,
      shareholders: reg.shareholders,
      personnel: reg.personnel.map(function (p) {
        return { name: p.name, position: p.position || '主要人员', sources: ['工商数据（企查查/天眼查/爱企查/东财F10）'] };
      }),
      newsTitles: news.map(function (n) { return n.title; })
    };
    // AI 记忆库给出的人员：跳过耗时的联网检索，直接交给 Agent 数据库（大模型）判定
    const aiDossiers = {};
    for (const p of reg.personnel) {
      if (p.name && Array.isArray(p.sources) && p.sources.indexOf('AI 记忆库') >= 0) {
        aiDossiers[p.name] = { position: p.position || '', background: p.resume || '' };
      }
    }
    eliteResult = await searchElitePeople(profileShape, aiDossiers);
  } catch (e) {
    eliteResult = { searched: false, people: [], isElite: false, error: e.message, eliteCount: 0 };
  }

  // 转换为 scoreCompany 兼容的 eliteInfo 结构
  const eliteInfo = {
    isElite: eliteResult.isElite,
    source: eliteResult.source || '精英搜索',
    reason: eliteResult.reason || '',
    people: (eliteResult.people || []).map(function (p) {
      return {
        name: p.name, role: p.role, markers: p.markers,
        isElite: p.isElite, type: p.type, reason: p.reason,
        onlineHit: p.onlineHit, onlineSources: p.onlineSources, agentDbFallback: p.agentDbFallback
      };
    }),
    eliteCount: eliteResult.eliteCount || 0,
    eliteNote: '搜索范围：法定代表人/董事长/大股东/核心成员/实际控制人（自动识别，无需手动输入，只搜索本次查询的公司）；判定方法：逐人联网搜索（百度优先）→「大厂履历 + 专业提及」双标记；线上查无资料时回退 Agent 数据库（静态库 66 人 + WorkBuddy 云服务免密钥大模型记忆）；每检出 1 名精英人物总分 +1，不设加分上限。'
  };
  if (eliteResult.error) eliteInfo.searchError = eliteResult.error;
  if (eliteInfo.isElite) {
    dataNotes.push('精英判定（' + eliteInfo.source + '）：' + eliteInfo.reason);
  }

  // 8) 覆盖率与门限 —— 唯一算法（lib/caliber.js 读 shared/caliber.json）
  //    为什么放在打分**之前**：v1 是先打完分、再回头把结论「撤回」（还留一句
  //    "原判定为 X，已按纪律撤回"），等于引擎说一套、外面盖一套。现在覆盖率先进引擎，
  //    「给不给结论」由引擎一次决定 —— 同一份结果里不再有两个 coverage。
  const regIsAI = !!(reg && /ai|记忆库/i.test(String(reg.source || '')));
  const hasStock = !!(stock && stock.code);
  const hasFinance = !!(finance && finance.reportDate);
  const hasRegistry = !!(!regIsAI && reg && (reg.reg
    || (reg.shareholders && reg.shareholders.length)
    || (reg.personnel && reg.personnel.length)));
  const hasNews = news.length > 0;
  const channelFlags = { stock: hasStock, finance: hasFinance, registry: hasRegistry, news: hasNews };
  // 分母只算「这家公司本来可能有」的通道：未上市没有行情/财报，按固定四项算它永远是「信息不足」
  const cov = caliber.coverageOf(channelFlags, { type: type });

  if (regIsAI) {
    dataNotes.push('注意：工商/人员部分来自 **AI 记忆库**（模型记忆，非实时接口、可能过时）——'
      + '按口径**不计入覆盖率**，仅作线索，请用资料库的官方入口核对。');
  }
  dataNotes.push('数据覆盖率（口径见 shared/caliber.json）' + cov.pct + '%'
    + ' —— 已取得：' + (cov.got.length ? cov.got.map(channelLabel).join('、') : '无')
    + '；未取得：' + (cov.missing.length ? cov.missing.map(channelLabel).join('、') : '无')
    + (cov.skipped && cov.skipped.length ? '；不适用：' + cov.skipped.map(channelLabel).join('、') + '（未上市，本就没有这些通道，不计入分母）' : '')
    + '。');

  // 8.5) 主体可信度（单向校验：投资看可信度，可信度不看投资）
  //      事实判断应优先于估值判断 —— 主体都对不上、或钱走得异常，「值不值得投」就无从谈起。
  const trust = await fetchTrust(companyTrim);
  if (trust.state === 'ok' && trust.conflict) {
    dataNotes.push('❌ 主体核验未通过：' + trust.label + ' —— 投资结论按口径撤回（不是降级，是不给）。');
  } else if (trust.state !== 'ok') {
    dataNotes.push('⚠ ' + trust.note);
  } else {
    dataNotes.push('主体核验：' + trust.label + '。');
  }

  // 9) 打分（上市公司：十维 80% + 股票评估 20%；未上市：纯十维）
  const result = scoreCompany({
    dims, type: type, eliteInfo,
    stockScore: stockAssessment ? stockAssessment.stockScore : null,
    coverage: cov.pct,
    demo: usingSeed,
    trustConflict: trust.state === 'ok' && trust.conflict,
    trustUnavailable: trust.state === 'unavailable' || trust.state === 'error'
  });

  // 9.5) 话题热度：只作**关注度事实**陈述，不再翻转结论
  //      v1 有一段"覆盖不足且话题正向占多 → 判值得投资"的兜底。那等于用「讨论得多」
  //      替代「数据够」，与「查不到标未知」的红线直接冲突；而且它一直没真正跑过
  //      （触发条件读的是恒为 100% 的假覆盖率），属于双重问题。现在只报事实。
  let topicStats = null;
  if (cov.pct < caliber.GATE.partial) {
    const topicQueries = [companyTrim, companyTrim + ' 口碑 评价', companyTrim + ' 新闻 热点'];
    const topicResults = await Promise.allSettled(topicQueries.map(function (q) { return src.searchNews(q, 8000); }));
    const topics = [];
    topicResults.forEach(function (r) {
      if (r.status === 'fulfilled') topics.push.apply(topics, r.value);
    });
    if (topics.length > 0) {
      const stats = topicsLib.analyzeTopics(topics);
      topicStats = {
        total: stats.total, pos: stats.pos, neg: stats.neg, neutral: stats.neutral,
        note: '公开话题 ' + stats.total + ' 条（正向 ' + stats.pos + ' / 负向 ' + stats.neg
          + ' / 中性 ' + stats.neutral + '）。按口径，话题热度**不作为**投资结论依据 ——'
          + '讨论多说明有关注度，不说明数据充分。'
      };
      channels.push({
        name: '公开话题关注度', status: 'ok',
        note: topics.length + ' 条话题，正向 ' + stats.pos + '/负向 ' + stats.neg + '/中性 ' + stats.neutral
      });
      dataNotes.push('公开话题 ' + stats.total + ' 条（正向 ' + stats.pos + '、负向 ' + stats.neg + '）：'
        + '仅作关注度参考，不参与结论。');
    }
  }

  // 10) 结论与稳定性直接取引擎输出（v1 的"事后撤回"整段已删除）
  const verdict = result.verdict;
  const scoreOut = result.score;
  if (result.stability === 'partial' && verdict.level !== 'insufficient' && verdict.level !== 'demo') {
    verdict.partial = true;
    verdict.label = verdict.label + '（结论稳定性有限）';
    // 原因要取实际生效的那一条：覆盖率够但被"未上市/未核验"封顶时，
    // 再写"覆盖率为 100%，未到 75%"就自相矛盾了。
    const gateReason = result.gate && result.gate.reason;
    if (result.gate && result.gate.gate === 'partial' && gateReason) {
      dataNotes.push('结论稳定性有限：' + gateReason + '。');
    } else {
      dataNotes.push('覆盖率为 ' + cov.pct + '%，未到 ' + caliber.GATE.partial + '% 的完整线：结论方向可用，稳定性有限。');
    }
  } else if (result.stability === 'no_conclusion') {
    dataNotes.push('❌ ' + (result.gate && result.gate.reason || '覆盖率不足') + '：按"无数据不下结论"的纪律，只报事实、不给投资建议。');
    dataNotes.push('建议：到「公司X光 → 资料库」用官方入口自查，或补充该企业的上市代码/工商信息后重试。');
  } else if (result.stability === null) {
    dataNotes.push('本次未计算覆盖率（调用方未传入），结论不设门限。');
  }

  // 每一维的取数来源等级（口径：shared/caliber.json 的 sources 表）
  const dimBasis = {};
  for (const k of DIM_KEYS) {
    const tr = dimTrace[k] || { source: '缺省中性', newsHits: 0 };
    dimBasis[k] = caliber.dimSourceClass(tr.source, tr.newsHits);
  }
  const okChannels = channels.filter(function (c) { return c.status === 'ok'; }).map(function (c) { return c.name; });

  const output = {
    query: { company: companyTrim, legalPerson: lpTrim, type },
    stock, quote, finance,
    // 交易所披露摘要：只留「能复述给人听」的部分。
    // 完整 400+ 条公告没必要塞进响应体，但**被归类命中的那几条必须带标题和原文链接**，
    // 否则「诉讼风险 82 分」就成了又一个不可核对的数字。
    disclosure: disc ? (disc.status === 'ok' ? {
      status: disc.status,
      code: disc.code,
      market: disc.market || 'cninfo',
      span: disc.span,
      total: disc.total,
      announcementTotal: disc.announcementTotal,
      earliest: disc.earliest,
      latest: disc.latest,
      complete: !!disc.complete,
      cats: Object.keys(disc.cats).reduce(function (acc, k) {
        const c = disc.cats[k];
        if (c.count) acc[k] = { label: c.label, count: c.count, latest: c.latest };
        return acc;
      }, {}),
      flags: disc.flags,
      evidence: disc.items
        .filter(function (it) { return it.cats.length; })
        .slice(0, 8)
        .map(function (it) { return { title: it.title, date: it.date, url: it.url, cats: it.cats }; })
    } : { status: disc.status, note: disc.note }) : null,
    score: scoreOut,
    rawScore: result.score,
    dimScore: result.dimScore,
    stockScore: result.stockScore,
    stockWeighted: result.stockWeighted,
    eliteBonus: result.eliteBonus || 0,
    stockAssessment,
    verdict: verdict,
    // 覆盖率只有一个（口径文件算法），不存在两个并存的覆盖率字段
    coverage: cov.pct,
    stability: result.stability,
    gate: result.gate,
    realChannels: channelFlags,
    // 口径块：两端同构 —— 可信度侧（backend/company_profile）输出的字段名与这里一致
    caliber: {
      schema: caliber.CALIBER.schema,
      version: caliber.CALIBER.version,
      line: caliber.INVEST_LINE,
      trustAnchors: caliber.CALIBER.trust.anchors_total,
      noConclusionLine: caliber.GATE.no_conclusion,
      partialLine: caliber.GATE.partial,
      coverage: cov.pct,
      gate: result.gate ? result.gate.gate : null,
      gateReason: result.gate ? result.gate.reason : null,
      channels: caliber.CHANNELS,
      bySource: cov.bySource,
      applicable: cov.applicable,
      skipped: cov.skipped,
      applicableWeight: cov.applicableWeight,
      dimBasis: dimBasis,
      sources: caliber.SOURCES,
      trust: { state: trust.state, trust: trust.trust || null, label: trust.label || null,
               coverage: trust.coverage === undefined ? null : trust.coverage,
               note: trust.note }
    },
    trust: trust,
    breakdown: result.breakdown,
    weights: result.weights,        // 报告要按原始权重逐维算贡献分，折算系数不能混进来
    elite: eliteInfo,
    topicStats,
    dims,
    news: news.slice(0, 8),
    newsSignals: newsSignals.slice(0, 10),
    channels,
    dataNotes,
    usingSeed,
    registry: {
      reg: reg.reg,
      actualController: reg.actualController,
      shareholders: reg.shareholders.slice(0, 10),
      shareholderEndDate: reg.shareholderEndDate,
      personnelCount: reg.personnel.length,
      personnel: reg.personnel.map(function (p) {
        return { name: p.name, position: p.position || '', tenure: p.tenure || '', resume: (p.resume || '').slice(0, 160) };
      }),
      source: reg.source,
      sourceNote: reg.sourceNote,
      mcpConfigured: registry.mcpConfigured()
    },
    // 团队/诉讼两维的依据：分数从哪来、依据哪些公告与字段。
    // 放在顶层是为了让 API 消费者（不只是报告页）也能拿到 —— 分数必须可回指。
    teamWhy: teamWhy,
    litWhy: litWhy,
    elapsedMs: Date.now() - t0,
    analyzedAt: new Date().toISOString()
  };

  // 完整评估报告：把"每维分数从哪来、贡献多少、总分怎么算出来"摊开，供页面出报告
  output.report = buildReport(output, {
    dimTrace: dimTrace,
    seed: seed,
    finScored: finScored,
    newsSignals: newsSignals,
    labels: DIM_LABELS,
    disclosure: disc,
    teamWhy: teamWhy,
    litWhy: litWhy
  });
  return output;
}

module.exports = { analyze };
