'use strict';

// 投资评估报告生成器
//
// 为什么要有它：原来的结果页是一屏卡片 —— 十维只有一个进度条和一个分数，
// 既不知道"这个分从哪来"，也没法核对"加权到底算对了没有"。
// 这份报告把三件事摊开：
//   ① 每一维的分数出处（财报实数 / 演示样本 / 新闻信号修正 / 缺省中性）
//   ② 每一维对总分的真实贡献（按有效权重归一，读者能自己加总核对）
//   ③ 完整的计算链（十维 → 折算 → 股票 20% → 精英加分 → 综合）
//
// 纪律（与全项目一致）：只写能追到出处的话。没有数据就写"没有数据"，
// 不为了报告好看去编判读理由。

const DIM_ORDER = ['industry', 'team', 'tech', 'product', 'cost', 'management', 'customers', 'brand', 'finance', 'litigation'];

const LEVELS = [
  { min: 80, key: 'strong', label: '显著优势', color: 'green' },
  { min: 65, key: 'good', label: '较好', color: 'green' },
  { min: 50, key: 'neutral', label: '中性', color: 'amber' },
  { min: 35, key: 'weak', label: '偏弱', color: 'red' },
  { min: -1, key: 'poor', label: '明显短板', color: 'red' }
];

function levelOf(v) {
  if (typeof v !== 'number' || !isFinite(v)) return { key: 'na', label: '未评分', color: 'grey' };
  for (const l of LEVELS) if (v >= l.min) return l;
  return LEVELS[LEVELS.length - 1];
}

function round1(n) { return Math.round(n * 10) / 10; }
// 贡献分用两位小数：十维各自舍入到一位再相加，尾差能累到 0.4，读者一加就"对不上"，
// 反而毁掉报告最想提供的可验算性。
function round2(n) { return Math.round(n * 100) / 100; }

function pct(n) { return round1(n) + '%'; }

// 财报信号归属：sources.financeFromData 产出的每条形如
// 「资产负债率 17.7%（≤40%，达标）」「净利率 15.1%（优秀）」「毛利率 30.4%」，
// 按关键字归到对应维度 —— 报告里要写**实际数值**，不能只写"由财报指标计算得出"
// （那种话读者核不了，也占地方）。
const FIN_SIGNAL_KEYS = {
  // 应收账款那条归「客户质量」，finance 这边只留资产负债率与货币资金，
  // 否则同一句指标会在两维的依据里各出现一次（读起来像重复计入）
  finance: ['资产负债率', '货币资金'],
  management: ['管理费用率', '净利率'],
  cost: ['毛利率'],
  // v2.2.1 新增的五维：每条都能回指报表科目
  tech: ['研发费用率', '研发投入同比'],
  product: ['营收同比'],
  customers: ['下游回款质量', '销售费用率'],
  industry: ['营收增速', '增收不增利'],
  brand: ['毛利率', '销售费用率', '溢价更像买流量']
};

function finSignalsFor(key, ex) {
  const all = (ex.finScored && ex.finScored.signals) || [];
  const keys = FIN_SIGNAL_KEYS[key];
  if (!keys) return [];
  return all.filter(function (s) {
    return keys.some(function (k) { return s.indexOf(k) >= 0; });
  });
}

