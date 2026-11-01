'use strict';

// SEC EDGAR 解析单测（离线，不打网络）
// 重点测「期间对齐」——这是这块最容易出错、也最致命的地方：
// 拿季度累计当年度、拿 2018 年的收入配 2025 年的成本，算出来的毛利率是负的，
// 而且表面上一切正常。

const assert = require('assert');
const sec = require('../lib/sec-edgar');
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
    console.log('  [!!] ' + name + '  ' + String(e.message).slice(0, 140));
  }
}

function node(arr) {
  return { units: { USD: arr } };
}

console.log('\n[A] 年度序列：只认年度报表的 FY 值');

const revArr = [
  { end: '2018-09-29', val: 265595, form: '10-K', fp: 'FY', filed: '2018-11-05' },
  { end: '2019-09-28', val: 260174, form: '10-K', fp: 'FY', filed: '2019-10-31' },
  { end: '2020-09-26', val: 274515, form: '10-K', fp: 'FY', filed: '2020-10-30' },
  // 季度数据混在里面
  { end: '2021-06-26', val: 81434, form: '10-Q', fp: 'Q3', filed: '2021-07-28' },
  // 年度报表里的 Q4 分季列示
  { end: '2020-09-26', val: 64698, form: '10-K', fp: 'Q4', filed: '2020-10-30' }
];

t('只收 form=10-K 且 fp=FY 的条目', function () {
  const s = sec.annualSeries({ Revenues: node(revArr) }, 'Revenues');
  assert.strictEqual(s.length, 3);
  assert.deepStrictEqual(s.map(function (x) { return x.end; }),
    ['2018-09-29', '2019-09-28', '2020-09-26']);
});
t('季度值不会被当成年度值（10-Q / fp=Q4 都排除）', function () {
  const s = sec.annualSeries({ Revenues: node(revArr) }, 'Revenues');
  assert.ok(s.every(function (x) { return x.val !== 81434 && x.val !== 64698; }));
});
t('20-F（外国私人发行人）也算年度报表', function () {
  const arr = [{ end: '2026-03-31', val: 1023670, form: '20-F', fp: 'FY', filed: '2026-06-01' }];
  assert.strictEqual(sec.annualSeries({ Revenues: node(arr) }, 'Revenues').length, 1);
});
t('同一期间被重复申报时取 filed 最新的那条', function () {
  const arr = [
    { end: '2025-09-27', val: 100, form: '10-K', fp: 'FY', filed: '2025-11-01' },
    { end: '2025-09-27', val: 111, form: '10-K', fp: 'FY', filed: '2026-01-15' }
  ];
  const s = sec.annualSeries({ Revenues: node(arr) }, 'Revenues');
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].val, 111);
});
t('概念不存在时返回空数组，不抛错', function () {
  assert.deepStrictEqual(sec.annualSeries({}, 'Revenues'), []);
});

console.log('\n[B] 同比：期间必须真的相差一年');

const twoYear = [
  { end: '2024-09-28', val: 1000, form: '10-K', fp: 'FY', filed: '2024-11-01' },
  { end: '2025-09-27', val: 1100, form: '10-K', fp: 'FY', filed: '2025-11-01' }
];
t('正常一年间隔 → 10%', function () {
  assert.ok(Math.abs(sec.yoy(twoYear, '2025-09-27') - 10) < 0.01);
});
t('间隔不是一年（比如半年报）→ NaN，不硬算', function () {
  const s = [
    { end: '2025-06-30', val: 500, form: '10-K', fp: 'FY', filed: '2025-08-01' },
    { end: '2025-12-31', val: 1000, form: '10-K', fp: 'FY', filed: '2026-02-01' }
  ];
  assert.ok(isNaN(sec.yoy(s, '2025-12-31')));
});
t('上一期基数为 0 → NaN（避免除零得出 Infinity）', function () {
  const s = [
    { end: '2024-12-31', val: 0, form: '10-K', fp: 'FY', filed: '2025-02-01' },
    { end: '2025-12-31', val: 100, form: '10-K', fp: 'FY', filed: '2026-02-01' }
  ];
  assert.ok(isNaN(sec.yoy(s, '2025-12-31')));
});
t('找不到对应期间 → NaN', function () {
  assert.ok(isNaN(sec.yoy(twoYear, '1999-01-01')));
});

