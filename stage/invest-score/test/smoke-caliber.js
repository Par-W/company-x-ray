'use strict';

// 口径单测：证明「覆盖率只有一个算法、门限只有一个来源」是真的，而不是写在注释里。
//
// 为什么这些断言必须存在：
//   v1 的 coverage 恒等于 100%（十维全被填成数字），于是"数据不足"的守卫从未生效过，
//   外面只好再写一套 realCoverage 来补 —— 两套并存，谁也不知道该信哪个。
//   这组用例把"假设中性不算已取得""覆盖率不足就不给结论""演示数据不出投资建议"
//   三条钉死，谁改回去谁红。

const caliber = require('../lib/caliber');
const { scoreCompany } = require('../lib/scoring');

let fails = 0;
let passes = 0;

function ok(name, cond, detail) {
  if (cond) {
    passes += 1;
    console.log('  [OK] ' + name + (detail ? '  ' + detail : ''));
  } else {
    fails += 1;
    console.log('  [!!] ' + name + (detail ? '  ' + detail : ''));
  }
}

function eq(name, actual, expect) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expect),
    '实际 ' + JSON.stringify(actual) + ' / 期望 ' + JSON.stringify(expect));
}

const FULL = { stock: true, finance: true, registry: true, news: true };
const NONE = { stock: false, finance: false, registry: false, news: false };

// 十维都"有数字"的样本 —— 关键用例：v1 会因此报覆盖率 100%
const DIMS_ALL_70 = {
  industry: 70, team: 70, tech: 70, product: 70, cost: 70,
  management: 70, customers: 70, brand: 70, finance: 70, litigation: 70
};

console.log('[1] 口径文件自洽');
ok('通道权重之和 = 100', caliber.TOTAL_WEIGHT === 100, String(caliber.TOTAL_WEIGHT));
ok('每个通道的 source 都在来源表里',
  caliber.CHANNELS.every(function (c) { return !!caliber.SOURCES[c.source]; }),
  caliber.CHANNELS.map(function (c) { return c.key + '→' + c.source; }).join(' '));
ok('封顶档位取值合法（只能是 no_conclusion / partial）',
  Object.keys(caliber.GATE.caps).every(function (k) {
    return caliber.GATE.caps[k] === 'no_conclusion' || caliber.GATE.caps[k] === 'partial';
  }), JSON.stringify(caliber.GATE.caps));
ok('投资线来自口径文件', caliber.INVEST_LINE === caliber.CALIBER.invest.line,
  String(caliber.INVEST_LINE));
ok('术语「信息不足」已登记', caliber.TERMS.insufficient === '信息不足',
  caliber.TERMS.insufficient);

console.log('\n[2] 覆盖率：按通道权重，不按"维度有没有数字"');
eq('什么都没取到 = 0%', caliber.coverageOf(NONE).pct, 0);
eq('只有财报 = 30%', caliber.coverageOf({ finance: true }).pct, 30);
eq('行情+财报 = 60%', caliber.coverageOf({ stock: true, finance: true }).pct, 60);
eq('四个通道全有 = 100%', caliber.coverageOf(FULL).pct, 100);
eq('未取得的通道会列出来', caliber.coverageOf({ news: true }).missing,
  ['stock', 'finance', 'registry']);
eq('按来源分组统计', caliber.coverageOf(FULL).bySource,
  { verified: 50, financial: 30, reported: 20 });

console.log('\n[3] 门限：下限 50 / 完整线 75');
eq('0% → 不给结论', caliber.gateOf(0).gate, 'no_conclusion');
eq('49% → 不给结论', caliber.gateOf(49).gate, 'no_conclusion');
eq('50% → 部分数据', caliber.gateOf(50).gate, 'partial');
eq('74% → 部分数据', caliber.gateOf(74).gate, 'partial');
eq('75% → 完整', caliber.gateOf(75).gate, 'ok');
eq('100% → 完整', caliber.gateOf(100).gate, 'ok');

console.log('\n[4] 封顶条件');
eq('演示数据封顶到 partial', caliber.gateOf(100, { demo: true }).gate, 'partial');
eq('主体冲突 → 直接不给结论', caliber.gateOf(100, { trustConflict: true }).gate, 'no_conclusion');
eq('主体未核验 → 封顶 partial', caliber.gateOf(100, { trustUnavailable: true }).gate, 'partial');
ok('封顶不会把低档抬高', caliber.gateOf(10, { demo: true }).gate === 'no_conclusion',
  caliber.gateOf(10, { demo: true }).gate);

console.log('\n[5] 打分引擎：覆盖率不足就真的不给结论');
const base = { dims: DIMS_ALL_70, type: 'listed' };

const rNoCov = scoreCompany(Object.assign({}, base));
ok('不传覆盖率时保持纯打分（向后兼容）', rNoCov.verdict.level === 'invest',
  rNoCov.verdict.level + ' / score=' + rNoCov.score);

const rZero = scoreCompany(Object.assign({}, base, { coverage: 0 }));
ok('覆盖率 0% 就算十维都有数字，也不给结论',
  rZero.verdict.level === 'insufficient', rZero.verdict.level + ' / ' + rZero.verdict.label);
ok('十维都有数字不再等于覆盖率 100%',
  rZero.coverage === 0 && rZero.score !== null,
  'coverage=' + rZero.coverage + ' score=' + rZero.score);

