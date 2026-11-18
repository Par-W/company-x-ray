/* ==========================================================================
 * api.js · 后端接口访问的「带超时 + 统一错误」封装（3.0.1）
 * --------------------------------------------------------------------------
 * 🔴 真实的 fetch 出入口**不在这个文件**：core/env.js 重写了 window.fetch，
 *    按 RUNTIME.mode 把 /api/* 转到本机后端 / AppWrite 函数执行 / 离线快照。
 *    本文件里调用的 fetch 同样经过那层重写，三种模式自动生效。
 *
 * 这里只负责两件事：
 *   ① 给请求加 AbortController 超时（本机 25s、云端 90s）；
 *   ② 失败时把后端/云端说的**理由**带出来，而不是只剩一个 HTTP 状态码。
 *
 * ⚠ 业务层（actions.js / views/*.js）仍有直接调用 window.fetch 的轻量请求，
 *   它们也走 env.js 的路由，但没有超时、错误也只有状态码（已知债务）。
 *   新写接口请用 postJSON / getJSON，别再抄一份 postJSON —— 3.3.1 前
 *   actions.js 抄过，云端 501 的那句人话正是在这条缝里丢掉的。
 * ========================================================================== */

/* 默认档：本机接口正常都在 1 秒内。留 25 秒是为了云端冷启动
   （AppWrite 函数实测首次调用 9~10 秒）。云端链路要显式传 TIMEOUT_CLOUD，
   否则 25s 会把慢响应误报成「后端未响应」。 */
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
