/* ==========================================================================
 * main.js · 应用入口（3.0.1）
 * --------------------------------------------------------------------------
 * 3.0.1 之前：2313 行 JS 全塞在一个 HTML 文件里，靠全局变量互相调用。
 * 现在拆成三层：
 *   core/        基础设施（主题 / 环境 / 图表 / 业务动作）
 *   components/  复用片段（面板 / 结果渲染 / 通用组件）
 *   views/       每个页面一个模块
 * 本文件只负责：把模块接起来、注册路由、启动。
 * ========================================================================== */

/* ---------- 全局工具（视图层沿用 $ 选择器写法，避免大规模改写） ---------- */
import { esc, sk, state, debounce, IS_CLIENT, pollExt, pollBackend, showLocalNotice, hideLocalNotice } from './core/env.js';

window.$ = (sel) => document.querySelector(sel);
window.esc = esc;

/* ---------- 主题 ---------- */
import { applyTheme, setThemePref, getThemePref } from './core/theme.js';
window.__xraySetTheme = setThemePref;

/* ---------- 命令面板（⌘K）与瞬时反馈 ---------- */
import { initCmdk } from './core/cmdk.js';
import { okToast } from './core/toast.js';

/* ---------- 侧栏状态 ---------- */
import { navApply, navToggle, navStateText } from './core/nav.js';
window.__xrayApplyNav = navApply;
window.__xrayToggleNav = navToggle;

/* ---------- 业务动作 ---------- */
import { doUnified, doVerify, doProfile, doAi, syncStar, toggleTrack, copyName, msg,
         loadSettings, setMsg, saveSettings, testSettings, currentQuery } from './core/actions.js';
import { aiStatus } from './core/actions.js';

/* ---------- 路由 ---------- */
import { createRouter } from './core/router.js';

/* ---------- 视图 ---------- */
import { homeView } from './views/home.js';
import { viewAlerts } from './views/alerts.js';
import { viewGuard, viewGuardInClient, refreshGuardBadge, guardBanner, guardStatus } from './views/guard.js';
import { viewTrack, viewChanges } from './views/track.js';
import { viewLists } from './views/lists.js';
import { viewLibrary } from './views/library.js';
import { viewChangelog, refreshChangelogBadge } from './views/changelog.js';
import { viewSettings } from './views/settings.js';

/* ---------- 结果渲染（查询完成后写进 #verdictBox） ---------- */
import { renderMerged } from './components/result.js';

/* ==========================================================================
 * 视图适配层
 * --------------------------------------------------------------------------
 * 旧视图函数是 `viewXxx()`：直接往 $('#view') 写 HTML，自己管轮询。
 * 新路由要的是 `{ mount(el, ctx) }`：由路由负责挂载与卸载。
 * 这里把旧的接进来 —— 视图内部仍用 $('#view')，
 * 但挂载前先把容器 id 指向它，卸载时清掉定时器。
 * ========================================================================== */

/** 把旧的 viewXxx() 适配成路由能用的 { mount } 形态。 */
function adapt(fn, opts = {}) {
  return {
    mount(el, ctx) {
      // 视图内部用 $('#view') —— 我们的 el 就是它，兼容两者
      const prev = el.id;
      if (!prev) el.id = 'view';
      try {
        const r = fn();
        if (r && typeof r.then === 'function') {
          r.then(() => { if (opts.after) opts.after(ctx); })
           .catch((e) => console.error('[view]', e));
        } else if (opts.after) {
          opts.after(ctx);
        }
      } finally {
        // id 不还原：后续视图仍按 $('#view') 找
      }
    },
    unmount() { /* 视图内部的轮询由 stopViewTimer 统一停 */ },
  };
}

/* ---------- 首页：走新的渲染体系 ---------- */
const homeRoute = homeView({
  actions: {
    query: () => doUnified(),
    track: () => toggleTrack(),
    copy: () => copyName(),
    report: () => {
      const nm = currentQuery();
      const ty = (window.$('#invType') || {}).value || 'listed';
      // ⚠ 投资评分是**独立 Node 服务**（后端 lifespan 自动拉起，端口 3210），
      //   不是后端的静态目录 —— 写成 /stage/invest-score/ 会 404（那是源码路径）。
      //   参数名以评分页自己读的为准：qs.get('q') 与 qs.get('type')。
      //   用 name 的话页面能开但不会自动查询 = 又回到「点过去一片空白」的老坑。
      window.open('http://127.0.0.1:3210/?type=' + ty
        + (nm ? '&q=' + encodeURIComponent(nm) : ''), '_blank');
    },
    onQueryChange: (v) => {
      window.$('#q').value = v;
      syncStar();
    },
    onTypeChange: (v) => {
      msg('已切换为「' + (v === 'listed' ? '上市公司口径' : '未上市公司口径') + '」，点「查询」后按新口径评估');
    },
    /* 首页顶部的「自动检测」状态横幅。
       客户端里不画（没有浏览器插件，这条告警永远消不掉）—— home.js 里已经判过。 */
    guardBanner: async () => {
      const el = document.getElementById('guardBanner');
      if (!el) return;
      const d = await guardStatus();
      el.innerHTML = guardBanner(d);
    },
  },
});

/* ---------- 路由表 ---------- */
const ROUTES = {
  home: homeRoute,
  alerts: adapt(viewAlerts, { after: (ctx) => ctx.every(refreshAlertsLive, 5000) }),
  guard: adapt(viewGuard),
  guardClient: adapt(viewGuardInClient),
  track: adapt(viewTrack),
  changes: adapt(viewChanges),
  lists: adapt(viewLists),
  library: adapt(viewLibrary),
  changelog: adapt(viewChangelog),
  settings: adapt(viewSettings),
};

