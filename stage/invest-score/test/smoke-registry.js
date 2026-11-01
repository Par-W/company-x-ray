'use strict';
// registry 层冒烟测试：东财降级路径（无 MCP Token）
const registry = require('../lib/registry');
const { fetchEmShareholders, fetchEmManagers } = registry;

(async () => {
  console.log('mcpConfigured:', JSON.stringify(registry.mcpConfigured()));

  const sh = await fetchEmShareholders('sh600519');
  console.log('shareholders:', sh.shareholders.length, 'endDate:', sh.endDate, 'controller:', sh.actualController);
  console.log('top3:', sh.shareholders.slice(0, 3).map(s => s.name + ' ' + s.ratio + '%').join(' / '));

  const mg = await fetchEmManagers('sh600519');
  console.log('managers:', mg.personnel.length, 'legalPerson:', mg.legalPerson);
  console.log('first:', JSON.stringify({ name: mg.personnel[0].name, position: mg.personnel[0].position, resumeLen: mg.personnel[0].resume.length }));

  const r = await registry.fetchRegistry({ company: '贵州茅台酒股份有限公司', stock: { code: 'sh600519', market: 'sh', shortName: '贵州茅台' } });
  console.log('--- fetchRegistry ---');
  console.log('source:', r.source, '| reg.legalPerson:', r.reg && r.reg.legalPerson);
  console.log('shareholders:', r.shareholders.length, '| personnel:', r.personnel.length, '| controller:', r.actualController);
  console.log('channels:', r.channels.map(c => c.name + '[' + c.status + ']').join(' | '));
  console.log('notes[0..2]:', r.notes.slice(0, 3).join(' || ').slice(0, 300));

  // 未上市公司路径（无 stock）：应全部降级、不崩溃
  const r2 = await registry.fetchRegistry({ company: '某不存在的未上市测试公司xyz', stock: null });
  console.log('--- unlisted path ---');
  console.log('source:', r2.source, '| shareholders:', r2.shareholders.length, '| personnel:', r2.personnel.length, '| channels:', r2.channels.length);
  console.log('ALL_OK');
})().catch(e => { console.error('FAIL', e && e.message); process.exit(1); });
