'use strict';

// 十维打分引擎
// 维度与权重（稳健/成长两套口径，来自前期讨论结论）：
//  行业 industry / 团队 team / 技术 tech / 产品 product / 成本 cost
//  管理 management / 客户 customers / 品牌 brand / 财务安全 finance / 诉讼 litigation
//
// ⚠ 覆盖率不在本文件里算（v2.0.0 口径统一）：
//   v1 这里算过一个 `coverage = 有数字的维度数 / 维度总数`，但十维**全部**会被填成
//   数字（没数据的填 50），所以它恒等于 100% —— 是个假指标，analyze.js 只好另算一个
//   通道覆盖率来兜底，于是同一份结果里出现了两个 coverage，互相打架。
//   现在覆盖率只有一个算法（lib/caliber.js 读 shared/caliber.json），
//   由调用方传入；本文件只负责「按传入的覆盖率决定给不给结论」。

const { gateOf, INVEST_LINE } = require('./caliber');

const WEIGHTS = {
  listed:   { finance: 18, product: 15, industry: 10, tech: 10, cost: 10, customers: 10, team: 8, brand: 4, litigation: 6, management: 5 },
  unlisted: { product: 18, industry: 15, tech: 12, team: 12, customers: 12, finance: 12, cost: 6, brand: 3, litigation: 5, management: 5 }
};

const DIM_LABELS = {
  industry: '行业前景', team: '团队实力', tech: '技术壁垒', product: '产品力',
  cost: '成本与毛利', management: '管理与盈利', customers: '客户质量',
  brand: '品牌地位', finance: '财务安全', litigation: '诉讼风险'
};

// 用于权重校验的排序参考（稳健型，从高到低）
// finance 18 > product 15 > industry/tech/cost/customers 10 > team/brand 8 > litigation 6 > management 5

function weightedScore(dims, weights) {
  let total = 0;
  let wsum = 0;
  for (const k of Object.keys(weights)) {
    const v = dims[k];
    if (typeof v === 'number' && isFinite(v)) {
      total += v * weights[k];
      wsum += weights[k];
    }
  }
  if (wsum === 0) return null;
  return total / wsum;
}

function verdictOf(score, type, eliteInfo) {
  // 判定规则（用户 2026-10-02 更新）：投资线从 >50 上调为 ≥58，≥58 即「目前适合投资」。
  // 精英背景仅通过 eliteBonus（每人 +1，用户 2026-10-03 指定不设上限）影响总分，不再单独改变结论档位。
  // 投资线数值本身放在 shared/caliber.json（口径真源），这里只读不算。
  if (score >= INVEST_LINE) {
    return { level: 'invest', label: '目前适合投资', color: 'green' };
  }
  return { level: 'not_fit', label: '目前看来并不是非常适合投资', color: 'red' };
}

