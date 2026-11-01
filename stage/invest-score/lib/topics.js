'use strict';

// 公开话题统计：只做**关注度事实**，不参与投资结论。
//
// ⚠ 这里原本有一个 shouldInvestByTopics()：数据覆盖不足时，若话题正向占多就判"值得投资"。
//   它已按口径删除（2026-10-25），原因有两条：
//     ① 用「讨论得多」替代「数据够」，与「查不到标未知」的红线直接冲突；
//     ② 它其实从未真正跑过 —— 触发条件读的 coverage 恒为 100%（十维全被填成数字），
//        属于"既错又死"的代码，一旦有人把 coverage 修正，它就会开始用热度翻盘结论。
//   现在只保留统计函数，结论一律由 lib/scoring.js 按 shared/caliber.json 的门限给出。

const POSITIVE_RE = /(利好|增长|盈利|创新|突破|领先|龙头|第一|冠军|获奖|荣誉|签约|中标|合作|扩张|上涨|涨停|爆款|热销|好评|推荐|期待|看好|加持|赋能|共赢|里程碑|开源|公益|慈善)/;
const NEGATIVE_RE = /(亏损|下滑|暴跌|跌停|裁员|降薪|诉讼|纠纷|处罚|罚款|违规|违法|造假|暴雷|跑路|退市|破产|清算|维权|投诉|退款|差评|质疑|辟谣|做空|警示|危机|风险提示|被查|立案|调查)/;
const HOT_RE = /(热搜|热议|刷屏|爆火|火爆|引爆|出圈|话题|关注度|讨论)/;

// 从话题标题列表中统计正向率与讨论度
function analyzeTopics(topics) {
  let pos = 0;
  let neg = 0;
  let neutral = 0;
  let hot = 0;
  const posSamples = [];
  const negSamples = [];

  for (const it of (topics || [])) {
    const t = (it.title || '') + ' ' + (it.snippet || '');
    const isPos = POSITIVE_RE.test(t);
    const isNeg = NEGATIVE_RE.test(t);
    if (HOT_RE.test(t)) hot++;
    if (isPos && !isNeg) {
      pos++;
      if (posSamples.length < 5) posSamples.push({ title: it.title, url: it.url });
    } else if (isNeg && !isPos) {
      neg++;
      if (negSamples.length < 5) negSamples.push({ title: it.title, url: it.url });
    } else {
      neutral++;
    }
  }

  const total = topics ? topics.length : 0;
  return {
    total,
    pos,
    neg,
    neutral,
    hot,
    posRatio: total > 0 ? pos / total : 0,
    negRatio: total > 0 ? neg / total : 0,
    posSamples,
    negSamples
  };
}

// 兜底判定已删除（2026-10-25）。
// 曾经的 shouldInvestByTopics(stats, coverage)：覆盖不足 + 正向占多 + 讨论度够 → 判"值得投资"。
// 删除理由见文件头。若将来要恢复"用话题做判断"，必须先改 shared/caliber.json 的
// sources 表，把"话题"登记成一个**明确不计入结论**的来源 —— 不许在代码里绕开口径。

module.exports = { analyzeTopics, POSITIVE_RE, NEGATIVE_RE, HOT_RE };
