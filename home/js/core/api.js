/* ==========================================================================
 * api.js · 后端接口访问（3.0.1）
 * --------------------------------------------------------------------------
 * 所有 fetch 集中在这里，好处：
 *   ① 离线快照的兜底逻辑只有一份，不会漏；
 *   ② 错误信息统一格式，视图不用各写一套 try/catch；
 *   ③ 换接口地址只改这一处。
 * ========================================================================== */

const TIMEOUT = 15000;

/** 带超时的 fetch（AbortController）。 */
async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function postJSON(url, body) {
  const r = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

export async function getJSON(url) {
  const r = await fetchWithTimeout(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

/** 判断后端在不在。探活必须绕代理（本机 HTTP_PROXY 是死端口）。 */
export async function backendAlive(port) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch(`http://127.0.0.1:${port}/api/v1/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch (e) {
    return false;
  }
}

/* ---------- 具体接口 ---------- */

export const API = {
  /** 统一查询：可信度 + 投资评分一次出。 */
  unified(name, type) {
    return postJSON('/api/v2/query', { name, type });
  },

  /** 六锚点可信度。 */
  trust(name) {
    return postJSON('/api/v1/trust', { name });
  },

  /** 投资评分。 */
  invest(name, type) {
    return postJSON('/api/v1/invest', { name, type });
  },

  /** 企业档案（公开线索 + 人员）。 */
  profile(name) {
    return postJSON('/api/v1/profile', { name });
  },

  /** AI 整理。 */
  ai(name) {
    return postJSON('/api/v1/ai', { name });
  },

  /** 告警列表。 */
  alerts() {
    return getJSON('/api/v1/alerts');
  },

  /** 插件检测状态。 */
  guardStatus() {
    return getJSON('/api/v1/guard/status');
  },

  /** 名单管理。 */
  lists() {
    return getJSON('/api/v1/lists');
  },

  /** 设置读取 / 保存。 */
  settings() {
    return getJSON('/api/v1/settings');
  },
  saveSettings(patch) {
    return postJSON('/api/v1/settings', patch);
  },
};
