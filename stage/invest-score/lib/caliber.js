'use strict';

// 口径层（Node 侧读取器）
//
// 为什么要有这个文件：v1 里「查可信度」按六锚点数、「投资评分」按十维加权，
// 两个数字各自成立、互不可比。统一的第一件事不是改算法，而是**让两边读同一份口径**。
// 口径本体在 shared/caliber.json —— 本文件只是把它读进来，并提供两个函数：
//   coverageOf(flags)  已取得数据的通道权重占比（唯一算法）
//   gateOf(pct, opts)  这个覆盖率够不够下结论（唯一门限）
// 任何一端想改门槛，只能改 JSON，不许在这里或 analyze.js 里另写一份。

const fs = require('fs');
const path = require('path');

const CALIBER_PATH = path.join(__dirname, '..', '..', '..', '..', 'shared', 'caliber.json');

let CALIBER;
try {
  CALIBER = JSON.parse(fs.readFileSync(CALIBER_PATH, 'utf8'));
} catch (e) {
  // 口径文件读不到就**不能**继续算 —— 用默认值兜底等于又造了第二套口径。
  throw new Error('口径文件读取失败（' + CALIBER_PATH + '）：' + e.message
    + ' —— 统一口径的前提是只有一份口径，不允许静默回退到内置默认值。');
}

const SOURCES = CALIBER.sources;
const TERMS = CALIBER.terms;
const CHANNELS = CALIBER.coverage.channels;
const TOTAL_WEIGHT = CHANNELS.reduce(function (a, c) { return a + c.weight; }, 0);
const GATE = CALIBER.gates.prescriptive;
const INVEST_LINE = Number(CALIBER.invest.line);

// 严重度：越靠前越"不够格下结论"
const RANK = { no_conclusion: 0, partial: 1, ok: 2 };

/**
 * 按通道权重算覆盖率。flags: {stock:bool, finance:bool, registry:bool, news:bool}
 * opts: { type: 'listed'|'unlisted' } —— 只看**这家公司适用**的通道：
 *   未上市公司没有行情与财报，若按固定四项算，最高只有 40%，永远「信息不足」。
 *   不适用（not applicable）与未取得（missing）必须分开。
 * 返回 { pct, got:[key], missing:[key], skipped:[key], applicable:[key], bySource, weight, applicableWeight }
 */
function coverageOf(flags, opts) {
  const o = opts || {};
  const type = o.type === 'unlisted' ? 'unlisted' : (o.type === 'listed' ? 'listed' : null);
  const applies = function (c) {
    if (!type) return true;                     // 不传类型：沿用旧口径（全部通道），兼容既有调用
    if (!Array.isArray(c.applies)) return true;
    return c.applies.indexOf(type) >= 0;
  };

  let got = 0, total = 0;
  const gotKeys = [], missKeys = [], skipKeys = [], appKeys = [];
  const bySource = {};
  for (const c of CHANNELS) {
    if (!applies(c)) { skipKeys.push(c.key); continue; }
    appKeys.push(c.key);
    total += c.weight;
    if (flags && flags[c.key]) {
      got += c.weight;
      gotKeys.push(c.key);
      const s = c.source;
      bySource[s] = (bySource[s] || 0) + c.weight;
    } else {
      missKeys.push(c.key);
    }
  }
  return {
    pct: total > 0 ? Math.round((got / total) * 100) : 0,
    got: gotKeys,
    missing: missKeys,
    skipped: skipKeys,
    applicable: appKeys,
    bySource: bySource,
    weight: got,
    applicableWeight: total
  };
}

/**
 * 覆盖率够不够下结论。opts: { demo, trustConflict, trustUnavailable, unlisted }
 * 返回 { gate:'no_conclusion'|'partial'|'ok', cap, reason, threshold }
 */
function gateOf(pct, opts) {
  const o = opts || {};
  let gate = 'ok';
  let reason = '';
  if (pct < GATE.no_conclusion) {
    gate = 'no_conclusion';
    reason = '已取得数据只覆盖 ' + pct + '%，低于 ' + GATE.no_conclusion + '% 的结论下限';
  } else if (pct < GATE.partial) {
    gate = 'partial';
    reason = '已取得数据覆盖 ' + pct + '%，未到 ' + GATE.partial + '% 的完整线';
  } else {
    reason = '已取得数据覆盖 ' + pct + '%，达到 ' + GATE.partial + '% 以上';
  }

  // 封顶条件：演示数据 / 主体冲突
  let cap = null;
  if (o.demo) {
    cap = GATE.caps.demo;
    if (RANK[cap] < RANK[gate]) {
      gate = cap;
      reason = '评分含演示样本数据，结论最高只能到「部分数据」';
    }
  }
  if (o.trustConflict) {
    cap = GATE.caps.trust_conflict;
    if (RANK[cap] < RANK[gate]) {
      gate = cap;
      reason = '可信度侧已发现主体不一致或资金往来异常，投资结论撤回';
    }
  }
  if (o.trustUnavailable) {
    cap = GATE.caps.trust_unavailable;
    if (RANK[cap] < RANK[gate]) {
      gate = cap;
      reason = '主体一致性未核验（后端不可用），结论最高只能到「部分数据」';
    }
  }
  if (o.unlisted && GATE.caps.unlisted) {
    cap = GATE.caps.unlisted;
    if (RANK[cap] < RANK[gate]) {
      gate = cap;
      reason = '未上市公司无强制信息披露（无财报），工商与报道即使都取到也只能到「部分数据」';
    }
  }
  return { gate: gate, cap: cap, reason: reason, threshold: GATE };
}

/** 维度出处（dimTrace.source 的中文标签）→ 来源等级 key */
const DIM_SOURCE = {
  '财报指标计算': 'financial',
  '内置演示样本': 'sample',
  '缺省中性': 'assumed',
  '无公开数据': 'assumed',        // v2.2.1：没依据就不给分，标"未评分"（不再填 50 冒充）
  '公开报道（2 条以上同向）': 'reported',
  // v2.3.0：交易所披露（巨潮公告）属于 caliber.json 的 verified 档
  // ——「团队逐条核对并附官方来源（本地事实库 / 工商登记 / 交易所披露），可复核」，
  // 原文就是这么写的，所以这里只是把已经定好的档位接上，不是新增一档。
  '交易所披露': 'verified',
  // 高管名单（东财 F10）来源是上市公司定期报告里的人员表，
  // 没有交易所公告那样可点开的原文，所以单列一条，不冒充「交易所披露」。
  '工商人员名单': 'verified'
};

function dimSourceClass(source, newsHits) {
  // 先查表：所有已知来源都在这张表里定义，函数不再另写一遍 if 链 ——
  // 之前这里是硬编码（只认财报/演示两行），结果表里新增的档位**永远不生效**：
  // 改了 DIM_SOURCE 却没有任何反应，排查半天才发现函数压根不读这张表。
  if (Object.prototype.hasOwnProperty.call(DIM_SOURCE, source)) {
    return DIM_SOURCE[source];
  }
  // 表外来源：只被新闻微调过的归"报道线索"，其余归"假设中性"（底下那 50 分是假设）
  if (newsHits > 0) return 'reported';
  return 'assumed';
}

/** 给报告用：某个来源等级算不算"已取得" */
function countsAsMeasured(cls) {
  return !!(SOURCES[cls] && SOURCES[cls].counts);
}

module.exports = {
  CALIBER, SOURCES, TERMS, CHANNELS, TOTAL_WEIGHT, GATE, INVEST_LINE,
  coverageOf, gateOf, dimSourceClass, countsAsMeasured, RANK
};
