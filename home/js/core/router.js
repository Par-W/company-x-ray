/* ==========================================================================
 * router.js · 路由（3.0.1）
 * --------------------------------------------------------------------------
 * 原来散在 render() 里的 hash 解析搬到这里。
 * 视图注册成 { mount(el, ctx), unmount() }，
 * unmount 用来停掉该视图的轮询/定时器 —— 切页后还在后台打接口是老毛病。
 * ========================================================================== */

export function createRouter(el, routes, opts = {}) {
  const timers = new Set();
  let current = null;
  let currentName = '';

  function currentRoute() {
    const raw = (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];
    return raw || 'home';
  }

  function render() {
    const name = currentRoute();
    // 客户端里「自动检测」和它的记录页都不成立（没有插件）：连残留链接/旧书签一起兜到说明页
    const target = (opts.isClient && (name === 'guard' || name === 'alerts'))
      ? 'guardClient' : name;
    const view = routes[target] || routes.home;

    // 离开上一个视图：停掉它的定时器
    if (current && typeof current.unmount === 'function') {
      try { current.unmount(); } catch (e) { console.error('[router] unmount 出错', e); }
    }
    timers.clear();

    current = view;
    currentName = target;
    el.textContent = '';
    const ctx = {
      timers,
      on: (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; },
      every: (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; },
      after: (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; },
      stop: (id) => { clearInterval(id); clearTimeout(id); timers.delete(id); },
      route: (r) => { location.hash = '#/' + r; },
      isClient: !!opts.isClient,
    };
    try {
      view.mount(el, ctx);
    } catch (e) {
      console.error('[router] 视图挂载失败', e);
      el.textContent = '';
      const box = document.createElement('div');
      box.className = 'x-fatal';
      box.textContent = '页面加载出错：' + (e && e.message ? e.message : e);
      el.appendChild(box);
    }
    if (opts.onRoute) opts.onRoute(target, name);
  }

  window.addEventListener('hashchange', render);

  return {
    start: render,
    get current() { return currentName; },
    stopAll() {
      timers.forEach((id) => { clearInterval(id); clearTimeout(id); });
      timers.clear();
    },
  };
}
