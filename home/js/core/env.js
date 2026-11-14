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
  /* 运行态：null=还没判定。按能力从强到弱：
       'local' —— 本机后端（完整后端 + 实时 Node 引擎 + 本机磁盘）
       'cloud' —— 云端函数。3.4.1 起分两档，见 CLOUD_TIER：
                   lite = 网页精简版（5 个只读核验能力点，不保存任何东西）
                   full = 云端完整版（同一份 FastAPI app + Storage 状态 + 三份快照）
       'demo'  —— 只有界面 + 打包时的离线快照
     为什么要分档而不是"有/没有后端"：能力边界差别很大，
     而用户最需要知道的是"我现在看到的东西是哪一档算出来的"。
     RUNTIME.demo 保留为「不是本机后端」的简写，兼容既有探针与文案判断。 */
  export const CLOUD = {
    endpoint: 'https://sgp.cloud.appwrite.io/v1',
    project: '6ae6a81d0010c6980d02',
    fnLite: 'xray-lite',      // 3.4.1 网页精简版：5 个能力点，不接 Storage、不带快照
    fnFull: 'xray-api',       // 3.4.0 云端完整版：保留在线，随时可回退
  };
  /* 两档并存，切换只改函数 ID —— 不用重新部署，也不动任何已存的数据。
     默认 lite：网页版对外就是 5 个点。?full=1 / ?lite=1 显式改档并记住，
     之后开新页面不用每次带参数；清掉浏览器数据会回到默认精简版。
     ⚠ 精简 ≠ 离线：lite 档仍然请求真后端，只是不保存、不算快照。 */
  export const CLOUD_TIER = (() => {
    try {
      const q = new URLSearchParams(location.search || '');
      if (q.get('full') === '1') { localStorage.setItem('xray.cloudTier', 'full'); return 'full'; }
      if (q.get('lite') === '1') { localStorage.setItem('xray.cloudTier', 'lite'); return 'lite'; }
      return localStorage.getItem('xray.cloudTier') === 'full' ? 'full' : 'lite';
    } catch (e) { return 'lite'; }
  })();
  CLOUD.fn = CLOUD_TIER === 'full' ? CLOUD.fnFull : CLOUD.fnLite;
  export const RUNTIME = { mode: null, demo: null };

  /* 云端访客标识：随机生成、只存在这个浏览器里，不是登录态。
     后端按它把「收藏 / 追踪 / 名单 / 设置 / 核验历史」分开存，
     所以两个人打开同一个网址不会互相看到对方的名单。
     ⚠ 不要用 IP / UA 拼：同一办公室、同一浏览器升级都会串号。 */
  export const VISITOR_ID = (() => {
    const KEY = 'xray-cloud-visitor';
    try {
      let v = localStorage.getItem(KEY);
      if (!v) {
        v = 'v_' + (window.crypto && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '')
          : Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem(KEY, v);
      }
      return v;
    } catch (e) {
      return 'v_nostorage';            // 隐私模式等：落到公共分区，功能仍可用
    }
  })();
  /* 两条都发：header 给函数读；path 上的 __v 是给「AppWrite 没透传自定义头」的兜底，
     入口会把 __v 从 query 里摘掉再交给 FastAPI，业务路由看不到它。 */
  const withVisitor = (path) => path + (path.indexOf('?') >= 0 ? '&' : '?')
    + '__v=' + encodeURIComponent(VISITOR_ID);
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
    // ⚠ 探针必须用**和本机完全相同**的那个接口与判据（/api/v1/ext/status 必有 state）。
    //   换成 /x/status 会踩坑：它返回 {"engines":{...}}，按 ok/status 判会误判成"没有云端后端"。
    // ⚠ 必须给上限：后端在但极慢时，探针不设限会让**每一个** /api 请求都挂在
    //   backendReady() 上，界面表现是"点什么都没反应"，比明确报错更难查。
    //   30 秒 = 实测冷启动（约 10 秒）的三倍，超了就是真出事。
    const ctrl = new AbortController();
    const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) { /* 忽略 */ } }, 30000);
    return callCloud('/api/v1/ext/status', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json().catch(() => null) : null))
      .then((d) => !!(d && typeof d.state === 'string'))
      .catch(() => false)
      .then((v) => { clearTimeout(timer); return v; });
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
        else if (mode === 'cloud') { showCloudNotice(); wireCloudNav(); }
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
      /* 把上层的 AbortSignal 透传下来：否则 core/api.js 那套超时对云端**完全失效**
         （请求照跑，调用方却已经放弃了），云端一卡就是无限等。 */
      signal: init && init.signal,
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': CLOUD.project },
      body: JSON.stringify({
        body: body, method: method, path: withVisitor(path),
        headers: { 'content-type': 'application/json', 'x-xray-visitor': VISITOR_ID },
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

  /* 云端横幅：3.4.1 起按档位给**两套不同**的措辞。
     挂同一个 id 是为了不让两档横幅叠在一起；但文案绝不能共用 ——
     精简版说"能保存"、或完整版说"只有 5 个点"，都是当面说假话。
     与「静态演示版」也必须写得不一样：后者根本没有后端。 */
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
    if (CLOUD_TIER === 'lite') {
      bar.innerHTML = '<b>网页精简版</b>：这一版只开放 <b>5 项只读核验</b>'
        + '（统一查询、六锚点核验与判级、企业档案与品牌、资金往来比对、库内名单与资料库）。'
        + '<b>不是离线演示</b>：跑的是真后端，按你输入的公司名当场查事实库、现算结论，'
        + '六锚点里的 ICP 备案主体仍是<b>联网实时反查</b>。'
        + '<b>不保存任何东西</b>：名单编辑、变化追踪、收藏、告警、AI 设置与人员透视都不在这一版；'
        + '<b>五维投资评分默认联网现算</b>（财务安全 / 产品力 / 行业前景 / 团队实力 / 诉讼风险）：'
        + '按公司名当场取行情、财报、交易所披露与公开报道，用同一份评分代码算分，结果里写明取数时间。'
        + '若取数超时或失败，会明确标注并<b>回落五维离线快照</b>（写明生成时间、非实时），不拿快照冒充实时。'
        + '要完整能力，在网址后加 <code>?full=1</code> 切到<b>云端完整版</b>，或用桌面客户端。'
        + '<br><b>热起来几秒出结果；隔久了第一次要冷启动</b>（实测 18 秒探活、52 秒首次查询）——'
        + '这段时间页面会一直显示"正在查询"，不是卡死。'
        + '<b>查无记录 ≠ 有问题</b>，只代表不在这份已复核事实库里。';
    } else {
      bar.innerHTML = '<b>云端完整版</b>：这里跑的是<b>和本机同一份后端</b>，'
        + '<b>联网查证是真的</b>（巨潮、东方财富、交易所等一手来源）；'
        + '名单管理、变化追踪、收藏、告警、核验历史都能保存，'
        + '数据按当前浏览器隔离，不会串到别人那里。'
        + '<b>热起来几秒出结果；隔久了第一次要冷启动</b>（实测 18 秒探活、52 秒首次查询）——'
        + '这段时间页面会一直显示"正在查询"，不是卡死。'
        + '<b>五维投资评分默认联网现算</b>（按公司名当场取行情、财报、交易所披露与公开报道），'
        + '取数失败才回落离线快照并明确标注、非实时；人员透视仍是离线快照。'
        + '<b>第三方 API 密钥与群机器人 Webhook 托管版不接收</b>，'
        + '这类凭据只应填在本机版设置里。'
        + '<br>要十维实时评分 / 实时人员透视 / 配置自己的密钥：用本机版'
        + '（项目根双击 <code>启动并打开首页.bat</code>）。'
        + '<br>当前是 <code>?full=1</code> 完整档；去掉参数或访问 <code>?lite=1</code> 回到网页精简版。';
    }
    host.insertBefore(bar, host.firstChild);
  }

  /* 云端把「加分项」两个入口从本机 127.0.0.1 切到站内页面。
     ⚠ 不能只在文案里说"云端不支持"：那两个 <a> 还指着用户自己的电脑，
       点开就是"无法访问此网站"，比功能缺失更像站点坏了。
     3.7.0 两档都能打开评分页（同一份 Node 引擎联网现算），只有人员透视页
     在精简档仍不提供 —— 所以只把 3211 那个入口收起来，留着能点却必 501
     属于让人以为站点坏了。 */
  export function wireCloudNav() {
    const map = [
      ['http://127.0.0.1:3210/', '/apps/invest-score/'],
      ['http://127.0.0.1:3211/', '/apps/company-xray/'],
    ];
    map.forEach(([from, to]) => {
      const a = document.querySelector('a[href="' + from + '"]');
      if (!a) return;
      // 3.6.0：精简版提供五维投资评分快照，评分页要能点开；只有人员透视页收起来。
      if (CLOUD_TIER === 'lite' && from.indexOf('3211') >= 0) {
        a.classList.add('off');
        a.setAttribute('title', '网页精简版不含人员透视；在网址后加 ?full=1 切到完整版');
        return;
      }
      a.setAttribute('href', to);
    });
  }
  /* 首页「完整报告」按钮：云端跳站内评分页，本机仍开 :3210。
     参数名沿用评分页自己读的 q / type，写成 name 会打开一片空白。 */
  export function investPageUrl(nm, ty) {
    const qs = '?type=' + encodeURIComponent(ty)
      + (nm ? '&q=' + encodeURIComponent(nm) : '');
    return (RUNTIME.mode === 'cloud' ? '/apps/invest-score/' : 'http://127.0.0.1:3210/') + qs;
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
