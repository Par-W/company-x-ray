'use strict';
// analyze 全链路 E2E 测试：上市公司（茅台）+ 未上市公司
const { analyze } = require('../lib/analyze');

(async () => {
  console.log('=== 茅台 listed ===');
  const r = await analyze({ company: '贵州茅台酒股份有限公司', legalPerson: '', type: 'listed' });
  console.log('score:', r.score, '| verdict:', r.verdict.label, '| coverage:', r.coverage + '%', '| eliteBonus:', r.eliteBonus);
  console.log('registry.source:', r.registry.source, '| 法代:', r.registry.reg && r.registry.reg.legalPerson, '| 实控:', r.registry.actualController);
  console.log('shareholders:', r.registry.shareholders.length, '| personnel:', r.registry.personnelCount);
  const regCardData = r.registry.personnel.slice(0, 3).map(p => p.name + '(' + p.position + ')').join(' ');
  console.log('personnel top3:', regCardData);
  console.log('channels:', r.channels.map(c => c.name + '[' + c.status + ']').join(' | '));

  console.log('=== 未上市测试公司 ===');
  const r2 = await analyze({ company: '成都岑野餐饮管理有限公司', legalPerson: '', type: 'unlisted' });
  console.log('score:', r2.score, '| verdict:', r2.verdict.label, '| coverage:', r2.coverage + '%');
  console.log('registry.source:', r2.registry.source, '| shareholders:', r2.registry.shareholders.length, '| channels ok:', r2.channels.filter(c => c.status === 'ok').length);
  console.log('E2E_DONE');
})().catch(e => { console.error('FAIL', e && (e.stack || e.message)); process.exit(1); });
