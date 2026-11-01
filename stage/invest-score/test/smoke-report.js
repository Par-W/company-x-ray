'use strict';
// 报告生成器自洽性测试（不联网）
//
// 这份测试盯的是"报告能不能被读者核对"，不是文案好不好看：
//   ① 各维贡献分相加 = 十维加权平均（否则读者一加就发现对不上）
//   ② 计算链逐步重算 = 引擎输出（否则报告里的推导是假的）
//   ③ 没有数据的维度不能混进分母（否则等于给缺失维度打了 0 分）
//   ④ 未上市口径不出现股票章节，章节编号连续

const { scoreCompany, DIM_LABELS } = require('../lib/scoring');
const { buildReport } = require('../lib/report');

let fails = 0;
function ok(name, cond, detail) {
  console.log((cond ? '  [OK] ' : '  [XX] ') + name + (cond || !detail ? '' : '  << ' + detail + ' >>'));
  if (!cond) fails++;
}

function mk(dims, extra) {
  const sc = scoreCompany(Object.assign({ dims, eliteInfo: { isElite: false, people: [] } }, extra || {}));
  return {
    query: { company: '测试主体', legalPerson: '', type: (extra && extra.type) || 'listed' },
    dims, weights: sc.weights, dimScore: sc.dimScore, stockScore: sc.stockScore,
    stockWeighted: sc.stockWeighted, eliteBonus: sc.eliteBonus, score: sc.score,
    verdict: sc.verdict, coverage: 80, channels: [], dataNotes: [], registry: {},
    usingSeed: false, elapsedMs: 1500, analyzedAt: new Date().toISOString(),
    stockAssessment: { applicable: true, code: '600000', verdict: { label: '合理', color: 'green' }, reasons: [], positives: [], risks: [] },
    quote: { price: 10, pe: 20 }
  };
}

console.log('[1] 上市公司：贡献分与计算链');
const dims = { industry: 72, team: 80, tech: 60, product: 85, cost: 70, management: 75, customers: 68, brand: 90, finance: 66, litigation: 88 };
const r0 = mk(dims, { stockScore: 61 });
const rep = buildReport(r0, { labels: DIM_LABELS, dimTrace: {}, newsSignals: [], seed: null });

const sum = rep.dims.filter(d => d.contribution !== null).reduce((a, b) => a + b.contribution, 0);
ok('各维贡献分相加 = 十维加权平均',
  Math.abs(sum - r0.dimScore) < 0.05, 'sum=' + sum + ' dimScore=' + r0.dimScore);
ok('计算链自洽（重算 = 引擎输出）', rep.calculation.consistent === true,
  'final=' + rep.calculation.finalScore + ' engine=' + r0.score);
ok('计算链包含股票 20% 折算',
  rep.calculation.steps.some(s => s.label.indexOf('股票评估') >= 0));
ok('章节编号连续', rep.sections.every((s, i) => ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i] === s.no));
ok('每维都写了分数出处', rep.dims.every(d => d.source && d.basis));

console.log('[2] 缺失维度不计入分母');
const partial = { industry: 80, finance: 60 };
const r1 = mk(partial, { stockScore: 61 });
const rep1 = buildReport(r1, { labels: DIM_LABELS, dimTrace: {}, newsSignals: [], seed: null });
const miss = rep1.dims.filter(d => d.raw === null);
ok('缺失维度被标为未评分', miss.length === 8, miss.length + ' 个');
ok('缺失维度贡献分为 null（不是 0）', miss.every(d => d.contribution === null));
const sum1 = rep1.dims.filter(d => d.contribution !== null).reduce((a, b) => a + b.contribution, 0);
ok('只有 2 维时仍能对上', Math.abs(sum1 - r1.dimScore) < 0.05, 'sum=' + sum1 + ' dimScore=' + r1.dimScore);
ok('摘要点明了缺失维度', rep1.sections[0].bullets.some(b => b.indexOf('没有取得可用数据') >= 0));

console.log('[3] 未上市口径');
const r2 = mk({ industry: 60, product: 70 }, { type: 'unlisted' });
const rep2 = buildReport(r2, { labels: DIM_LABELS, dimTrace: {}, newsSignals: [], seed: null });
ok('未上市不出现股票章节', !rep2.sections.some(s => s.key === 'stock'));
ok('未上市计算链不含 20% 折算', !rep2.calculation.steps.some(s => s.label.indexOf('股票评估') >= 0));
ok('未上市口径文案正确', rep2.meta.typeLabel === '未上市公司');

console.log('[4] 内容密度：少废话、多实质');
const r3 = mk(dims, { stockScore: 61 });
const rep3 = buildReport(r3, {
  labels: DIM_LABELS,
  dimTrace: { finance: { source: '财报指标计算', newsHits: 0, newsDelta: 0 } },
  finScored: { signals: ['资产负债率 17.7%（≤40%，达标）', '货币资金占总资产 18.3%（充裕）'] },
  newsSignals: [], seed: null
});
const finDim = rep3.dims.find(d => d.key === 'finance');
ok('财报维度写出实际指标（不再只说"由财报计算得出"）',
  finDim.basis.indexOf('资产负债率 17.7%') >= 0, finDim.basis);
ok('不再出现旧模板句',
  rep3.dims.every(d => d.basis.indexOf('由最新财报的盈利、偿债与营运指标计算得出') < 0));
ok('每一维都带算式（得分 × 有效权重 ≈ 贡献）',
  rep3.dims.filter(d => d.raw !== null).every(d => d.expr && d.expr.indexOf('≈') > 0));
const sumBullets = rep3.sections[0].bullets.join(' | ');
ok('摘要给出投资线构成（十维折算 + 股票）', sumBullets.indexOf('投资线的构成') >= 0);
ok('摘要给出维度分布', sumBullets.indexOf('维度分布') >= 0);
const up = rep3.sections.find(s => s.key === 'upside');
ok('有改善空间（敏感性）章节且有条目', !!up && up.items.length > 0);
ok('敏感性条目给出分数变化', !!up && up.items[0].indexOf('总分 +') > 0);
const dis = rep3.sections.find(s => s.key === 'disclaimer');
ok('免责声明压成一段', !!dis && dis.paragraphs.length === 1, dis && dis.paragraphs.length);
ok('出处是读者能懂的中文，不是内部口径',
  rep3.dims.every(d => d.sourceLabel && d.sourceLabel.indexOf('缺省') < 0));

console.log('-'.repeat(52));
if (fails) { console.log('失败 ' + fails + ' 项'); process.exit(1); }
console.log('全部通过');