const rPartial = scoreCompany(Object.assign({}, base, { coverage: 60 }));
ok('覆盖率 60% → 有结论但标稳定性有限',
  rPartial.verdict.level === 'invest' && rPartial.stability === 'partial',
  rPartial.verdict.level + ' / ' + rPartial.stability);

const rOk = scoreCompany(Object.assign({}, base, { coverage: 80 }));
ok('覆盖率 80% → 完整结论', rOk.verdict.level === 'invest' && rOk.stability === 'ok',
  rOk.verdict.level + ' / ' + rOk.stability);

const rDemo = scoreCompany(Object.assign({}, base, { coverage: 100, demo: true }));
ok('演示数据不出投资建议（哪怕分数够）',
  rDemo.verdict.level === 'demo', rDemo.verdict.level + ' / ' + rDemo.verdict.label);

const rConflict = scoreCompany(Object.assign({}, base, { coverage: 100, trustConflict: true }));
ok('主体冲突时投资结论撤回', rConflict.verdict.level === 'insufficient',
  rConflict.verdict.level + ' / ' + rConflict.verdict.label);

const rUnavail = scoreCompany(Object.assign({}, base, { coverage: 100, trustUnavailable: true }));
ok('主体未核验时封顶 partial', rUnavail.stability === 'partial', String(rUnavail.stability));

console.log('\n[6] 维度来源等级');
eq('财报计算 → financial', caliber.dimSourceClass('财报指标计算', 0), 'financial');
eq('演示样本 → sample', caliber.dimSourceClass('内置演示样本', 0), 'sample');
// v2.3.0：来源等级改为「查表」后，''缺省中性'' 不再因为一条新闻就升格成报道线索 ——
// 有报道依据的维度会被 analyze 显式标成「公开报道（2 条以上同向）」，走下面那条。
eq('有报道依据（2 条同向）→ reported', caliber.dimSourceClass('公开报道（2 条以上同向）', 2), 'reported');
eq('缺省中性 → assumed（新闻有命中也不算已取得）', caliber.dimSourceClass('缺省中性', 2), 'assumed');
eq('纯缺省 → assumed（假设中性）', caliber.dimSourceClass('缺省中性', 0), 'assumed');
// v2.3.0 新增：交易所披露是 verified 档（口径文件原文：本地事实库 / 工商登记 / 交易所披露）
eq('交易所披露 → verified', caliber.dimSourceClass('交易所披露', 0), 'verified');
eq('高管名单 → verified', caliber.dimSourceClass('工商人员名单', 0), 'verified');
ok('表外来源仍按新闻命中降级为报道线索',
  caliber.dimSourceClass('某个没登记过的来源', 3) === 'reported');
ok('assumed 不算已取得', caliber.countsAsMeasured('assumed') === false);
ok('sample 不算已取得', caliber.countsAsMeasured('sample') === false);
ok('memory 不算已取得', caliber.countsAsMeasured('memory') === false);
ok('verified / financial / reported 算已取得',
  ['verified', 'financial', 'reported'].every(caliber.countsAsMeasured));

console.log('\n[7] 覆盖率分母只算「适用通道」');
{
  // 未上市公司没有行情与财报。若仍按固定四项算，它最高只有 40%
  // —— 永远是「信息不足」，有数据也不给结论。这不是谨慎，是拿「不适用」当「没取得」。
  const listedFull = caliber.coverageOf(FULL, { type: 'listed' });
  eq('上市公司四项全取得 → 100%', listedFull.pct, 100);
  eq('上市公司不跳过任何通道', listedFull.skipped, []);

  const unFull = caliber.coverageOf({ registry: true, news: true }, { type: 'unlisted' });
  eq('未上市（工商+报道）→ 100%', unFull.pct, 100);
  eq('未上市跳过行情与财报', unFull.skipped, ['stock', 'finance']);
  eq('未上市分母 = 40', unFull.applicableWeight, 40);

  const unNewsOnly = caliber.coverageOf({ news: true }, { type: 'unlisted' });
  eq('未上市只有报道 → 50%', unNewsOnly.pct, 50);

  const listedThin = caliber.coverageOf({ registry: true, news: true }, { type: 'listed' });
  eq('上市公司只拿到工商+报道 → 40%', listedThin.pct, 40);
  ok('上市公司 40% 不给结论', caliber.gateOf(listedThin.pct).gate === 'no_conclusion',
    caliber.gateOf(listedThin.pct).gate);

  // 未上市封顶：无强制披露（无财报），方向可用、不能宣称完整
  eq('未上市 100% 仍封顶 partial', caliber.gateOf(unFull.pct, { unlisted: true }).gate, 'partial');
  eq('未上市 40% 仍然不给结论', caliber.gateOf(40, { unlisted: true }).gate, 'no_conclusion');
  eq('上市公司 100% 且无封顶 → ok', caliber.gateOf(100).gate, 'ok');

  // 端到端：引擎在未上市 + 全覆盖时，结论应当是"方向可用"，不是"信息不足"
  const rUn = scoreCompany(Object.assign({}, base, { type: 'unlisted', coverage: 100 }));
  ok('未上市全覆盖：结论不被撤回', rUn.verdict.level !== 'insufficient',
    rUn.verdict.level + ' / ' + rUn.stability);
  ok('未上市全覆盖：稳定性标 partial', rUn.stability === 'partial', String(rUn.stability));
}

console.log('\n' + '-'.repeat(52));
if (fails) {
  console.log('失败 ' + fails + ' 项（共 ' + (passes + fails) + ' 项）');
  process.exit(1);
}
console.log('全部通过（' + passes + ' 项）');
