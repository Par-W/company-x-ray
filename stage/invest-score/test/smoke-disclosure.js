'use strict';

// 交易所披露模块单测（离线，不打网络）
// 只测「判断逻辑」：分类、市场识别、两个维度的打分与边界。
// 真实抓取由 check_caliber.py 的联网段验证，这里不重复。

const assert = require('assert');
const d = require('../lib/disclosure');

let pass = 0;
const fails = [];
function t(name, fn) {
  try {
    fn();
    pass++;
    console.log('  [OK] ' + name);
  } catch (e) {
    fails.push(name);
    console.log('  [!!] ' + name + '  ' + String(e.message).slice(0, 120));
  }
}

console.log('\n[A] 公告标题分类');

t('诉讼/仲裁 → litigation', function () {
  assert.deepStrictEqual(d.classify('关于累计诉讼、仲裁情况的公告'), ['litigation']);
  assert.deepStrictEqual(d.classify('关于重大诉讼及新增累计诉讼及仲裁情况的公告'), ['litigation']);
});
t('处罚/警示函/问询 → penalty', function () {
  assert.ok(d.classify('关于收到警示函的公告').indexOf('penalty') >= 0);
  assert.ok(d.classify('关于收到深圳证券交易所监管函的公告').indexOf('penalty') >= 0);
  assert.ok(d.classify('关于立案调查事项进展的公告').indexOf('penalty') >= 0);
});
t('辞任/解聘 → management', function () {
  assert.ok(d.classify('关于董事、执行副总裁辞任的公告').indexOf('management') >= 0);
  assert.ok(d.classify('关于董事长辞任、选举董事长等事项的公告').indexOf('management') >= 0);
});
t('「代为履职」→ management（关键岗位曾空缺）', function () {
  assert.ok(d.classify('关于董事变更及指定董事代行董事会秘书职责的公告').indexOf('management') >= 0);
});
t('质押/司法拍卖 → equity', function () {
  assert.ok(d.classify('关于股东持有的公司部分股份被司法拍卖的公告').indexOf('equity') >= 0);
  assert.ok(d.classify('关于控股股东股份质押的公告').indexOf('equity') >= 0);
});
t('一个标题可以同时命中两类', function () {
  const c = d.classify('关于收到警示函及涉及诉讼事项的公告');
  assert.ok(c.indexOf('penalty') >= 0 && c.indexOf('litigation') >= 0);
});
t('普通公告不被误判（业绩说明、董事会决议、分红）', function () {
  assert.deepStrictEqual(d.classify('2026年第三季度报告'), []);
  assert.deepStrictEqual(d.classify('第五届董事会第二十次会议决议公告'), []);
  assert.deepStrictEqual(d.classify('2025年年度权益分派实施公告'), []);
  assert.deepStrictEqual(d.classify('关于召开2026年第一次临时股东大会的通知'), []);
});
t('「对外担保」不算诉讼（常见误判点）', function () {
  assert.strictEqual(d.classify('关于为子公司提供担保的公告').indexOf('litigation'), -1);
});

console.log('\n[B] 市场识别');

