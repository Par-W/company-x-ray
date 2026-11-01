/* ==========================================================================
 * core/toast.js · 瞬时反馈（3.2.0 新增）
 * --------------------------------------------------------------------------
 * 依据：Slack / Linear 的做法 —— 右下角、可叠、几秒自动散。
 *
 * ⚠ 与 .x-note 的分工（这条很容易做错）：
 *   · .x-note / .x-banner 是**页面内容的一部分**：说明当前这块为什么是这样，
 *     会一直留在原地，用户回头还能看见。
 *   · .x-toast 是**对"刚才那一下操作"的答复**：复制成功了、切主题了。
 *     它跟着时间走，不该要求用户去关。
 *   把"保存成功"做成常驻 note 会挤占版面；把"这段数据缺失"做成 toast
 *   会让人错过关键信息（3 秒后消失）。
 *
 * ⚠ 不引第三方库：只需要 append + setTimeout + 淡出，20 行够了。
 * ========================================================================== */

const MAX = 4;   // 同屏最多 4 条，多的把最老的挤掉（否则小屏会糊住整个右下角）

/** 弹一条提示。
 *  @param {string} text  文案（纯文本，不解析 HTML —— 调用方传的是用户数据的机会不少）
 *  @param {string} tone  '' | 'ok' | 'bad' | 'warn'
 *  @param {number} ms    停留毫秒，默认按语气分：成功 2200、失败 4200
 */
export function toast(text, tone, ms) {
  const box = document.getElementById('toasts');
  if (!box) return;

  // 超过上限：先清掉最老的一条，避免叠成一堵墙
  while (box.children.length >= MAX) box.removeChild(box.firstChild);

  const n = document.createElement('div');
  n.className = 'x-toast' + (tone ? ' ' + tone : '');
  n.setAttribute('role', 'status');
  n.textContent = String(text == null ? '' : text);
  box.appendChild(n);

  const life = typeof ms === 'number' ? ms : (tone === 'bad' || tone === 'warn' ? 4200 : 2200);
  setTimeout(() => {
    n.style.opacity = '0';
    n.style.transition = 'opacity 160ms';
    setTimeout(() => { if (n.parentNode) n.parentNode.removeChild(n); }, 180);
  }, life);
}

/** 成功 / 失败 / 警告的短写，调用处读起来更像说话。 */
export const okToast = (t, ms) => toast(t, 'ok', ms);
export const badToast = (t, ms) => toast(t, 'bad', ms);
export const warnToast = (t, ms) => toast(t, 'warn', ms);
