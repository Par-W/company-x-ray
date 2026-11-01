'use strict';

// 主体核验接线单测（用假后端，不依赖真服务、不联网）
//
// 为什么单独测：投资评分要读可信度的结论来决定"给不给投资结论"，
// 这条链断了不会报错 —— 只会静默地"当作没问题"，那正是最危险的失败方式
// （v1 的病症就是两个界面互不知情）。所以四种状态必须逐一钉死：
//   ok+一致   → 不拦截
//   ok+偏低   → 拦截（撤回投资结论）
//   后端 404  → 标 error，不当作干净
//   连不上    → 标 unavailable，不当作干净

const http = require('http');

let fails = 0;
let passes = 0;

function ok(name, cond, detail) {
  if (cond) { passes += 1; console.log('  [OK] ' + name + (detail ? '  ' + detail : '')); }
  else { fails += 1; console.log('  [!!] ' + name + (detail ? '  ' + detail : '')); }
}

// 假后端：按路径返回不同结论
function startFake(cb) {
  const srv = http.createServer(function (req, res) {
    let body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      if (req.url !== '/api/v1/trust') { res.writeHead(404); return res.end('{}'); }
      const name = (JSON.parse(body || '{}').name) || '';
      if (name === '正常公司') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          trust: 'high', trust_label: '高 · 公开信息一致', verified: 4,
          in_library: true, coverage: 67, mismatch: 0,
          fund: { state: 'ok', summary: { red_hard: 0, red_soft: 0 } }
        }));
      }
      if (name === '资金异常公司') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          trust: 'low', trust_label: '偏低 · 资金往来异常', verified: 2,
          in_library: true, coverage: 33, mismatch: 0,
          fund: { state: 'ok', summary: { red_hard: 2, red_soft: 1 } }
        }));
      }
      res.writeHead(500);
      res.end('{"error":"boom"}');
    });
  });
  srv.listen(0, '127.0.0.1', function () { cb(srv, srv.address().port); });
}

function main() {
  startFake(function (srv, port) {
    // trust.js 在 require 时读环境变量，必须先设再 require
    process.env.XRAY_BACKEND = 'http://127.0.0.1:' + port;
    delete require.cache[require.resolve('../lib/trust')];
    const { fetchTrust } = require('../lib/trust');

    (async function () {
      console.log('[1] 后端可用时的三种结论');

      const a = await fetchTrust('正常公司');
      ok('正常公司 → state=ok', a.state === 'ok', a.state);
      ok('正常公司 → 不拦截', a.conflict === false, String(a.conflict));
      ok('带回已核项数', a.verified === 4, String(a.verified));
      ok('带回可信度覆盖率（与投资侧同构）', a.coverage === 67, String(a.coverage));

      const b = await fetchTrust('资金异常公司');
      ok('资金异常 → state=ok', b.state === 'ok', b.state);
      ok('资金异常 → 触发拦截', b.conflict === true, String(b.conflict));
      ok('能说出是哪一档', String(b.label).indexOf('资金往来异常') >= 0, b.label);
      ok('带回风险笔数', b.fund.redHard === 2, String(b.fund.redHard));

      const c = await fetchTrust('未知公司');
      ok('后端 500 → 不当作干净', c.state === 'error', c.state);
      ok('后端 500 → 不触发拦截（只是未核验）', c.conflict === false, String(c.conflict));
      ok('文案写明"未做核验"', String(c.note).indexOf('未做') >= 0, c.note.slice(0, 40));

      console.log('\n[2] 后端连不上');
      process.env.XRAY_BACKEND = 'http://127.0.0.1:1';   // 必然连不上
      delete require.cache[require.resolve('../lib/trust')];
      const t2 = require('../lib/trust');
      const d = await t2.fetchTrust('任何公司', { timeoutMs: 800 });
      ok('连不上 → state=unavailable', d.state === 'unavailable', d.state);
      ok('连不上 → 不触发拦截', d.conflict === false, String(d.conflict));
      ok('连不上 → 文案写明"不代表没问题"', String(d.note).indexOf('不代表没问题') >= 0,
        d.note.slice(0, 50));

      console.log('\n[3] 显式关闭');
      const e = await t2.fetchTrust('任何公司', { disabled: true });
      ok('disabled → state=off', e.state === 'off', e.state);
      ok('disabled → 不拦截', e.conflict === false, String(e.conflict));

      srv.close();
      console.log('\n' + '-'.repeat(52));
      if (fails) { console.log('失败 ' + fails + ' 项（共 ' + (passes + fails) + ' 项）'); process.exit(1); }
      console.log('全部通过（' + passes + ' 项）');
    })();
  });
}

main();