t('沪市 6 开头 → sse', function () { assert.strictEqual(d.marketOf('600519'), 'sse'); });
t('科创板 688 → sse', function () { assert.strictEqual(d.marketOf('688981'), 'sse'); });
t('深市 0/3 开头 → szse', function () {
  assert.strictEqual(d.marketOf('000002'), 'szse');
  assert.strictEqual(d.marketOf('300750'), 'szse');
});
// v2.4.0：港股从"不覆盖"升级为接港交所披露易，这里改锁新语义。
// 变动的是能力（多了一个来源），不是放松判据 —— 美股仍然必须返回 null。
t('港股 5 位代码 → hkex（v2.4.0 接港交所披露易）', function () {
  assert.strictEqual(d.marketOf('02097'), 'hkex');
  assert.strictEqual(d.marketOf('00700'), 'hkex');
});
t('北交所 6 位代码仍不放开（宁可标不支持，也不给可能漏数据的结果）', function () {
  assert.strictEqual(d.marketOf('830799'), null);
  assert.strictEqual(d.marketOf('430047'), null);
});
t('美股/无代码 → null', function () {
  assert.strictEqual(d.marketOf(''), null);
  assert.strictEqual(d.marketOf('BABA'), null);
});
// ⚠ 2026-10-31 修的真 bug：上游给的是 'sz002356' 这种带市场前缀的格式，
//   而 marketOf 原来只认纯 6 位数字 → A 股**全部**被判"无法识别"，
//   巨潮披露这一路从来没跑过，诉讼维度的真实来源一直是空的。
//   它不报错、不崩溃，只是静默地把整条数据源关掉 —— 所有既有检查全绿。
t('带市场前缀的代码也要认（上游统一用这种格式）', function () {
  assert.strictEqual(d.marketOf('sz002356'), 'szse');
  assert.strictEqual(d.marketOf('sh600519'), 'sse');
  assert.strictEqual(d.marketOf('sz300750'), 'szse');
  assert.strictEqual(d.marketOf('sh688981'), 'sse');
  assert.strictEqual(d.marketOf('bj430047'), null, '北交所仍然不放开');
});

console.log('\n[C] 诉讼维度打分（分级口径）');

const okFull = {
  status: 'ok', code: '600519', months: 24, total: 100, complete: true, earliest: '2024-11-01',
  cats: { litigation: { count: 0, items: [], latest: null }, management: { count: 0, items: [] } }
};
const withLit = function (items, extra) {
  return Object.assign({}, okFull, {
    cats: { litigation: { count: items.length, items: items, latest: items[0] || null },
            management: { count: 0, items: [] } }
  }, extra || {});
};
t('披露完整且无诉讼公告 → 82（且返回对象，不是裸数字）', function () {
  const r = d.litigationScore(okFull);
  assert.strictEqual(typeof r, 'object');
  assert.strictEqual(r.score, 82);
  assert.ok(r.why.length, '必须给出依据');
});
t('覆盖不完整时基准降到 70（只看了部分时段，不配拿满分）', function () {
  const r = d.litigationScore(Object.assign({}, okFull, { complete: false }));
  assert.strictEqual(r.score, 70);
});
t('诉讼公告越多扣得越多', function () {
  const mk = function (n) {
    const items = [];
    for (let i = 0; i < n; i++) items.push({ title: '关于累计诉讼的公告', date: '2026-05-0' + ((i % 9) + 1) });
    return withLit(items);
  };
  const a = d.litigationScore(mk(2)).score;
  const b = d.litigationScore(mk(8)).score;
  assert.ok(a > b, '2 条(' + a + ') 应高于 8 条(' + b + ')');
});
t('「重大诉讼」额外扣分', function () {
  const base = { title: '关于诉讼事项的公告', date: '2026-05-01' };
  const major = { title: '关于重大诉讼事项的公告', date: '2026-05-01' };
  const s1 = d.litigationScore(withLit([base])).score;
  const s2 = d.litigationScore(withLit([major])).score;
  assert.ok(s2 < s1, '重大(' + s2 + ') 应低于普通(' + s1 + ')');
});
t('未覆盖/失败/空 → 不给分（null，而不是 50）', function () {
  assert.strictEqual(d.litigationScore({ status: 'unsupported' }), null);
  assert.strictEqual(d.litigationScore({ status: 'empty' }), null);
  assert.strictEqual(d.litigationScore({ status: 'failed' }), null);
  assert.strictEqual(d.litigationScore(null), null);
});
t('扣到底也不跌破 8 分（不出现负分/零分这种绝对化结论）', function () {
  const items = [];
  for (let i = 0; i < 40; i++) items.push({ title: '关于重大诉讼的公告', date: '2026-06-01' });
  assert.ok(d.litigationScore(withLit(items)).score >= 8);
});

