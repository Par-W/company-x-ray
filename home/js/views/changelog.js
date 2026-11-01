/* views/changelog.js · 更新日志 */

import { esc } from '../core/env.js';
import { pageHead } from '../components/components.js';

  export const CL_KEY = 'xray.changelog.seen';
  export function changelogData() { return window.XrayChangelog || { version: '', updated: '', note: '', releases: [], commits: [] }; }
  export function clSeen() { try { return localStorage.getItem(CL_KEY) || ''; } catch (e) { return ''; } }
  export function clUnread() {
    const v = changelogData().version;
    return !!v && clSeen() !== v;
  }
  export function refreshChangelogBadge() {
    const b = document.getElementById('navChangelogBadge');
    // 显隐走 .on 类（同 navGuardBadge：内联 display 会压过折叠态）
    if (b) b.classList.toggle('on', clUnread());
  }
  export function viewChangelog() {
    const d = changelogData();
    const kindCls = { '新增': 'new', '修复': 'fix', '优化': 'opt' };
    const rel = (d.releases || []).map((r) => `
      <div class="x-tl-item">
        <div class="x-tl-head">
          <span class="x-tl-v">v${esc(r.v || '')}</span>
          <span class="x-tl-d">${esc(r.date || '')}</span>
          ${r.tag ? `<span class="x-chip" style="border-color:var(--x-soft-border);color:var(--x-brand)">${esc(r.tag)}</span>` : ''}
        </div>
        <ul class="x-tl-ul">
          ${(r.items || []).map((it) => `<li><span class="x-kind ${kindCls[it.t] || 'opt'}">${esc(it.t || '')}</span>${esc(it.d || '')}</li>`).join('')}
        </ul>
      </div>`).join('') || '<div class="x-empty">暂无版本记录。</div>';

    const cm = (d.commits || []).slice(0, 60).map((c) => `
      <div class="x-log-row">
        <span class="x-log-t">${esc(c.d || '')}</span>
        <span class="x-log-h">${esc(c.h || '')}</span>
        <span class="x-log-m">${esc(c.m || '')}</span>
      </div>`).join('') || '<div class="x-empty">暂无提交记录。</div>';

    $('#view').innerHTML = `
      ${pageHead('更新日志', `当前 v${esc(d.version || '—')} · ${esc(d.updated || '')}`,
        '<button class="x-btn sm" id="clMark">全部标为已读</button>',
        [['首页', '#/home'], ['更新日志']])}

      <div class="x-card"><div class="bd">
          <p class="x-muted" style="margin-top:0">${esc(d.note || '')}</p>
          <div class="x-note" style="margin-top:var(--x-s3)">版本号规则 <b>主版本.次版本.修订</b>（如 1.8.0）：
            <b>主版本</b>=形态级变化，<b>次版本</b>=新增能力或一批同类改进，<b>修订</b>=修 bug 与小优化（1.8.0 → 1.8.1）。</div>
          <div class="x-tl" style="margin-top:var(--x-s4)">${rel}</div>
        </div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>提交流水</h2>
        <span class="tag is-light">由 git log 自动生成</span></div>
        <div class="bd">
          <p class="x-muted" style="margin-top:0">上面每一条"解决了什么"，都能在这里找到对应的真实提交。
            这一段由 <code>python scripts/gen_changelog.py</code> 从仓库历史生成，不手抄。</p>
          <details open style="margin-top:var(--x-s3)"><summary style="cursor:pointer;font-weight:600">
            最近 ${Math.min((d.commits || []).length, 60)} 条提交（点开/收起）</summary>
            <div class="x-log" style="margin-top:10px">${cm}</div>
          </details>
        </div></div>`;

    $('#clMark').onclick = () => {
      try { localStorage.setItem(CL_KEY, d.version || ''); } catch (e) { /* 无痕模式等：仅不记忆，不影响本页 */ }
      refreshChangelogBadge();
      const el = $('#clMark'); if (el) { el.textContent = '已标记'; el.disabled = true; }
    };
    // 进过这一页就算看过最新一版（侧栏 NEW 徽标自动消失）
    try { localStorage.setItem(CL_KEY, d.version || ''); } catch (e) { /* 忽略 */ }
    refreshChangelogBadge();
  }
