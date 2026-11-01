'use strict';
// 冒烟测试：无 MCP Token 场景（纯兜底链路）+ 归一化单测
const nz = require('../lib/normalize');
const { buildProfile } = require('../lib/profile');

// Markdown 表格解析单测（天眼查返回格式）
const md = `| 姓名 | 职务 |
| --- | --- |
| 陈华 | 董事长,法定代表人,董事 |
| 王莉 | 代理总经理,董事 |`;
const ppl = nz.parseMarkdownPeople(md);
console.assert(ppl.length === 2 && ppl[0].name === '陈华' && ppl[0].position.includes('董事长'), 'md people parse FAIL: ' + JSON.stringify(ppl));
console.log('md-parse:', ppl.length, ppl.map(p => p.name).join('/'));

(async () => {
  // 兜底链路：未上市公司（无 F10、无 MCP）
  const r1 = await buildProfile('成都岑野餐饮管理有限公司');
  console.assert(r1.ok === true, 'unlisted FAIL');
  console.log('unlisted:', r1.ok, '| reg:', r1.reg && r1.reg.legalPerson, '| sh:', r1.shareholders.length, '| pp:', r1.personnel.length);

  // A股兜底链路
  const r2 = await buildProfile('海天味业');
  console.assert(r2.ok === true, 'haitian FAIL');
  console.log('haitian:', r2.ok, '| reg:', r2.reg && r2.reg.legalPerson, '| sh:', r2.shareholders.length, '| pp:', r2.personnel.length, '| ctl:', r2.actualController);
  console.log('SMOKE_DONE');
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
