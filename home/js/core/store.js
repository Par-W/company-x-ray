/* ==========================================================================
 * store.js · 状态容器（3.0.1）
 * --------------------------------------------------------------------------
 * 视图不再自己管一堆散装变量。统一放这里，改状态 → 通知订阅者 → 重渲染。
 *
 * 用法：
 *   const store = createStore({ q: '', result: null });
 *   store.set({ q: '蜜雪冰城' });
 *   store.subscribe((s) => render(s));
 * ========================================================================== */

export function createStore(initial) {
  let state = Object.assign({}, initial);
  const subs = new Set();

  return {
    get() {
      return state;
    },
    /** 浅合并；值没变就不通知（避免无谓重渲染）。 */
    set(patch) {
      const next = Object.assign({}, state, patch);
      let changed = false;
      for (const k of Object.keys(next)) {
        if (next[k] !== state[k]) { changed = true; break; }
      }
      if (!changed) return state;
      const prev = state;
      state = next;
      subs.forEach((fn) => {
        try { fn(state, prev); } catch (e) { console.error('[store] 订阅回调出错', e); }
      });
      return state;
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/* ---------- 本地存储小工具（无痕模式要容错） ---------- */

export const LS = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* 无痕模式：只本次生效 */ }
  },
  getJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  setJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 同上 */ }
  },
};

/* ---------- 最近查询记录 ----------
   ⚠ 键名只有一个来源。3.0.1 之前这里有两份实现、两个键
   （'xray-recent' 与 'xray:recent'），写入和读取对不上 ——
   「最近核验」列表永远是空的。2.x / 3.0.0 用的是 'xray-recent'。 */
export const LS_RECENT = 'xray-recent';

export function recentList() {
  const raw = LS.getJSON(LS_RECENT, []);
  return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
}

export function recentPush(name) {
  if (!name) return;
  const l = recentList().filter((x) => x !== name);
  l.unshift(name);
  LS.setJSON(LS_RECENT, l.slice(0, 12));
}
