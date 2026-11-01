/* nav.js · 侧栏折叠状态机（自动 / 常显 / 常隐）
 * 偏好存 localStorage，窄屏自动折叠。 */

import { applyTheme, getThemePref } from '../core/theme.js';

  export const NAV_MODE_KEY = 'xray.navMode';
  export const NAV_MINI_KEY = 'xray.navMini';
  export const NAV_AUTO_MIN = 1100;      // 自动模式的阈值：内宽小于它才收起（把宽度让给内容区）
  export const NAV_HORIZ_MAX = 900;      // 与 CSS @media(max-width:900px) 同口径：此处侧栏已是横向条
  let navOverride = null;         // 自动模式下的临时覆盖（true/false；null=交给自动）
  let navLastAuto = null;         // 上一次按宽度算出的结论，用来识别"跨过阈值"
  export function navGetMode() {
    try { return localStorage.getItem(NAV_MODE_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }
  export function navWidth() { return window.innerWidth || 1366; }
  export function navTooNarrow() { return navWidth() <= NAV_HORIZ_MAX; }
  export function navAutoWants() { return navWidth() < NAV_AUTO_MIN; }
  export function navIsMini() { return document.documentElement.classList.contains('nav-mini'); }
  export function navShouldMini() {
    if (navTooNarrow()) return false;                 // 横向条形态：收起=没有导航，绝不收
    if (navGetMode() === 'manual') {
      try { return localStorage.getItem(NAV_MINI_KEY) === '1'; } catch (e) { return false; }
    }
    if (navOverride !== null) return navOverride;
    return navAutoWants();
  }
  export function navStateText() {
    const w = Math.round(navWidth());
    if (navTooNarrow()) return '当前窗口 ' + w + 'px：侧栏已变成顶部横向条，此设置在这里不适用。';
    if (navGetMode() === 'manual') {
      return '手动：' + (navIsMini() ? '已收起' : '当前展开') + '，窗口怎么变都不会自己动。';
    }
    const s = '自动：窗口窄于 ' + NAV_AUTO_MIN + 'px 时自动收起（当前 ' + w + 'px，' +
      (navIsMini() ? '已收起' : '展开中') + '）';
    return s + (navOverride !== null ? '。你刚手动改过一次，会保持到窗口跨过阈值。' : '。');
  }
  /* 折叠态的小红点：徽标被收掉后，用图标右上角一个点代替它的存在。
     ⚠ 徽标内容是别处异步改的（插件状态每 15 秒刷新、更新日志未读数），
     所以既要在初始时同步一次，也要盯着徽标的 class 变化跟着改 ——
     否则「有未读」这个提醒在窄栏里会凭空消失。 */
  export function syncNavFlags() {
    document.querySelectorAll('#nav .nav-badge').forEach((b) => {
      const a = b.closest('a');
      if (a) a.classList.toggle('has-flag', b.classList.contains('on'));
    });
  }
  export function navApply() {
    const mini = navShouldMini();
    document.documentElement.classList.toggle('nav-mini', mini);

    document.querySelectorAll('[data-nav-btn]').forEach((b) => {
      const on = b.getAttribute('data-nav-btn') === navGetMode();
      b.classList.toggle('is-primary', on);
      b.classList.toggle('is-light', !on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const st = document.getElementById('navState');
    if (st) st.textContent = navStateText();
    const tg = document.getElementById('navToggle');
    if (tg) {
      tg.textContent = mini ? '»' : '«';            // 图标说的是"点下去会发生什么"
      tg.title = mini ? '展开侧边栏' : '收起侧边栏';
      tg.setAttribute('aria-expanded', mini ? 'false' : 'true');
    }
    syncNavFlags();
  }
  export function navSetMode(v) {
    try { localStorage.setItem(NAV_MODE_KEY, v); } catch (e) { /* 无痕模式：只本次生效 */ }
    // 切到手动时，把"当前看到的样子"固化成偏好，免得一点设置侧栏就跳变
    if (v === 'manual') {
      try { localStorage.setItem(NAV_MINI_KEY, navIsMini() ? '1' : '0'); } catch (e) { }
    }
    navOverride = null;                              // 换模式就按新规则重新开始
    navApply();
  }
  export function navToggle() {
    const next = !navIsMini();
    if (navGetMode() === 'manual') {
      try { localStorage.setItem(NAV_MINI_KEY, next ? '1' : '0'); } catch (e) { }
    } else {
      navOverride = next;                            // 自动模式：只覆盖这一次
    }
    navApply();
  }
  window.addEventListener('resize', () => {
    const a = navAutoWants();
    if (navLastAuto !== null && a !== navLastAuto) navOverride = null;   // 跨阈值 → 交还自动
    navLastAuto = a;
    navApply();
  });

  window.__xraySetNavMode = navSetMode;
  window.__xrayToggleNav = navToggle;
  window.__xrayApplyNav = navApply;
  window.__xrayGetNavMode = navGetMode;
  window.__xrayNavShouldMini = navShouldMini;        // 供验收脚本断言（scripts/check_nav.py）
  window.__xraySyncNavFlags = syncNavFlags;

  navLastAuto = navAutoWants();
  // 首屏防闪：这段在 head 里同步执行（body 还没渲染），所以折叠态在**第一帧**就是对的。
  // navApply 只依赖 localStorage 与 innerWidth，不碰 DOM，因此在 head 里跑是安全的；
  // 等 body 解析完，主脚本里会再调一次，把顶栏按钮图标 / 设置页按钮高亮补上。
  navApply();

  /* 徽标内容是异步变的（插件状态每 15 秒轮询、更新日志未读数），
     盯着它的 class 变化，红点才会跟着亮/灭。
     老浏览器没有 MutationObserver 时只是没有红点，折叠本身照常可用。 */
  try {
    const mo = new MutationObserver(() => syncNavFlags());
    document.querySelectorAll('#nav .nav-badge').forEach((b) =>
      mo.observe(b, { attributes: true, attributeFilter: ['class'] }));
  } catch (e) { /* 不支持 MutationObserver：红点不跟随更新，不影响折叠 */ }

  // 「跟随系统」要实时响应：用户在系统里切换深浅，页面立刻跟着变
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', () => { if (getThemePref() === 'system') applyTheme(); });
    else if (mq.addListener) mq.addListener(() => { if (getThemePref() === 'system') applyTheme(); });
  } catch (e) { /* 老浏览器不支持 matchMedia：按浅色渲染即可 */ }

  applyTheme();     // 首次进入：把按钮态与 data-theme 对齐（head 里已预置过一次）

  /* ---- 刷新键接管：Ctrl+R / F5 / Ctrl+Shift+R ----
   * 桌面壳（pywebview 的 EBWebView、Edge --app）会**无视服务端的 Cache-Control**
   * 直接复用磁盘上的旧 HTML，连请求都不发（实测缓存里躺着十几天前的页面）。
   * 后果是「更新日志变新了、配色却没变」——changelog.js 是独立缓存条目会被重新验证，
   * HTML 那份不会。这里把刷新键改成"换一个带时间戳的地址重载"：URL 一变缓存键就变，
   * 等价于自动清缓存，用户按一次刷新就拿到最新页面，不用手动清目录。
   * 服务端那边也已改成 no-store 并摘掉 ETag（两者互为兜底，缺一个都可能被旧副本挡住）。 */
  document.addEventListener('keydown', function (e) {
    var k = e.key || '';
    var isRefresh = (k === 'F5') || (e.ctrlKey && (k === 'r' || k === 'R'));
    if (!isRefresh) return;
    e.preventDefault();
    try {
      var u = new URL(location.href);
      u.searchParams.set('v', String(Date.now()));
      location.replace(u.toString());
    } catch (err) {
      location.reload();          // 极老内核没有 URL/searchParams：退回普通刷新
    }
  });

  try {
    var v = localStorage.getItem('xray.theme') || 'system';
    var dark = (v === 'dark') ||
      (v === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    // 与 applyTheme 同口径：浅色也要显式 light，防止 Bulma 内置深色 scheme 按系统渲染表单控件
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) { /* localStorage 不可用时按浅色渲染，不影响功能 */ }
