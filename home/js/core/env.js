/* env.js · 运行环境与全局工具
 * IS_CLIENT：桌面客户端壳（无浏览器插件、无地址栏）。
 * IS_LOCAL：file:// 直开（走离线快照）。
 * esc / sk / state / debounce：全局小工具。 */

  export const IS_CLIENT = !!(window.chrome && window.chrome.webview);
  if (IS_CLIENT) {
    // 「自动检测」整条线在客户端里都不成立：没有插件 -> 没有配置、没有心跳、没有拦截记录。
    // 隐藏清单必须收全（只藏配置入口时，侧栏的「插件检测记录」和首页的红色横幅还留着）。
    const _g = document.getElementById('navGuard'); if (_g) _g.classList.add('off');
    const _al = document.querySelector('.x-nav a[data-route="alerts"]'); if (_al) _al.classList.add('off');
    const _pe = document.getElementById('pillExt'); if (_pe) _pe.classList.add('off');
  }
  export const IS_LOCAL = location.protocol === 'file:';
  export const ORIGIN_BASE = IS_LOCAL ? '' : location.origin;
  export const _fetch = window.fetch.bind(window);
  /* 运行态：null=还没判定。三档，按能力从强到弱：
       'local' —— 本机后端（全功能）
       'cloud' —— 云端只读后端（AppWrite Function，能联网核验，但无 Node 引擎、无持久磁盘）
       'demo'  —— 只有界面 + 打包时的离线快照
     为什么要分三档而不是"有/没有后端"：三者的能力边界差别很大，
     而用户最需要知道的是"我现在看到的东西是哪一档算出来的"。
     RUNTIME.demo 保留为「不是本机后端」的简写，兼容既有探针与文案判断。 */
  export const CLOUD = {
    endpoint: 'https://sgp.cloud.appwrite.io/v1',
    project: '6ae6a81d0010c6980d02',
    fn: 'xray-api',
  };
  export const RUNTIME = { mode: null, demo: null };
  /* 判定顺序：本机后端 → 云端函数 → 离线快照。
     ⚠ 为什么不用"看这个请求本身失败没"：AppWrite 边缘对不存在的路径返回的是
       **JSON 404**（{"type":"general_route_not_found"}），和真实 FastAPI 的
       {"detail":"Not Found"} 长得一样 —— 按"响应不是 JSON 就算没后端"判**会漏判**，
       实测托管站上 /api/v2/query 正是 application/json 的 404。
     所以用一个**形状已知**的接口做探针：/api/v1/ext/status 正常时必有 state 字段。 */
  let _modeProbe = null;
  function probeLocal() {
    return _fetch(ORIGIN_BASE + '/api/v1/ext/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json().catch(() => null) : null))
      .then((d) => !!(d && typeof d.state === 'string'))
      .catch(() => false);
  }
  function probeCloud() {
    return callCloud('/x/status', {}).then((r) => {
      if (r.status !== 200) return false;
      return r.text().then((t) => { try { const j = JSON.parse(t); return !!(j && (j.ok || j.status || j.service)); } catch (e) { return false; } });
    }).catch(() => false);
  }
  export function backendReady() {
    if (RUNTIME.mode) return Promise.resolve(RUNTIME.mode);
    if (_modeProbe) return _modeProbe;
    _modeProbe = probeLocal()
      .then((ok) => (ok ? 'local' : probeCloud().then((c) => (c ? 'cloud' : 'demo'))))
      .catch(() => 'demo')
      .then((mode) => {
        RUNTIME.mode = mode;
        RUNTIME.demo = (mode === 'demo');
        if (mode === 'demo') showHostedDemoNotice();
        else if (mode === 'cloud') showCloudNotice();
        return mode;
      });
    return _modeProbe;
  }
  /* 把所有 /api/* 转成一次 AppWrite 函数调用（Lambda 式，不是常驻端口）。
     函数把真实响应塞在 responseBody 里，这里还原成一个标准 Response，
     上层代码（actions.js 等）完全不用知道自己连的是本机还是云端。 */
  function callCloud(path, init) {
    const method = ((init && init.method) || 'GET').toUpperCase();
    const body = (init && init.body != null) ? String(init.body) : '';
    return _fetch(CLOUD.endpoint + '/functions/' + CLOUD.fn + '/executions', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': CLOUD.project },
      body: JSON.stringify({
        body: body, method: method, path: path,
        headers: { 'content-type': 'application/json' },
      }),
    }).then((r) => r.json()).then((d) => {
      const status = Number(d.responseStatusCode || 200);
      return new Response(String(d.responseBody == null ? '' : d.responseBody),
        { status: status, headers: { 'Content-Type': 'application/json' } });
    });
  }
  function enterHostedDemo(path, init) {
    RUNTIME.mode = 'demo';
    RUNTIME.demo = true;
    showHostedDemoNotice();
    if (path.indexOf('/api/v2/query') === 0) return offlineQueryResponse(init && init.body);
    return Promise.resolve(new Response(JSON.stringify({
      ok: false, demo: true,
      note: '当前是静态托管演示版，没有后端：该接口不可用。',
    }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
  }
  export function offlineQueryResponse(body) {
    let name = '';
    try { name = (typeof body === 'string' ? JSON.parse(body || '{}') : (body || {})).name || ''; }
    catch (e) { name = ''; }
    name = String(name).trim();
    const lib = (window.XrayOfflineUnified || {});
    const entries = lib.entries || {};
    const aliases = lib.aliases || {};
    const key = entries[name] ? name
      : (aliases[name] && entries[aliases[name]] ? aliases[name]
        : Object.keys(entries).find((k) => name && (k.indexOf(name) >= 0 || name.indexOf(k) >= 0)));
    if (key && entries[key]) {
      return Promise.resolve(new Response(JSON.stringify(entries[key]), {
        status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    // 查无：返回**同形**的空结果，不编造任何一个字段
    return Promise.resolve(new Response(JSON.stringify({
      schema: lib._schema || 'xray.unified.v1',
      query: { name: name, at: '' },
      verdict: {
        trust: 'unknown', trust_label: '离线预览：库内无此记录',
        trust_hint: '当前是直接打开文件（未连后端），只能查内置离线库 —— 覆盖 '
          + (lib._count || 0) + ' 个已复核品牌。其它企业需要后端引擎；'
          + '请双击「启动并打开首页.bat」后使用完整功能。查无记录 ≠ 有问题。',
        in_library: false, verified: 0, grey: 0, mismatch: 0, anchors: [], fund: {},
      },
      fields: [], conflicts: [],
      sources: {
        local: { state: 'miss', brand: null, entity: null, fields: 0 },
        cloud: { state: 'offline', note: '离线模式：无法检索云端。', snippets: null, hosts: null, fields: 0 },
      },
      limits: [
        '离线快照只含内置已复核库，收录有限：查无记录 ≠ 有问题。',
        '离线模式拿不到云端线索，因此不会有"两侧对照"与冲突提示。',
        '要看完整口径请用后端启动（双击「启动并打开首页.bat」）。',
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }

  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.charAt(0) === '/') {
      // 离线直开时：统一查询走本地快照，其余接口如实失败（由 UI 各处 try/catch 兜住）
      if (IS_LOCAL && input.indexOf('/api/v2/query') === 0) {
        return offlineQueryResponse(init && init.body);
      }
      /* 托管站判定见 backendReady()：用已知形状的接口探一次，别靠"这个请求失败没"。
         判定之前先等探针结果，避免首屏那几个请求各判一次、出现前后不一致。 */
      if (!IS_LOCAL) {
        if (input.indexOf('/api/') !== 0) { input = ORIGIN_BASE + input; return _fetch(input, init); }
        return backendReady().then((mode) => {
          if (mode === 'local') return _fetch(ORIGIN_BASE + input, init);
          if (mode === 'cloud') return callCloud(input, init);
          return enterHostedDemo(input, init);
        });
      }
      input = ORIGIN_BASE + input;        // 其余 -> file:///api/...（会失败，但错误可读）
    }
    return _fetch(input, init);
  };
  export function showLocalNotice() {
    if (document.getElementById('xrayLocalNotice')) return;
    const host = document.body || document.documentElement;
    if (!host) return;
    const bar = document.createElement('div');
    bar.id = 'xrayLocalNotice';
    bar.style.cssText = 'position:sticky;top:0;z-index:99999;padding:10px 14px;'
      + 'background:var(--x-sev-bg-warn);border-bottom:1px solid var(--x-line);color:var(--x-ink);'
      + 'font:13px/1.7 system-ui,-apple-system,sans-serif';
    bar.innerHTML = '<b>本地预览模式</b>：直接打开文件、未连后端。'
      + '<b>「查询」可用</b>（内置 ' + ((window.XrayOfflineUnified || {})._count || 0)
      + ' 个已复核品牌的离线结论 —— 只有本地库那一列，<b>云端线索与两侧对照需要后端</b>）；'
      + '投资评分 / 人员透视 / 变化追踪 / 名单管理需要后端。<br>'
      + '要用完整功能：回项目根目录双击 <code>启动并打开首页.bat</code>，'
      + '或访问 <a href="http://127.0.0.1:8000/home/">http://127.0.0.1:8000/home/</a>。';
    host.insertBefore(bar, host.firstChild);
  }
  export function hideLocalNotice() {
    const el = document.getElementById('xrayLocalNotice');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* 云端只读版横幅。与"离线快照版"必须写得不一样 ——
     前者是**真的联网核验**，后者只是打包时的旧快照；
     两句话都挂同一条文案，等于把两者混为一谈。 */
  export function showCloudNotice() {
    if (document.getElementById('xrayCloudNotice') ||
        document.getElementById('xrayDemoNotice')) return;
    const host = document.body || document.documentElement;
    if (!host) return;
    const bar = document.createElement('div');
    bar.id = 'xrayCloudNotice';
    bar.style.cssText = 'position:sticky;top:0;z-index:99999;padding:10px 14px;'
      + 'background:var(--x-sev-bg-warn);border-bottom:1px solid var(--x-line);color:var(--x-ink);'
      + 'font:13px/1.7 system-ui,-apple-system,sans-serif';
    bar.innerHTML = '<b>云端只读版</b>：核验由云端引擎完成，<b>联网查证是真的</b>'
      + '（巨潮、东方财富、交易所等一手来源），但每次查询约需 <b>10–20 秒</b>。'
      + '<b>投资评分、人员透视、名单编辑、追踪、AI 设置需要本机版</b>'
      + '（依赖本机 Node 引擎与可持久写入的磁盘），本页点这些会明确提示不可用。'
      + '<br>要用全功能：回项目根双击 <code>启动并打开首页.bat</code>。';
    host.insertBefore(bar, host.firstChild);
  }

  /* 托管演示态横幅：**常驻**，不自动消失。
     这份站点是静态托管，没有后端 —— 查询用的是打包时的离线快照。
     挂牌措辞必须同时说清三件事：这是演示、数据是快照、查无记录 ≠ 有问题。 */
  export function showHostedDemoNotice() {
    if (document.getElementById('xrayDemoNotice')) return;
    const host = document.body || document.documentElement;
    if (!host) return;
    const bar = document.createElement('div');
    bar.id = 'xrayDemoNotice';
    bar.style.cssText = 'position:sticky;top:0;z-index:99999;padding:10px 14px;'
      + 'background:var(--x-sev-bg-warn);border-bottom:1px solid var(--x-line);color:var(--x-ink);'
      + 'font:13px/1.7 system-ui,-apple-system,sans-serif';
    bar.innerHTML = '<b>静态演示版</b>：本页托管在静态站点上，<b>没有后端</b>，'
      + '查询走的是打包时的内置快照（' + ((window.XrayOfflineUnified || {})._count || 0)
      + ' 个已复核品牌），<b>不是实时核验</b>。'
      + '<b>查无记录 ≠ 有问题</b>，只代表不在这份快照里。'
      + '投资评分 / 人员透视 / 变化追踪 / 名单管理需要后端，此版本不可用。'
      + '<br>要用完整功能：在本机项目根双击 <code>启动并打开首页.bat</code>，'
      + '或访问 <a href="http://127.0.0.1:8000/home/">http://127.0.0.1:8000/home/</a>。';
    host.insertBefore(bar, host.firstChild);
  }

  if (IS_LOCAL) {
    if (document.body) showLocalNotice();
    else document.addEventListener('DOMContentLoaded', showLocalNotice);
    window.__xrayCheckBackend().then((ok) => { if (ok) hideLocalNotice(); });
  }
  export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  export const sk = (n) => Array.from({ length: n || 5 }, () => '<div class="x-sk"></div>').join('');
  export const state = { lastVerdict: null, lastProfile: null };
  /* ⚠ LS_RECENT 搬到了 core/store.js —— 那里是「最近查询」读写与键名的唯一来源。
     以前这个键在两处各定义一次（值还不同：'xray-recent' 与 'xray:recent'），
     写入与读取对不上，「最近核验」列表永远是空的。 */
  export const debounce = (fn, ms) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  export const AI_DONE = new Set();      // 同一次会话里，同一家企业的基线 AI 整理只跑一次
  /* 视图级轮询定时器。
     ⚠⚠ 原来写的是 `export let viewTimer = null`，alerts.js / guard.js 里
       `viewTimer = setInterval(...)` —— **import 绑定是只读的**，
       对导入方重新赋值会抛 `TypeError: Assignment to constant variable`。
       表现是「检测记录」「自动检测」两页一进去就中断（后面那句代码不执行）。
       与 result.js 的 uniSeq 是同一类错，同一个修法：改成对象容器，
       改的是**属性**而不是绑定。 */
  export const viewTimer = { id: null };
  export const stopViewTimer = () => { if (viewTimer.id) { clearInterval(viewTimer.id); viewTimer.id = null; } };
  export async function pollExt() {
    const el = $('#pillExt');
    try {
      const d = await (await fetch('/api/v1/ext/status', { cache: 'no-store' })).json();
      const m = { active: ['插件已开启', 'live', 'var(--x-ok)'],
        idle: ['插件曾在线', 'idle', 'var(--x-grey)'], never_seen: ['插件未检测到', 'dead', 'var(--x-bad)'] };
      const [t, c, col] = m[d.state] || ['插件未知', '', 'var(--x-muted)'];
      el.innerHTML = `<span class="x-dot ${c}"></span>` + esc(t);
      el.style.color = col;
      el.title = d.note + (d.seconds_ago != null ? `（最后心跳 ${d.seconds_ago} 秒前）` : '');
    } catch (e) { el.innerHTML = '<span class="x-dot dead"></span>插件未知'; }
  }
  export async function pollBackend() {
    const el = $('#pillBackend');
    /* ⚠ fetch 对 4xx/5xx **不会 reject** —— 原来只看"有没有抛异常"，
       所以后端明明返回 503 也照样显示"后端在线"。演示态下这条会自相矛盾
       （横幅说没有后端，胶囊说在线），必须按 r.ok 判。 */
    try { const r = await fetch('/api/v1/ext/status', { cache: 'no-store' });
      if (!r.ok) throw new Error('http ' + r.status);
      const cloud = RUNTIME.mode === 'cloud';
      el.innerHTML = '<span class="x-dot live"></span>' + (cloud ? '云端在线' : '后端在线');
      el.style.color = 'var(--x-ok)';
    } catch (e) { el.innerHTML = '<span class="x-dot dead"></span>后端离线'; el.style.color = 'var(--x-bad)'; }
  }