function scoreCompany(payload) {
  const type = payload.type === 'unlisted' ? 'unlisted' : 'listed';
  const weights = WEIGHTS[type];
  const dims = payload.dims || {};
  const sources = payload.sources || {};
  // 股票评估分（仅上市公司）：由 stockAssess 引擎产出，占上市公司总分的 20%；
  // 未上市公司不引入该维度（stockScore 为 null 时自动退回纯十维权重）。
  const stockScore = (payload.stockScore !== null && payload.stockScore !== undefined && isFinite(payload.stockScore))
    ? payload.stockScore : null;

  const dimScore = weightedScore(dims, weights);
  let score = dimScore;
  let stockWeighted = null;
  if (dimScore !== null && stockScore !== null) {
    // 上市公司：十维压到 80%，股票评估占 20%
    score = dimScore * 0.8 + stockScore * 0.2;
    stockWeighted = Math.round(stockScore * 0.2 * 10) / 10; // 贡献分（20% 权重折算后）
  }

  const eliteInfo = payload.eliteInfo || { isElite: false, source: '未评估', reason: '' };

  // 精英加分：每检出 1 名精英人物（双标记齐全），总分 +1
  // 用户 2026-10-03 指定：不设置加分上限（检出 N 人即 +N 分）
  let eliteBonus = 0;
  if (score !== null) {
    const eliteCount = Array.isArray(eliteInfo.people)
      ? eliteInfo.people.filter(function (p) { return p.isElite; }).length
      : (eliteInfo.isElite ? 1 : 0);
    // 知名企业家库/演示库快路径无 people 明细时按 1 人计
    eliteBonus = eliteCount;
    if (eliteBonus > 0) {
      score = Math.min(99, score + eliteBonus);
    }
  }

  // 覆盖率由调用方传入（唯一算法在 lib/caliber.js，读 shared/caliber.json）。
  // 传 null 表示"没算过"—— 此时不做门限判定，保持纯打分行为（测试与局部调用用）。
  const dimKeys = Object.keys(weights);
  const coverage = (typeof payload.coverage === 'number' && isFinite(payload.coverage))
    ? Math.round(payload.coverage) : null;
  const gate = coverage === null ? null
    : gateOf(coverage, {
      demo: !!payload.demo,
      trustConflict: !!payload.trustConflict,
      trustUnavailable: !!payload.trustUnavailable,
      // 未上市：无强制披露，结论最高 partial（口径 shared/caliber.json → caps.unlisted）
      unlisted: type === 'unlisted'
    });

  // 结论：先算原始判定，再由**门限**决定要不要给。
  // 为什么要放在这里而不是 analyze 里：v1 的「不给结论」是 analyze 事后把 verdict 改掉
  // （还留了一句"原判定为 X，已按纪律撤回"），等于引擎说一套、外面盖一套。
  // 现在只有一个地方决定"给不给结论"，引擎输出什么就是什么。
  let verdict;
  if (score === null) {
    verdict = { level: 'error', label: '数据不足，无法评分', color: 'red' };
  } else {
    verdict = verdictOf(score, type, eliteInfo);
  }
  let stability = gate ? gate.gate : null;
  if (gate && gate.gate === 'no_conclusion') {
    verdict = {
      level: 'insufficient',
      label: '信息不足，不给投资结论',
      color: 'grey',
      detail: gate.reason + '。本页只陈述已核到的事实，不给投资建议。'
    };
  } else if (payload.demo) {
    // 演示样本参与评分时，结论只能是「演示」，不能是投资建议。
    // v1 的做法是在真实结论前面加个「演示模式：」前缀，结论本身还是「目前适合投资」——
    // 那等于用演示数据给出投资建议，只是嘴上说了句免责。
    verdict = {
      level: 'demo',
      label: '演示数据，不构成投资建议',
      color: 'grey',
      detail: '本次评分含内置演示样本数据（联网渠道对该公司的覆盖有限），按口径不得据此给投资建议。'
    };
    stability = stability === 'ok' ? 'partial' : stability;
  } else if (gate && gate.gate === 'partial') {
    stability = 'partial';
  }

  // 分维度贡献明细（加权后得分）；上市公司时十维显示的是 80% 折算后的占比说明
  const dimWeightFactor = (dimScore !== null && stockScore !== null) ? 0.8 : 1;
  const breakdown = dimKeys.map(function (k) {
    const w = weights[k];
    const v = typeof dims[k] === 'number' && isFinite(dims[k]) ? dims[k] : null;
    return {
      key: k, label: DIM_LABELS[k],
      weight: Math.round(w * dimWeightFactor * 100) / 100, // 上市公司时按 80% 折算显示
      raw: v, weighted: v === null ? null : Math.round(v * w * 10) / 10 / 100 * 100 / 10
    };
  }).sort(function (a, b) { return b.weight - a.weight; });

  return {
    score: score === null ? null : Math.round(score * 10) / 10,
    dimScore: dimScore === null ? null : Math.round(dimScore * 10) / 10,
    stockScore,
    stockWeighted,
    eliteBonus,
    verdict,
    // coverage 不是自己算的：原样回传调用方给的数（null = 调用方没算）
    coverage: coverage,
    stability: stability,
    gate: gate,
    weights,
    breakdown,
    elite: eliteInfo,
    type
  };
}

module.exports = { WEIGHTS, DIM_LABELS, scoreCompany, weightedScore, verdictOf };