function basisFor(key, raw, ex) {
  const trace = (ex.dimTrace || {})[key] || { source: '缺省中性', newsHits: 0 };
  const bits = [];

  if (trace.source === '财报指标计算') {
    const sig = finSignalsFor(key, ex);
    // 有具体指标就逐条列出；一条都没有才退回说明性文字（不编数值）
    bits.push(sig.length ? sig.join('；') : '财报通道取到数据，但该维度无对应指标可比');
  }
  if (trace.source === '内置演示样本') {
    bits.push('内置演示样本（非真实数据，不可作为投资依据）');
  }
  if (trace.source === '公开报道（2 条以上同向）') {
    bits.push('仅有公开报道线索（至少 2 条同向），无财报或登记数据可用作硬依据');
  }
  // 交易所公告：必须把「哪几条公告」说出来，否则这一维还是不可核对。
  // 措辞上死守一条：「未见需披露的诉讼」≠「没有诉讼」—— 未达披露标准的事项不会进公告。
  if (trace.source === '交易所披露') {
    const dc = ex.disclosure;
    if (key === 'litigation') {
      if (!dc) {
        bits.push('披露数据不可用');
      } else {
        const c = dc.cats.litigation;
        if (c && c.count) {
          // 分级信息（第一版只有"命中 N 条"，读者无法判断轻重）：
          // 现在按性质分档列出，并把公司作为被告/原告的件数分开说。
          const litWhy = (ex.litWhy || []).filter(Boolean);
          bits.push(litWhy.length ? litWhy.join('；') : ('巨潮公告中命中 ' + c.count + ' 条诉讼/仲裁类'));
          bits.push('最近一条 ' + c.latest.date + '「' + c.latest.title + '」');
        } else {
          bits.push('近 ' + dc.months + ' 个月 ' + dc.total + ' 条公告中未见诉讼/仲裁类'
            + '（覆盖 ' + dc.earliest + ' 起' + (dc.complete ? '' : '，时段不完整')
            + '）；未达披露标准的小额诉讼不在其中');
        }
      }
    } else if (key === 'team') {
      const why = (ex.teamWhy || []).filter(Boolean);
      bits.push(why.length ? why.join('；') : '按高管名单与高管变动公告综合');
      if (dc && dc.cats.management && dc.cats.management.count) {
        bits.push('高管变动公告 ' + dc.cats.management.count + ' 条');
      }
    } else {
      bits.push('交易所披露');
    }
  }
  // 演示样本里的"设定"只在这一维确实来自演示样本时才提，
  // 否则真实财报算出来的维度会挂着一条"演示设定：…"，看着像混合数据
  const seedSig = ex.seed && ex.seed.signals && ex.seed.signals[key];
  if (seedSig && seedSig.length && trace.source === '内置演示样本') bits.push(seedSig[0]);

  const hits = (ex.newsSignals || []).filter(function (s) { return s.dim === key; });
  if (hits.length) {
    const pos = hits.filter(function (h) { return h.positive; }).length;
    bits.push(hits.length + ' 条报道信号（正 ' + pos + ' / 负 ' + (hits.length - pos) + '）'
      + (trace.newsDelta ? '，修正 ' + (trace.newsDelta > 0 ? '+' : '') + trace.newsDelta + ' 分' : ''));
  }
  if (!bits.length) {
    // v2.2.1 起：没依据的维度不再按中性分计入加权 —— 那会把"查不到"写成"中等水平"
    bits.push('未取得该维度的可核对公开数据，本次不评分、不计入加权');
  }
  return bits.join('；') + '。';
}

function buildDims(r, ex) {
  const dims = r.dims || {};
  const weights = r.weights || {};
  // 只把"有实分"的维度算进分母 —— 与 scoring.weightedScore 的口径一致，
  // 否则报告里的贡献分加起来会对不上 dimScore。
  let wsum = 0;
  for (const k of DIM_ORDER) {
    if (typeof dims[k] === 'number' && isFinite(dims[k]) && weights[k]) wsum += weights[k];
  }
  return DIM_ORDER.map(function (k) {
    const w = weights[k] || 0;
    const raw = (typeof dims[k] === 'number' && isFinite(dims[k])) ? dims[k] : null;
    const weightPct = raw !== null && wsum ? (w / wsum) * 100 : (wsum ? (w / wsum) * 100 : 0);
    const contribution = (raw !== null && wsum) ? round2(raw * w / wsum) : null;
    const trace = (ex.dimTrace || {})[k] || { source: '缺省中性', newsHits: 0 };
    const ev = (ex.newsSignals || []).filter(function (s) { return s.dim === k; })
      .slice(0, 2).map(function (s) { return { text: s.text, url: s.url, positive: s.positive }; });
    return {
      key: k,
      label: ex.labels[k] || k,
      raw: raw === null ? null : Math.round(raw),
      level: levelOf(raw),
      weight: w,
      weightPct: round1(weightPct),
      contribution: contribution,
      // 一行算式，读者不用自己乘：得分 × 有效权重 = 贡献
      expr: (raw === null || contribution === null) ? ''
        : Math.round(raw) + ' × ' + round1(weightPct) + '% ≈ ' + contribution.toFixed(2),
      source: trace.source,
      // 出处写成读者能懂的话（「缺省中性」是内部口径，不是给投资人看的）
      sourceLabel: ({ '财报指标计算': '财报指标', '内置演示样本': '演示样本',
        '缺省中性': '无公开数据', '无公开数据': '无公开数据（未评分）',
        '公开报道（2 条以上同向）': '公开报道',
        '交易所披露': '交易所公告', '工商人员名单': '高管名单' })[trace.source] || trace.source,
      basis: basisFor(k, raw, ex),
      evidence: ev
    };
  }).sort(function (a, b) { return b.weight - a.weight; });
}