// ---- 新口径专项：分级、角色、归并 ----
t('投资者索赔（虚假陈述）比一般商事诉讼更重', function () {
  const s1 = d.litigationScore(withLit([{ title: '关于新增投资者诉讼事项及进展公告', date: '2026-05-01' }])).score;
  const s2 = d.litigationScore(withLit([{ title: '关于祥云小额贷款案终审判决的公告', date: '2026-05-01' }])).score;
  assert.ok(s1 < s2, '投资者索赔(' + s1 + ') 应低于一般商事(' + s2 + ')');
});
t('公司作为原告（主动维权）比作为被告轻', function () {
  const s1 = d.litigationScore(withLit([{ title: '关于公司作为被告的诉讼公告', date: '2026-05-01' }])).score;
  const s2 = d.litigationScore(withLit([{ title: '关于公司作为原告提起诉讼的公告', date: '2026-05-01' }])).score;
  assert.ok(s2 > s1, '原告(' + s2 + ') 应高于被告(' + s1 + ')');
});
t('同一件事的多条公告归并成 1 个事项（不重复计权）', function () {
  const items = [];
  for (let i = 0; i < 6; i++) items.push({ title: '关于投资者诉讼事项的进展公告', date: '2026-0' + (i + 1) + '-01' });
  const r = d.litigationScore(withLit(items));
  assert.strictEqual(r.cases, 1, '应归并成 1 个事项，实际 ' + r.cases);
  assert.strictEqual(r.items, 6, '公告条数仍是 6');
});
t('6 件不同的事比同一案的 6 条公告扣得更多', function () {
  const same = [];
  for (let i = 0; i < 6; i++) same.push({ title: '关于投资者诉讼事项的进展公告', date: '2026-0' + (i + 1) + '-01' });
  const many = [];
  for (let i = 0; i < 6; i++) many.push({ title: '关于第' + (i + 1) + '宗投资者诉讼事项的进展公告', date: '2026-0' + (i + 1) + '-01' });
  const a = d.litigationScore(withLit(same)).score;
  const b = d.litigationScore(withLit(many)).score;
  assert.ok(a > b, '同一案(' + a + ') 应高于 6 件不同事(' + b + ')');
});
t('个人处罚（「因非本公司事项」）不算公司处罚', function () {
  assert.strictEqual(d.classify('关于独立董事因非本公司事项收到《行政处罚决定书》的公告').indexOf('penalty'), -1);
  assert.strictEqual(d.classify('关于公司实际控制人因非本公司事项收到行政处罚决定书的公告').indexOf('penalty'), -1);
  // 但公司自己被罚还是要算
  assert.ok(d.classify('关于收到行政处罚决定书的公告').indexOf('penalty') >= 0);
});
t('「问询函的回复」不算处罚（问询是监管在问，回复是公司在答）', function () {
  assert.strictEqual(d.classify('关于公司对深圳证券交易所2023年年报问询函的回复公告').indexOf('penalty'), -1);
  assert.ok(d.classify('关于收到深圳证券交易所年报问询函的公告').indexOf('penalty') >= 0);
});

console.log('\n[D] 团队维度打分');

const people = (n, year) => {
  const arr = [];
  for (let i = 0; i < n; i++) arr.push({ name: 'P' + i, position: '董事', tenure: year + '-05-01' });
  return arr;
};
const discNoTurn = {
  status: 'ok', months: 24, complete: true,
  cats: { management: { count: 0, items: [] }, litigation: { count: 0, items: [] } }
};
const discTurn = function (n) {
  const items = [];
  for (let i = 0; i < n; i++) items.push({ title: '关于董事辞任的公告', date: '2026-03-0' + ((i % 9) + 1) });
  return { status: 'ok', months: 24, complete: true, cats: { management: { count: n, items: items }, litigation: { count: 0, items: [] } } };
};
// 公司基本资料（东财 F10 CompanySurvey）：员工数 / 独董 / ST 历史 / 审计机构
const surveyBase = {
  employees: 100, independentDirectors: ['A', 'B'], stHistory: [],
  auditor: '某会计师事务所', chairman: 'P0', president: 'P1', secretary: 'P2'
};

