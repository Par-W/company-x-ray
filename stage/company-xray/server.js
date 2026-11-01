'use strict';

// 公司人员透视 · X光 —— HTTP 服务（零依赖）

const http = require('http');
const path = require('path');
const fs = require('fs');
const { buildProfile } = require('./lib/profile');
const mcp = require('./lib/mcp');

const PORT = 3211;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8' });
  res.end(body);
}

const server = http.createServer(async function (req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/profile' && req.method === 'POST') {
    let body = '';
    req.on('data', function (c) {
      body += c;
      if (body.length > 10000) req.destroy();
    });
    req.on('end', async function () {
      try {
        const p = JSON.parse(body || '{}');
        if (!p.company || !String(p.company).trim()) {
          return send(res, 400, JSON.stringify({ ok: false, error: '请填写公司名称' }));
        }
        const result = await buildProfile(p.company);
        send(res, 200, JSON.stringify(result));
      } catch (e) {
        send(res, 500, JSON.stringify({ ok: false, error: '查询失败：' + e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    return send(res, 200, JSON.stringify({ ok: true, mcpConfigured: mcp.configStatus() }));
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'public', 'index.html')), 'text/html; charset=utf-8');
  }
  if (url.pathname === '/app.js') {
    return send(res, 200, fs.readFileSync(path.join(ROOT, 'public', 'app.js')), 'text/javascript; charset=utf-8');
  }
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204); return res.end();
  }

  send(res, 404, JSON.stringify({ ok: false, error: 'not found' }));
});

server.listen(PORT, function () {
  console.log('[company-xray] http://localhost:' + PORT + '  (Ctrl+C 退出)');
});