function buildCalculation(r, dims) {
  // 完整计算链：每一步都写清楚用了什么、得到什么，方便读者逐行核对
  const steps = [];
  const valid = dims.filter(function (d) { return d.contribution !== null; });
  const contribSum = valid.length ? round1(valid.reduce(function (s, d) { return s + d.contribution; }, 0)) : null;

  steps.push({
    label: '十维加权平均',
    expr: valid.length + ' 个有效维度按权重归一后加权',
    value: r.dimScore === null ? '—' : round1(r.dimScore),
    note: contribSum === null ? '' : '与各维贡献分合计（' + contribSum + '）一致'
  });

  let running;
  if (r.dimScore === null) {
    running = null;
    steps.push({ label: '综合得分', expr: '没有任何维度取得实分，无法评分', value: '—', note: '' });
  } else if (r.stockScore !== null && r.stockScore !== undefined && isFinite(r.stockScore)) {
    const tenPart = round1(r.dimScore * 0.8);
    const stockPart = round1(r.stockScore * 0.2);
    steps.push({ label: '十维折算（80%）', expr: round1(r.dimScore) + ' × 80%', value: tenPart, note: '上市公司口径：十维只占八成' });
    steps.push({ label: '股票评估（20%）', expr: round1(r.stockScore) + ' × 20%', value: stockPart, note: '估值与财务质量知识规则' });
    running = round1(tenPart + stockPart);
    steps.push({ label: '小计', expr: tenPart + ' + ' + stockPart, value: running, note: '' });
  } else {
    running = round1(r.dimScore);
    steps.push({ label: '小计', expr: '未上市口径，十维即为原始分', value: running, note: '不引入股票评估维度' });
  }

  if (running !== null && r.eliteBonus) {
    const before = running;
    running = round1(running + r.eliteBonus);
    steps.push({
      label: '精英人物加分', expr: before + ' + ' + r.eliteBonus,
      value: Math.min(99, running),
      note: '检出 ' + r.eliteBonus + ' 名精英人物，每人 +1'
    });
    if (running > 99) {
      running = 99;
      steps.push({ label: '封顶', expr: '总分上限 99', value: 99, note: '加分后超过上限，按 99 计' });
    }
  } else if (running !== null) {
    steps.push({ label: '精英人物加分', expr: '未检出精英人物', value: 0, note: '' });
  }

  const finalScore = r.score === null ? null : round1(r.score);
  return {
    steps: steps,
    dimScore: r.dimScore === null ? null : round1(r.dimScore),
    stockScore: (r.stockScore === null || r.stockScore === undefined) ? null : round1(r.stockScore),
    eliteBonus: r.eliteBonus || 0,
    finalScore: finalScore,
    consistent: (running === null || finalScore === null) ? null : Math.abs(running - finalScore) < 0.05,
    line: 58
  };
}