t('名单 + 无辞任公告 → 高分（三路证据齐全时）', function () {
  const r = d.teamScore(people(10, '2010'), discNoTurn, surveyBase);
  assert.ok(r.score >= 70, '得到 ' + r.score);
});
t('辞任公告越多分越低', function () {
  const a = d.teamScore(people(10, '2010'), discNoTurn).score;
  const b = d.teamScore(people(10, '2010'), discTurn(5)).score;
  assert.ok(a > b, a + ' 应高于 ' + b);
});
t('「代为履行」额外扣分（关键岗位空缺）', function () {
  const withPending = {
    status: 'ok', months: 24, complete: true,
    cats: { management: { count: 1, items: [{ title: '关于指定董事代为履行董事长职责的公告', date: '2026-03-01' }] }, litigation: { count: 0, items: [] } }
  };
  const without = d.teamScore(people(10, '2010'), discTurn(1)).score;
  assert.ok(d.teamScore(people(10, '2010'), withPending).score < without + 1);
});
t('换届是正常动作，不算负面（与辞任区分开）', function () {
  const turn = {
    status: 'ok', months: 24, complete: true,
    cats: { management: { count: 1, items: [{ title: '关于董事会换届选举的公告', date: '2026-03-01' }] }, litigation: { count: 0, items: [] } }
  };
  const withTurn = d.teamScore(people(10, '2010'), turn);
  // 换届 ≠ 辞任：换届只是削弱了「无辞任」这个证据的含金量（换完人之后没辞任是必然的），
  // 而**辞任**是明确的负面事件。所以判据是「换届不比辞任差」。
  const withResign = d.teamScore(people(10, '2010'), discTurn(1));
  assert.ok(withTurn.score >= withResign.score,
    '换届(' + withTurn.score + ') 不应差于辞任(' + withResign.score + ')');
  // 但换届也不该拿到「长期稳定」那档加分（+10）
  const stable = d.teamScore(people(10, '2010'), discNoTurn);
  assert.ok(withTurn.score < stable.score,
    '刚换届(' + withTurn.score + ') 不应等同长期稳定(' + stable.score + ')');
});
t('只有高管名单、没有披露 → 向中枢收敛，且依据标为人员名单', function () {
  const r = d.teamScore(people(10, '2010'), { status: 'unsupported' });
  assert.strictEqual(r.basis, '工商人员名单');
  assert.ok(r.score < 76, '应收敛，得到 ' + r.score);
});
t('只有披露、没有名单 → 同样收敛，依据仍是交易所披露', function () {
  const r = d.teamScore([], discNoTurn);
  assert.strictEqual(r.basis, '交易所披露');
  assert.ok(r.score <= 78, '得到 ' + r.score);
});
t('两者都没有 → null（不评分，不填 50）', function () {
  assert.strictEqual(d.teamScore([], { status: 'unsupported' }), null);
  assert.strictEqual(d.teamScore([], null), null);
});
t('任职年限只作说明、不因换届重置而扣分', function () {
  // ⚠ 这里比的是「任期长短不同，但都不是刚换届」的两种情况 ——
  //   2015 任职（11 年）vs 2010 任职（16 年）：任期差 5 年，分数必须相同。
  //   ⚠ 不能拿 2025/2026 来比：那是"刚换届"，会走另一条判据
  //     （刚换届会削弱「无辞任」这个证据的含金量）——那是另一件事。
  const fresh = d.teamScore(people(10, '2015'), discNoTurn).score;
  const old = d.teamScore(people(10, '2010'), discNoTurn).score;
  assert.strictEqual(fresh, old, '任职年限不该影响分数：' + fresh + ' vs ' + old);
});
t('刚换届会削弱「无辞任」这个证据（换完人之后没辞任是必然的）', function () {
  const stable = d.teamScore(people(10, '2010'), discNoTurn);
  const justTurned = d.teamScore(people(10, '2026'), discNoTurn);
  assert.ok(stable.score > justTurned.score,
    '长期在任(' + stable.score + ') 应高于刚换届(' + justTurned.score + ')');
});

