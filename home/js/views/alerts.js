/* views/alerts.js · 告警记录 */

import { esc, state, stopViewTimer, viewTimer } from '../core/env.js';
import { alertsExtHtml } from '../components/panels.js';
import { refreshGuardBadge } from '../views/guard.js';
import { pageHead, emptyState } from '../components/components.js';

  export async function refreshAlertsLive() {
    const el = document.getElementById('alertsExtState');
    if (!el) return;
    try {
      el.innerHTML = alertsExtHtml(await (await fetch('/api/v1/ext/status', { cache: 'no-store' })).json());
    } catch (e) { /* 后端不可达：保留上一次内容，不编造 */ }
  }
  export async function viewAlerts() {
    let ext = { state: 'never_seen', note: '' }, alerts = [];
    try { ext = await (await fetch('/api/v1/ext/status', { cache: 'no-store' })).json(); } catch (e) {}
    try {
      const d = await (await fetch('/api/v1/alerts', { cache: 'no-store' })).json();
      alerts = Array.isArray(d) ? d : (d.alerts || []);
    } catch (e) {}
    const lv = { red_hard: '高风险 · 已拦截', red_soft: '建议家人复核', yellow: '信息不完整', green: '未发现异常' };

    $('#view').innerHTML = `
      ${pageHead('插件检测记录', '付款页面上自动检测留下的记录（红色会自动通知家人）', null,
        [['首页', '#/home'], ['核验'], ['检测记录']])}

      <div class="x-card"><div class="bd">
        <div class="x-item">
          <div class="grow" id="alertsExtState">${alertsExtHtml(ext)}</div>
          <a class="x-btn sm" href="#/guard">配置自动检测</a>
        </div>
        <p class="x-muted" style="margin:var(--x-s2) 0 0;font-size:var(--x-fs-small)">
          需要安装教程或管理守护通道，请进 <a href="#/guard">自动检测 · 配置</a>。
        </p>
      </div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>检测记录</h2>
        <span class="tag is-light">${alerts.length} 条</span></div>
        <div class="bd${alerts.length ? ' is-flush' : ''}">
          ${alerts.length ? `<div class="x-table-wrap" style="max-height:none"><table class="table is-fullwidth x-table">
            <thead><tr><th>时间</th><th>判级</th><th>宣称品牌 / 主体</th><th class="num">金额</th></tr></thead>
            <tbody>${alerts.slice().reverse().slice(0, 50).map((a) => `<tr>
              <td class="x-muted x-num" style="font-size:12px">${esc(String(a.created_at || a.at || '').replace('T', ' ').slice(0, 16))}</td>
              <td><span class="tag ${/red/.test(String(a.level)) ? 'is-danger' : (/yellow/.test(String(a.level)) ? 'is-warning' : 'is-success')} is-light">${esc(lv[a.level] || a.level || '—')}</span></td>
              <td>${esc(a.brand || a.claimed_brand || '—')}<div class="x-muted" style="font-size:12px">${esc(a.counterpart_entity || '')}</div></td>
              <td class="num">${a.amount == null ? '—' : esc(a.amount)}</td></tr>`).join('')}</tbody></table></div>`
            : emptyState({
                icon: 'alert',
                title: '还没有检测记录',
                desc: '装好插件后，你在网页上遇到付款/转账动作时它才会写入这里。也可以先去看安装教程。',
                actions: '<a class="x-btn sm primary" href="#/guard">看安装教程</a>'
                  + '<a class="x-btn sm" href="#/home">先去查一家公司</a>',
              })}
          <div class="ft" style="border-top:1px solid var(--x-line);margin:0 calc(-1 * var(--x-s3)) calc(-1 * var(--x-s3));padding:var(--x-s2) var(--x-s3)">
            说明：记录来自本机后端（重启后端会清空，属演示版设计）；插件侧的完整历史在扩展弹窗的「通知日志」里。
          </div>
        </div></div>`;
    refreshGuardBadge();
    // 停在本页时每 5 秒自动刷新插件状态（修复：以前是一次性快照，插件断开后永远显示"在岗"）
    stopViewTimer();
    viewTimer.id = setInterval(refreshAlertsLive, 5000);
  }
