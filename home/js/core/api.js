/* ==========================================================================
 * api.js · 后端接口访问（3.0.1）
 * --------------------------------------------------------------------------
 * 所有 fetch 集中在这里，好处：
 *   ① 离线快照的兜底逻辑只有一份，不会漏；
 *   ② 错误信息统一格式，视图不用各写一套 try/catch；
 *   ③ 换接口地址只改这一处。
 * ========================================================================== */

/* 默认档：本机接口正常都在 1 秒内。留 25 秒是为了**云端只读版**——
   它走 AppWrite 函数（Lambda 式冷启动，实测首次调用 9~10 秒），
   同一个 getJSON 既服务本机也服务云端，卡 15 秒会把冷启动误报成"后端未响应"。 */
const TIMEOUT = 25000;
/* 云端版是 Lambda 式冷启动 + 真去巨潮/东财核验：实测冷启动 18 秒、冷启动后的
   首次联网查询 52 秒，热起来才好到几秒。用本机那套 15 秒去卡它，用户看到的
   就是「查询失败（后端未响应）」—— 功能其实好的，是我们自己先放弃了。
   90 秒 = 实测最慢一次的 1.7 倍，且仍在函数自身 120 秒超时之内。 */
export const TIMEOUT_CLOUD = 90000;

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

/* 失败时把后端/云端说的**理由**带出来。
   3.3.1 之前一律 `new Error('HTTP 501')` —— 云端闸门明明回了
   "托管版只提供只读核验…投资评分需要本机版"，界面上却只剩一个 HTTP 状态码，
   用户只会以为产品坏了。宁可显示一句长话，也不要一个没有信息量的数字。 */
async function apiError(r) {
  let payload = null;
  try { payload = await r.json(); } catch (e) { /* 静态托管的 HTML 404：没有 JSON */ }
  const note = payload && (payload.note || payload.detail || payload.error);
  const err = new Error(note ? String(note) : ('HTTP ' + r.status));
  err.status = r.status;
  err.code = (payload && payload.code) || '';
  return err;
}

export async function postJSON(url, body, opts = {}) {
  const r = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    timeout: opts.timeout,
  });
  if (!r.ok) throw await apiError(r);
  return r.json();
}

export async function getJSON(url, opts = {}) {
  const r = await fetchWithTimeout(url, { timeout: opts.timeout });
  if (!r.ok) throw await apiError(r);
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