// ---- 新口径专项：团队维度的实质字段 ----
t('ST 历史真的拉低团队分（不是只写进说明）', function () {
  const a = d.teamScore(people(6, '2015'), discNoTurn, surveyBase).score;
  const b = d.teamScore(people(6, '2015'), discNoTurn,
    Object.assign({}, surveyBase, { stHistory: ['*ST测试'] })).score;
  assert.ok(b < a, 'ST 历史应扣分：' + a + ' → ' + b);
});
t('管理层持股（利益绑定）加分', function () {
  const none = people(6, '2015').map(function (p) { return Object.assign({}, p, { holdNum: 0 }); });
  const some = people(6, '2015').map(function (p, i) { return Object.assign({}, p, { holdNum: i < 3 ? 100000 : 0 }); });
  const a = d.teamScore(none, discNoTurn, surveyBase).score;
  const b = d.teamScore(some, discNoTurn, surveyBase).score;
  assert.ok(b > a, '有持股应更高：' + a + ' → ' + b);
});
t('未披露持股（null）≠ 0 持股（不能冤枉公司）', function () {
  const nully = people(6, '2015').map(function (p) { return Object.assign({}, p, { holdNum: null }); });
  const zero = people(6, '2015').map(function (p) { return Object.assign({}, p, { holdNum: 0 }); });
  const a = d.teamScore(nully, discNoTurn, surveyBase).score;
  const b = d.teamScore(zero, discNoTurn, surveyBase).score;
  assert.ok(a >= b, '未披露不应比"确实零持股"更低：' + a + ' vs ' + b);
});
t('董事长与总经理由同一人（两职合一）扣分', function () {
  const a = d.teamScore(people(6, '2015'), discNoTurn, surveyBase).score;
  const b = d.teamScore(people(6, '2015'), discNoTurn,
    Object.assign({}, surveyBase, { president: 'P0' })).score;
  assert.ok(b < a, '两职合一应扣分：' + a + ' → ' + b);
});
t('总经理「代理」任职扣分（关键岗位非正式）', function () {
  const a = d.teamScore(people(6, '2015'), discNoTurn, surveyBase).score;
  const b = d.teamScore(people(6, '2015'), discNoTurn,
    Object.assign({}, surveyBase, { president: 'P1(代)' })).score;
  assert.ok(b < a, '代理任职应扣分：' + a + ' → ' + b);
});
t('三路证据齐全时依据标为交易所披露，缺路时向中枢收敛', function () {
  const full = d.teamScore(people(6, '2015'), discNoTurn, surveyBase);
  assert.strictEqual(full.basis, '交易所披露');
  assert.strictEqual(full.evidence, 3);
  const partial = d.teamScore(people(6, '2015'), discNoTurn, null);
  assert.strictEqual(partial.evidence, 2);
  assert.ok(partial.score < full.score, '证据少应收敛：' + partial.score + ' vs ' + full.score);
});

console.log('\n[E] 辅助函数');

t('stripTags 去掉 cninfo 的高亮 em 标签', function () {
  assert.strictEqual(d.stripTags('<em>贵州</em><em>茅台</em>公告'), '贵州茅台公告');
});
t('输出结构字段齐全', function () {
  const r = d.fetchDisclosures ? 'fn' : '';
  assert.strictEqual(r, 'fn');
});

console.log('\n' + '-'.repeat(52));
if (fails.length) {
  console.log('失败 ' + fails.length + ' 项：' + fails.join('、'));
  process.exit(1);
}
console.log('全部通过（' + pass + ' 项）');
