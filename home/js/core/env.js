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
    try { await fetch('/api/v1/ext/status', { cache: 'no-store' });
      el.innerHTML = '<span class="x-dot live"></span>后端在线'; el.style.color = 'var(--x-ok)';
    } catch (e) { el.innerHTML = '<span class="x-dot dead"></span>后端离线'; el.style.color = 'var(--x-bad)'; }
  }