function buildReport(r, extras) {
  const ex = extras || {};
  ex.labels = ex.labels || {};
  const dims = buildDims(r, ex);
  const calc = buildCalculation(r, dims);
  const v = r.verdict || {};
  const isListed = r.query && r.query.type !== 'unlisted';
  const validDims = dims.filter(function (d) { return d.raw !== null; });
  const missing = dims.filter(function (d) { return d.raw === null; });
  const sorted = validDims.slice().sort(function (a, b) { return b.raw - a.raw; });
  const strongest = sorted.slice(0, 2);
  const weakest = sorted.slice(-2).reverse();

  // ---- 摘要：先给可核对的数字，再给判断；不写"本报告基于…口径"这种封面已经有的废话 ----
  const summaryBullets = [];
  const listedFactor = (isListed && r.stockScore !== null && r.stockScore !== undefined && isFinite(r.stockScore)) ? 0.8 : 1;

  if (r.score !== null && r.score !== undefined) {
    const gap = round1(r.score - calc.line);
    summaryBullets.push('综合得分 ' + round1(r.score) + ' 分，' + (gap >= 0
      ? '高于 ' + calc.line + ' 分投资线 ' + gap + ' 分'
      : '低于 ' + calc.line + ' 分投资线 ' + Math.abs(gap) + ' 分'));
  }
  // 投资线的钱是怎么跨过去的 —— 只说"高于 13.4 分"没法判断是靠十维还是靠股票那一档
  if (r.dimScore !== null && listedFactor === 0.8) {
    const tenPart = round1(r.dimScore * 0.8);
    const stockPart = round1(r.stockScore * 0.2);
    summaryBullets.push('投资线的构成：十维折算 ' + tenPart + ' 分（距 ' + calc.line + ' 线 '
      + (tenPart >= calc.line ? '+' : '−') + Math.abs(round1(tenPart - calc.line)) + '），'
      + '股票评估 ' + stockPart + ' 分，小计 ' + round1(tenPart + stockPart) + ' 分'
      + ((r.eliteBonus || 0) ? '，精英加分 +' + r.eliteBonus : ''));
  }
  if (validDims.length) {
    const byLevel = { high: 0, mid: 0, low: 0 };
    validDims.forEach(function (d) {
      if (d.raw >= 65) byLevel.high += 1;
      else if (d.raw >= 50) byLevel.mid += 1;
      else byLevel.low += 1;
    });
    summaryBullets.push('维度分布（共 ' + validDims.length + ' 个有数据的维度）：'
      + '65 分以上 ' + byLevel.high + ' 个 · 50–64 分 ' + byLevel.mid + ' 个 · 低于 50 分 ' + byLevel.low + ' 个');
  }
  if (strongest.length) {
    summaryBullets.push('得分最高：' + strongest.map(function (d) { return d.label + ' ' + d.raw + ' 分'; }).join('、'));
  }
  if (weakest.length) {
    summaryBullets.push('最需要关注：' + weakest.map(function (d) { return d.label + ' ' + d.raw + ' 分'; }).join('、'));
  }
  if (missing.length) {
    summaryBullets.push(missing.length + ' 个维度没有取得可用数据（' + missing.map(function (d) { return d.label; }).join('、')
      + '），未参与加权 —— 这不是给它们打 0 分，而是"无从判断"');
  }

  const sections = [];

  sections.push({
    no: '一', key: 'summary', title: '结论摘要',
    paragraphs: (v.level === 'insufficient' || v.level === 'demo')
      // 结论被门限拦下时，用引擎给出的原因（它知道是因为覆盖率低、演示数据、还是主体冲突）
      ? [v.detail || v.label]
      : [],
    bullets: summaryBullets
  });

  // 口径与取数：把"这个分数站在什么数据上"单独讲清楚。
  // 为什么放在方法章而不是另起一章：口径属于方法的一部分，读者看方法时最需要知道
  // "哪些算取到了、哪些不算"，拆成两章反而容易只看一半。
  const cal = r.caliber || null;
  const methodParas = [
    '总分 = Σ(维度得分 × 该维有效权重) ÷ Σ有效权重；有效权重只统计"取得数据"的维度，'
    + (listedFactor === 0.8 ? '上市公司另将十维折算为 80%，股票评估占 20%。' : '未上市口径不引入股票评估。')
  ];
  if (cal) {
    methodParas.push(
      '数据覆盖率 ' + cal.coverage + '%（口径 ' + cal.schema + ' v' + cal.version + '）：'
      + '行情 30 / 财报 30 / 工商 20 / 报道 20，按已取得的通道权重求和。'
      + '演示样本、假设中性（拿不到数据时按 50 参与评分）、AI 记忆一律**不算已取得**。'
    );
    if (cal.gateReason) methodParas.push('结论门限：' + cal.gateReason + '。');
    if (cal.trust) {
      const vN = (cal.trust.verified === null || cal.trust.verified === undefined) ? '?' : cal.trust.verified;
      methodParas.push(cal.trust.state === 'ok'
        ? '主体一致性：' + (cal.trust.label || '已核') + '（六锚点已核 ' + vN + ' / '
          + (cal.trustAnchors || 6) + '）。可信度侧发现主体不一致或资金往来异常时，投资结论一律撤回。'
        : '主体一致性：**未核验** —— ' + (cal.trust.note || '后端不可用') + ' 未核验不等于没有问题。');
    }
  }
  sections.push({
    no: '二', key: 'method', title: '评分方法与算法',
    paragraphs: methodParas,
    calculation: calc
  });

  sections.push({
    no: '三', key: 'dims', title: '十维逐项分析',
    paragraphs: [
      '按有效权重从高到低。每行给出算式（得分 × 有效权重 ≈ 贡献），贡献列合计 '
      + (calc.dimScore === null ? '—' : round1(calc.dimScore)) + ' 即十维加权平均分。'
    ],
    dims: dims
  });

  // 多一道 isListed 判断：未上市公司即便上游误带 stockAssessment，也不该出现股票章节
  if (isListed && r.stockAssessment && r.stockAssessment.applicable) {
    const sa = r.stockAssessment;
    const q = r.quote || {};
    // 52 周区间位置自己算：行情里已有高低点，算出来比让读者去比更有用（也是风险段的依据）
    const px = parseFloat(q.price);
    const pos52 = (isFinite(px) && q.high52w != null && q.low52w != null && q.high52w > q.low52w)
      ? Math.round((px - q.low52w) / (q.high52w - q.low52w) * 100) + '%（区间 ' + q.low52w + ' – ' + q.high52w + '）'
      : '—';
    sections.push({
      no: '四', key: 'stock', title: '股票投资评估',
      paragraphs: ['由市盈率、市净率与财务质量按固定规则合成，占综合得分 20%。'],
      banner: { label: sa.verdict ? sa.verdict.label : '—', color: sa.verdict ? sa.verdict.color : 'amber', reasons: sa.reasons || [] },
      metrics: [
        { k: '证券代码', v: sa.code || '—' },
        { k: '现价', v: q.price != null ? q.price + (q.changePct != null ? '（' + q.changePct + '%）' : '') : '—' },
        { k: '市盈率 TTM', v: q.pe != null ? q.pe : '—' },
        { k: '市净率', v: q.pb != null ? q.pb : '—' },
        { k: '总市值', v: q.totalMv != null ? (Math.round(q.totalMv * 10) / 10) + ' 亿' : '—' },
        { k: '52 周区间位置', v: pos52 },
        { k: '股票评分', v: r.stockScore != null ? r.stockScore : '—' }
      ],
      positives: sa.positives || [],
      risks: sa.risks || []
    });
  }

  // ---- 改善空间（敏感性）：投资人最想知道"哪个维度提升最值钱" ----
  // 纯算术，不含预测：把某一维从当前分提到 65（"较好"下限），按同一套权重反推总分变化。
  const wsumAll = dims.filter(function (d) { return d.raw !== null; })
    .reduce(function (a, d) { return a + (d.weight || 0); }, 0);
  const upside = [];
  if (wsumAll > 0) {
    dims.forEach(function (d) {
      if (d.raw === null || d.raw >= 65) return;
      const delta = (65 - d.raw) * (d.weight / wsumAll) * listedFactor;
      upside.push({ label: d.label, raw: d.raw, weightPct: d.weightPct, delta: round2(delta) });
    });
    upside.sort(function (a, b) { return b.delta - a.delta; });
  }
  const topUpside = upside.slice(0, 3);
  const upItems = topUpside.map(function (u) {
    return u.label + ' ' + u.raw + ' → 65 分：总分 +' + u.delta.toFixed(2) + ' 分（有效权重 ' + u.weightPct + '%）';
  });
  const upSum = round2(topUpside.reduce(function (a, u) { return a + u.delta; }, 0));
  if (topUpside.length) {
    // 「够不够跨线」要跟折算后的十维分比（上市公司十维只占 80%），不能拿原始 dimScore 去比
    const tenPart = r.dimScore === null ? 0 : round1(r.dimScore * listedFactor);
    const need = Math.max(0, round1(calc.line - tenPart));
    upItems.push('以上 ' + topUpside.length + ' 项同时补齐，合计 +' + upSum.toFixed(2) + ' 分；'
      + (need <= 0 ? '十维折算分本就在投资线之上'
        : (upSum >= need ? '足以把十维折算分推过 ' + calc.line + ' 分投资线（缺 ' + need + ' 分）'
          : '距 ' + calc.line + ' 分投资线仍差 ' + round1(need - upSum) + ' 分')));
  }
  sections.push({
    no: '五', key: 'upside', title: '改善空间（敏感性测算）',
    paragraphs: [topUpside.length
      ? '把下列维度从其当前分提到 65 分（"较好"档下限），其余维度不变，按同一套权重重算综合得分的结果：'
      : '各维度均已在 65 分以上，按同一套权重测算，无显著改善空间。'],
    items: upItems
  });

  const reg = r.registry || {};
  const dc = ex.disclosure;
  const dcOk = !!(dc && dc.status === 'ok');
  const dcEvidence = dcOk ? (dc.items || []).filter(function (it) { return it.cats && it.cats.length; }).slice(0, 6) : [];
  if (reg.reg || (reg.shareholders && reg.shareholders.length) || reg.personnelCount || dcOk) {
    const regParas = [reg.sourceNote || '工商与股东数据来自公开渠道，可能存在时滞。'];
    if (dcOk) {
      regParas.push('交易所披露：近 ' + dc.months + ' 个月共 ' + dc.total + ' 条公告（' + dc.span
        + '），公告原文可点开核对。' + (dc.complete ? '' :
          '⚠ 本次只翻到 ' + (dc.earliest || '?') + ' 起，覆盖不完整。'));
    } else if (dc && dc.note) {
      regParas.push('交易所披露：' + dc.note + '。');
    }
    sections.push({
      no: '六', key: 'registry', title: '股权、人员与披露事项',
      paragraphs: regParas,
      facts: [
        reg.reg && reg.reg.legalPerson ? { k: '法定代表人', v: reg.reg.legalPerson } : null,
        reg.actualController ? { k: '实际控制人', v: reg.actualController } : null,
        reg.reg && reg.reg.regCapital ? { k: '注册资本', v: reg.reg.regCapital } : null,
        reg.reg && reg.reg.established ? { k: '成立日期', v: reg.reg.established } : null,
        reg.personnelCount ? { k: '主要人员', v: reg.personnelCount + ' 人' } : null,
        (reg.shareholderEndDate ? { k: '股东数据截至', v: reg.shareholderEndDate } : null),
        // 披露分类计数：这是「诉讼风险」「团队实力」两维的分从哪来的直接依据
        dcOk ? { k: '诉讼/仲裁公告', v: dc.cats.litigation.count ? dc.cats.litigation.count + ' 条' : '未见需披露的' } : null,
        dcOk ? { k: '监管处罚/问询', v: dc.cats.penalty.count ? dc.cats.penalty.count + ' 条' : '未见' } : null,
        dcOk ? { k: '高管变动公告', v: dc.cats.management.count ? dc.cats.management.count + ' 条' : '未见' } : null,
        dcOk ? { k: '股权质押/变动', v: dc.cats.equity.count ? dc.cats.equity.count + ' 条' : '未见' } : null
      ].filter(Boolean),
      shareholders: (reg.shareholders || []).slice(0, 10).map(function (s) {
        return { name: s.name, ratio: s.ratio };
      }),
      personnel: (reg.personnel || []).slice(0, 6).map(function (p) {
        return { name: p.name, position: p.position, resume: p.resume };
      }),
      // 命中的那几条公告原文：分数要能被读者自己复核，这是唯一的办法
      links: dcEvidence.map(function (it) {
        return { date: it.date, title: it.title, url: it.url };
      })
    });
  }

  // 数据时点：从各通道的说明里抓日期，集中列出（散在通道备注里读者要自己找）
  const asOf = [];
  const seen = {};
  (r.channels || []).forEach(function (c) {
    if (c.status !== 'ok') return;
    const m = String(c.note || '').match(/20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?/);
    if (!m || seen[m[0]]) return;
    seen[m[0]] = 1;
    asOf.push({ k: c.name, v: m[0] });
  });

  // 财务信号已经进到各维"依据"里，这里不再重复列一遍
  const extraNotes = (r.dataNotes || []).filter(function (n) { return String(n).indexOf('财务信号：') !== 0; });

  sections.push({
    no: '七', key: 'data', title: '数据完备性与局限',
    paragraphs: ['覆盖度按四个通道是否取到数据加权（行情 30 / 财报 30 / 工商股东 20 / 新闻 20），AI 记忆库不计入。'],
    facts: asOf,
    // 失败通道只留原因：原文里常带着「去设置里填环境变量」这类开发者提示，投资人不需要
    channels: (r.channels || []).map(function (c) {
      if (c.status === 'ok') return c;
      const note = String(c.note || '');
      const m = note.match(/[：:]([^（(]+)/);
      return { name: c.name, status: c.status,
        note: (m ? m[1] : note.split(/[（(]/)[0]).trim() || '不可用' };
    }),
    notes: extraNotes
  });

  const riskItems = [];
  (isListed && r.stockAssessment && r.stockAssessment.risks ? r.stockAssessment.risks : []).forEach(function (x) {
    riskItems.push('财务与估值：' + x);
  });
  dims.filter(function (d) { return d.raw !== null && d.raw < 40; }).forEach(function (d) {
    riskItems.push(d.label + '仅 ' + d.raw + ' 分（' + d.level.label + '），是本次评分的主要拖累项');
  });
  if (cal && r.coverage < (cal.partialLine || 75)) {
    riskItems.push('数据覆盖率 ' + r.coverage + '%（未到 ' + (cal.partialLine || 75)
      + '% 完整线），结论稳定性有限，建议补充数据后复评');
  } else if (!cal && r.coverage < 60) {
    riskItems.push('数据覆盖率只有 ' + r.coverage + '%，结论稳定性有限，建议补充数据后复评');
  }
  if (r.usingSeed) riskItems.push('本次评分使用了内置演示样本数据，不可作为投资依据');
  sections.push({
    no: '八', key: 'risk', title: '风险提示',
    paragraphs: riskItems.length ? [] : ['本次评估未发现量化风险信号；这不等于没有风险，只是现有数据没有暴露出来。'],
    items: riskItems
  });

  sections.push({
    no: '九', key: 'disclaimer', title: '免责声明',
    paragraphs: [
      '本报告依据公开数据与明示规则自动生成，仅辅助判断，不构成投资建议；'
      + '数据可能滞后或缺失，涉及资金决策请以监管披露文件、审计报告与官方登记信息为准。'
      + '"未取得数据"只表示我们没有查到，不代表该维度实际表现差。'
    ]
  });

  // 章节编号统一重排：不是每家公司都有股票/股权章节（未上市或无工商数据会少节），
  // 写死编号会跳号（一、二、三、六），读起来像缺页。
  const NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  sections.forEach(function (s, i) { s.no = NUMS[i] || String(i + 1); });

  return {
    meta: {
      title: '投资价值评估报告',
      company: r.query ? r.query.company : '',
      legalPerson: r.query ? r.query.legalPerson : '',
      typeLabel: isListed ? '上市公司' : '未上市公司',
      generatedAt: r.analyzedAt || new Date().toISOString(),
      elapsedMs: r.elapsedMs || 0,
      coverage: r.coverage,
      score: r.score === null ? null : round1(r.score),
      verdictLabel: v.label || '',
      verdictLevel: v.level || '',
      color: v.color || 'grey',
      demo: !!r.usingSeed,
      dimsScored: validDims.length,
      dimsTotal: dims.length
    },
    sections: sections,
    calculation: calc,
    dims: dims
  };
}

module.exports = { buildReport, levelOf, DIM_ORDER };
