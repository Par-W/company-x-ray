'use strict';

// 公开检索取证的离线单测（不联网）。
//
// 为什么这些断言必须存在：
//   未上市公司拿不到工商接口（爱企查/天眼查 302、企查查 WAF、百科 403），
//   只能从搜索结果摘要里取证。摘要里"隔壁公司"的登记信息就在几行内，
//   规则一松就会把别人的法定代表人安到这家头上 —— 那是编造，比查不到更糟。
//   这里把四种误判场景钉死：并列标签、隔壁公司、标签当人名、查询词回显。

const pr = require('../lib/public-registry');
const src = require('../lib/sources');

let fails = 0;
let passes = 0;
function ok(name, cond, detail) {
  if (cond) { passes += 1; console.log('  [OK] ' + name + (detail ? '  ' + detail : '')); }
  else { fails += 1; console.log('  [!!] ' + name + (detail ? '  ' + detail : '')); }
}
function eq(name, actual, expect) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expect),
    '实际 ' + JSON.stringify(actual) + ' / 期望 ' + JSON.stringify(expect));
}

console.log('[1] 同一公司名下的标签式字段');
{
  const text = '深圳市腾讯计算机系统有限公司 法定代表人：马化腾 注册资本：10000万元 '
    + '成立日期：1998-11-11 统一社会信用代码：91440300708461136T 经营状态：存续';
  const r = pr.parse(text, '深圳市腾讯计算机系统有限公司');
  eq('法定代表人', r.fields.legalPerson, '马化腾');
  eq('注册资本', r.fields.regCapital, '10000万元');
  eq('成立日期（统一成 ISO）', r.fields.establishDate, '1998-11-11');
  eq('统一社会信用代码', r.fields.creditNo, '91440300708461136T');
  eq('经营状态', r.fields.status, '存续');
}

console.log('\n[2] 必须拒绝：查询词回显（并列标签被当成人名）');
{
  // 实测踩过：整页正则把"法定代表人 注册资本 成立日期"里的"注册资本"当成法人姓名，
  // 甚至吐出"和成立日"这种四字"人名"。
  const r = pr.parse('华为技术有限公司 法定代表人 注册资本 成立日期 查询', '华为技术有限公司');
  eq('并列标签不产出任何字段', r.fields, {});
  ok('"注册资本"不是人名', pr.looksLikeName('注册资本') === false);
  ok('"和成立日"不是人名', pr.looksLikeName('和成立日') === false);
  ok('"马化腾"是人名', pr.looksLikeName('马化腾') === true);
}

console.log('\n[3] 必须拒绝：隔壁公司的登记信息');
{
  // 实测踩过：搜狗摘要里杭州一家公司的法人/信用代码紧挨着腾讯的公司名，
  // 按"窗口内出现公司名"就收下，等于把别人的登记安到腾讯头上。
  const text = '杭州某某科技有限公司 法定代表人：王朝炜 注册资本：100万元 '
    + '统一社会信用代码：91330103MA8FMHW564 深圳市腾讯计算机系统有限公司';
  const r = pr.parse(text, '深圳市腾讯计算机系统有限公司');
  eq('隔壁公司的字段一个都不收', r.fields, {});
}

console.log('\n[4] 标题式（爱企查/天眼查结果标题）');
{
  const r = pr.parse('张利东 - 北京字节跳动科技有限公司 - 法定代表人/高管/股东 - 爱企查',
    '北京字节跳动科技有限公司');
  eq('从标题结构取出法定代表人', r.fields.legalPerson, '张利东');
}

console.log('\n[5] 两家公司并列时只取我们这家');
{
  const text = '甲公司有限公司 法定代表人：张三 乙公司有限公司 法定代表人：李四';
  eq('取甲公司的人', pr.parse(text, '甲公司有限公司').fields.legalPerson, '张三');
  eq('取乙公司的人', pr.parse(text, '乙公司有限公司').fields.legalPerson, '李四');
}

console.log('\n[6] 字段本身要合格式');
{
  const r = pr.parse('某公司有限公司 成立日期：0000-00-00 经营状态：随便写写', '某公司有限公司');
  eq('成立日期 0000 年不收', r.fields.establishDate, undefined);
  eq('非"存续/注销"类状态词不收', r.fields.status, undefined);
}

console.log('\n[7] 检索核心词与新闻相关性过滤');
{
  // 必应中文分词漂移：查"蜜雪冰城"返回"蜜"字词典、查"北京字节跳动"返回"北京旅游"。
  eq('去掉市名与公司后缀', src.queryCore('深圳市腾讯计算机系统有限公司 法定代表人'), '腾讯');
  eq('保留品牌字', src.queryCore('蜜雪冰城'), '蜜雪');
  eq('去掉股票代码括号', src.queryCore('宁德时代（300750） 财报'), '宁德');
  const junk = [
    { title: '财务报告' }, { title: '蜜 的意思' }, { title: '蜜雪冰城注册资本增至3.6亿' }
  ];
  const kept = src.filterRelevantNews(junk, '蜜雪冰城 财报');
  ok('只留含品牌词的条目', kept.length === 1 && kept[0].title.indexOf('蜜雪冰城') === 0,
    JSON.stringify(kept.map(function (x) { return x.title; })));
  eq('一条都不相关时退回原列表（不把真结果筛没）',
    src.filterRelevantNews(junk, '某某完全无关的公司').length, 3);
}

console.log('\n' + '-'.repeat(52));
if (fails) {
  console.log('失败 ' + fails + ' 项（共 ' + (passes + fails) + ' 项）');
  process.exit(1);
}
console.log('全部通过（' + passes + ' 项）');