console.log('\n[C] 时点值：不能取到锚点之后的数据');

const assetsArr = [
  { end: '2024-09-28', val: 364980, form: '10-K' },
  { end: '2025-09-27', val: 359241, form: '10-K' },
  { end: '2026-03-28', val: 371000, form: '10-Q' }   // 比年报更新，但超出锚点窗口
];
t('锚点 2025-09-27 → 取同日的值', function () {
  const v = sec.latestInstant({ Assets: node(assetsArr) }, 'Assets', '2025-09-27', 45);
  assert.strictEqual(v.val, 359241);
});
t('锚点之后的数据不会被误取（102 天外）', function () {
  const v = sec.latestInstant({ Assets: node(assetsArr) }, 'Assets', '2025-09-27', 45);
  assert.notStrictEqual(v.val, 371000);
});
t('没有锚点附近的条目 → null（宁可空着也不错配）', function () {
  const v = sec.latestInstant({ Assets: node(assetsArr) }, 'Assets', '2010-01-01', 45);
  assert.strictEqual(v, null);
});

console.log('\n[D] 合并：只补空缺，不覆盖东财已有值');

t('东财已有的字段保持不变', function () {
  const fin = { revenue: 100, totalAssets: 500 };
  const out = sec.mergeInto(fin, { revenue: 999, receivable: 12, opCashflow: 30 });
  assert.strictEqual(out.revenue, 100, '已有值被覆盖了');
  assert.strictEqual(out.receivable, 12);
  assert.strictEqual(out.opCashflow, 30);
});
t('记录补了哪些字段（要给用户看"补了什么"）', function () {
  const out = sec.mergeInto({ revenue: 100 }, { receivable: 12, opCashflow: 30 });
  assert.deepStrictEqual(out.secFilled.sort(), ['opCashflow', 'receivable']);
});
t('不把 NaN / 非数字写进去', function () {
  const out = sec.mergeInto({ revenue: 100 }, { receivable: NaN, opCashflow: undefined });
  assert.ok(!('receivable' in out));
});

console.log('\n[E] 港股披露：繁简与误判');

t('繁体「辭任」能被识别为高管变动', function () {
  assert.ok(d.classify('執行董事辭任').indexOf('management') >= 0);
});
t('繁体「訴訟」能识别', function () {
  assert.ok(d.classify('有關訴訟之公告').indexOf('litigation') >= 0);
});
t('繁体「盈利警告」算风险提示', function () {
  assert.ok(d.classify('盈利警告').indexOf('warning') >= 0);
});
t('「代表委任表格」是股东会委托书，不算人事变动', function () {
  const c = d.classify('將於2026年9月30日舉行的臨時股東會之代表委任表格');
  assert.strictEqual(c.indexOf('management'), -1, '把 proxy form 当成了高管变动');
});
t('正常「委任董事」仍算治理变动', function () {
  assert.ok(d.classify('委任獨立非執行董事').indexOf('management') >= 0);
});
t('五位数港股代码 → hkex', function () {
  assert.strictEqual(d.marketOf('02097'), 'hkex');
  assert.strictEqual(d.marketOf('00700'), 'hkex');
});
t('四位港股代码补零后也能识别', function () {
  assert.strictEqual(d.marketOf('700'.padStart(5, '0')), 'hkex');
});
t('美股 ticker → null（不覆盖，不是"没代码"）', function () {
  assert.strictEqual(d.marketOf('BABA'), null);
});

console.log('\n[F] 概念表覆盖打分函数需要的字段');

t('打分要的字段都有候选概念', function () {
  const need = ['revenue', 'operateCost', 'netProfit', 'totalAssets', 'totalLiab',
    'monetary', 'receivable', 'opCashflow', 'researchExpense', 'saleExpense', 'manageExpense'];
  const miss = need.filter(function (k) { return !sec.CONCEPTS[k] || !sec.CONCEPTS[k].length; });
  assert.deepStrictEqual(miss, [], '缺：' + miss.join('、'));
});

console.log('\n' + '-'.repeat(52));
if (fails.length) {
  console.log('失败 ' + fails.length + ' 项：' + fails.join('、'));
  process.exit(1);
}
console.log('全部通过（' + pass + ' 项）');