const router = createRouter(document.getElementById('view'), ROUTES, {
  isClient: IS_CLIENT,
  onRoute: (name) => {
    // 导航高亮
    document.querySelectorAll('#nav a[data-route]').forEach((a) => {
      a.classList.toggle('on', a.getAttribute('data-route') === name);
    });
  },
});

/* ==========================================================================
 * 顶栏与全局装配
 * ========================================================================== */

function boot() {
  applyTheme();

  /* ---------- 命令面板与快捷键 ----------
     装配一次即可（initCmdk 内部有幂等保护：重复调用只会挂一套监听）。
     ⚠ 必须在 router.start() 之前装 —— 面板里"跳转"类命令靠改 hash 触发路由，
       装晚了第一次 Cmd+K 会没有反应。 */
  initCmdk();
  /* 命令面板要调的几个动作，挂在 window 上给 cmdk.js 用。
     （cmdk 不直接 import actions，避免与 main.js 形成环） */
  window.__xrayQuery = () => { location.hash = '#/home'; doUnified(); };
  window.__xrayReport = () => {
    const nm = currentQuery();
    const ty = (window.$('#invType') || {}).value || 'listed';
    window.open('http://127.0.0.1:3210/?type=' + ty
      + (nm ? '&q=' + encodeURIComponent(nm) : ''), '_blank');
  };
  /* 一键切深浅色：命令面板里"切换主题"用它。
     语义是"切到对立面"—— system 模式下先落到当前实际外观的反面。 */
  window.__xrayToggleTheme = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    setThemePref(next);
    okToast(next === 'dark' ? '已切换到深色' : '已切换到浅色');
  };

  /* 侧栏折叠 */
  const tg = document.getElementById('navToggle');
  if (tg) tg.onclick = () => window.__xrayToggleNav();

  /* 顶栏：查询 */
  const btn = document.getElementById('btnVerify');
  if (btn) btn.onclick = doUnified;
  const q = document.getElementById('q');
  if (q) {
    q.addEventListener('keydown', (e) => { if (e.key === 'Enter') doUnified(); });
    q.addEventListener('input', debounce(syncStar, 400));
  }
  const invType = document.getElementById('invType');
  if (invType) {
    invType.onchange = () => {
      msg('已切换为「' + (invType.value === 'listed' ? '上市公司口径' : '未上市公司口径')
        + '」，点「查询」后按新口径评估');
    };
  }

  /* 顶栏：插件状态灯可点 → 自动检测配置页 */
  const pillExt = document.getElementById('pillExt');
  if (pillExt) pillExt.onclick = () => { location.hash = '#/guard'; };

  /* --- xref-refresh:start --- */
  /* check_nav 的 [J] 段会原样抽出这段去 Node 里真跑。
     顶栏：刷新（桌面壳里没有地址栏/快捷键，给一个显式入口）。
     服务端对 HTML 与 JS/CSS 都发 Cache-Control: no-store，重载必定回源取全量。 */
  const _reloadBtn = document.getElementById('btnReload');
  if (_reloadBtn) {
    _reloadBtn.onclick = () => { _reloadBtn.classList.add('spin'); location.reload(); };
  }
  /* 接管 F5 / Ctrl+R：有的壳把默认快捷键吞了，这里保证「刷新」一定可用。
     必须 preventDefault —— 否则壳/浏览器自己的 F5 也会走一遍，等于重载两次。 */
  window.addEventListener('keydown', (e) => {
    const isF5 = e.key === 'F5';
    const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R');
    if (isF5 || isCtrlR) { e.preventDefault(); location.reload(); }
  });
  /* --- xref-refresh:end --- */

  /* 侧栏项的 title（收起后只剩图标，悬停还能认出来） */
  document.querySelectorAll('#nav a').forEach((a) => {
    if (a.title) return;
    const t = (a.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) a.title = t;
  });

  /* 桌面客户端（WebView2）里没有浏览器插件 —— 整条「自动检测 / 检测记录」线不成立。
     旧版是给这两项加 .off 类（CSS 负责 display:none），这里沿用同样的做法：
     不用内联 display（内联优先级压过任何选择器，折叠态就顶不掉了）。 */
  if (IS_CLIENT) {
    document.querySelectorAll('#nav a[data-route="guard"], #nav a[data-route="alerts"]')
      .forEach((a) => a.classList.add('off'));
    const pillExt = document.getElementById('pillExt');
    if (pillExt) pillExt.classList.add('off');
  }

  /* 脚注版本号：取更新日志的顶部 version（发版只改一处） */
  const footVer = document.getElementById('footVer');
  const v = window.XrayChangelog && window.XrayChangelog.version;
  if (footVer && v) footVer.textContent = 'v' + v;

  /* 侧栏状态文案 */
  const navState = document.getElementById('navState');
  if (navState) navState.textContent = navStateText();

  /* 徽标 */
  if (!IS_CLIENT) refreshGuardBadge();
  refreshChangelogBadge();
  if (!IS_CLIENT) setInterval(refreshGuardBadge, 15000);

  /* 后端 / 插件心跳 */
  pollExt();
  pollBackend();
  setInterval(pollExt, 5000);
  setInterval(pollBackend, 8000);

  /* URL 参数：?q=xxx 直接查 */
  const params = new URLSearchParams(location.search);
  const preset = params.get('q');
  if (preset && q) q.value = preset;

  router.start();

  if (preset && (location.hash === '' || location.hash === '#/home')) {
    doVerify();
    if (params.get('profile') === '1') setTimeout(doProfile, 900);
  }
  syncStar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
