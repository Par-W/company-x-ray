/* theme.js · 主题引擎（浅色 / 深色 / 跟随系统）
 * 偏好存 localStorage['xray.theme']，真正生效靠 <html data-theme="...">。 */

import { NAV_AUTO_MIN } from '../core/nav.js';

  export const THEME_KEY = 'xray.theme';
  export function getThemePref() {
    try { return localStorage.getItem(THEME_KEY) || 'system'; } catch (e) { return 'system'; }
  }
  export function setThemePref(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* 无痕模式等：只本次生效 */ }
    applyTheme();
  }
  export function systemPrefersDark() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
    catch (e) { return false; }
  }
  export function applyTheme() {
    const v = getThemePref();
    const dark = (v === 'dark') || (v === 'system' && systemPrefersDark());
    const root = document.documentElement;
    root.classList.add('x-theme-anim');           // 只在切换的这一瞬开过渡
    // ⚠ 浅色也必须显式挂 data-theme="light"：Bulma 1.0 自带"跟随系统"深色 scheme，
    //   如果把属性整个摘掉，.input/.select/.label 会按系统深色渲染 → 浅色页面里出黑块。
    if (dark) root.setAttribute('data-theme', 'dark'); else root.setAttribute('data-theme', 'light');
    setTimeout(() => root.classList.remove('x-theme-anim'), 260);

    // 同步所有带 data-theme-btn 的按钮的高亮态（设置页可能同时只存在一组）
    document.querySelectorAll('[data-theme-btn]').forEach((b) => {
      const on = b.getAttribute('data-theme-btn') === v;
      b.classList.toggle('is-primary', on);
      b.classList.toggle('is-light', !on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const st = document.getElementById('thState');
    if (st) {
      st.textContent = v === 'system'
        ? '跟随系统：系统当前为' + (systemPrefersDark() ? '深色' : '浅色') + '，会随系统切换自动变。'
        : (v === 'dark' ? '已固定为深色（不随系统变化）。' : '已固定为浅色（不随系统变化）。');
    }
  }

  // 暴露给同一 IIFE 内的其它函数（设置页按钮）
  window.__xraySetTheme = setThemePref;
  window.__xrayApplyTheme = applyTheme;
  window.__xrayGetTheme = getThemePref;

  /* ================= 侧边栏：自动收起 / 手动控制 =================
   * 模式存 localStorage['xray.navMode']（'auto' | 'manual'，默认 auto）；
   * 手动模式下的收起状态存 localStorage['xray.navMini']（'1' | '0'）。
   *
   * 自动模式：窗口窄于 NAV_AUTO_MIN 就收成图标条，变宽自动展开。
   *   但用户在自动模式下按一下开关，算**这一次**的覆盖 —— 不记进 localStorage，
   *   也**不会**被紧接着的 resize 冲掉，一直有效到窗口宽度跨过阈值为止
   *   （否则"自动"会把用户刚做的选择立刻改回去，等于手动无效）。
   * 手动模式：完全听用户的，窗口怎么变都不动它。
   * 窄屏（<=900px）侧栏本来就是顶部一条横向滚动条，收起就没导航了 → 一律不收起。
   * ------------------------------------------------------------ */
