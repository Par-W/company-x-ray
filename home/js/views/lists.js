/* views/lists.js · 名单管理 */

import { esc } from '../core/env.js';
import { msg } from '../core/actions.js';
import { pageHead, tabs, emptyState } from '../components/components.js';

  export const LIST_TABS = [
    { key: 'black', label: '黑名单', hint: '命中即**直接拦截**（已与浏览器插件连通）' },
    { key: 'white', label: '白名单', hint: '命中即**放行**（判绿、不打扰）' },
    { key: 'plugin', label: '插件站点放行', hint: '扩展端「此站不再提醒（7 天）」的记录，可在这里提前取消' },
  ];
  let LIST_TAB = 'black';
  let LIST_DATA = null;
  export function fmtTime(s) { return String(s || '').replace('T', ' ').slice(0, 16) || '—'; }
  export async function loadLists() {
    try { LIST_DATA = await (await fetch('/api/v1/lists', { cache: 'no-store' })).json(); }
    catch (e) { LIST_DATA = null; }
    return LIST_DATA;
  }
  export async function viewLists() {
    if (!LIST_DATA) await loadLists();
    const d = LIST_DATA || { blacklist: [], whitelist: [], plugin_allow: [], counts: {}, hits_total: 0 };
    const c = d.counts || {};
    const tabCount = { black: c.blacklist || 0, white: c.whitelist || 0, plugin: c.plugin_allow || 0 };

    const rows = {
      black: (d.blacklist || []).map((i) => `<tr>
        <td><b>${esc(i.key)}</b>${i.kind === 'domain' ? ' <span class="tag is-light">域名</span>' : ' <span class="tag is-light">主体名</span>'}
          ${i.enabled === false ? ' <span class="tag is-warning is-light">已停用</span>' : ''}</td>
        <td><span class="tag ${i.source === 'builtin' ? 'is-primary' : 'is-warning'} is-light">${i.source === 'builtin' ? '团队已核实' : '我添加'}</span></td>
        <td class="x-muted" style="font-size:12px">${esc(i.evidence || '—')}${i.source_url ? ` <a href="${esc(i.source_url)}" target="_blank" rel="noopener">证据</a>` : ''}</td>
        <td>${i.hits || 0} 次${i.last_hit ? `<div class="x-muted" style="font-size:11px">${esc(fmtTime(i.last_hit))}</div>` : ''}</td>
        <td class="x-muted" style="font-size:12px">${esc(fmtTime(i.added_at))}</td>
        <td class="acts">
          <button class="button is-small is-light" data-toggle="${esc(i.key)}" data-on="${i.enabled === false ? '1' : '0'}">${i.enabled === false ? '启用' : '停用'}</button>
          <button class="button is-small is-light" data-del="${esc(i.key)}">移除</button>
        </td></tr>`).join(''),
      white: (d.whitelist || []).map((i) => `<tr>
        <td><b>${esc(i.key)}</b></td>
        <td><span class="tag is-success is-light">${esc(i.source || '放行')}</span></td>
        <td class="x-muted" style="font-size:12px">${esc(i.reason || '—')}</td>
        <td>${i.hits || 0} 次</td>
        <td class="x-muted" style="font-size:12px">${esc(fmtTime(i.added_at))}</td>
        <td class="acts"><button class="button is-small is-light" data-delw="${esc(i.key)}">移除</button></td></tr>`).join(''),
      plugin: (d.plugin_allow || []).map((i) => `<tr>
        <td><b>${esc(i.host)}</b></td>
        <td><span class="tag is-light">扩展端 7 天放行</span></td>
        <td class="x-muted" style="font-size:12px">到期：${esc(new Date(i.expires_at).toLocaleString('zh-CN'))}</td>
        <td>${i.expired ? '<span class="tag is-light">已过期</span>' : `<span class="tag is-success is-light">剩 ${i.days_left} 天</span>`}</td>
        <td class="x-muted" style="font-size:12px">—</td>
        <td class="acts"><button class="button is-small is-light" data-delp="${esc(i.host)}">取消放行</button></td></tr>`).join(''),
    };
    const emptyText = {
      black: '黑名单是空的。把**你已经确认**的冒牌/诈骗域名或主体名加进来，插件命中就会直接拦下。',
      white: '白名单是空的。家人自证或你手动放行的企业会出现在这里，命中即不打扰。',
      plugin: '插件还没有上报站点放行记录。装好扩展后在插件弹窗点「此站不再提醒（7 天）」，这里就会出现。',
    };

    $('#view').innerHTML = `
      ${pageHead('名单管理', '黑名单直接拦截 · 白名单直接放行 · 与浏览器插件连通', null,
        [['首页', '#/home'], ['配置'], ['名单管理']])}

      <div class="x-card"><div class="bd">
        <p class="x-muted" style="margin:0 0 var(--x-s3);line-height:1.8">
          <b>黑名单 = 直接拦截</b>：命中的域名/主体名一律判为高风险并通知家人（不依赖六锚点是否恰好抓到证据）。<br>
          <b>白名单 = 放行</b>：命中的主体判绿、不再打扰。<b>两张名单都与浏览器插件连通</b>（插件每 60 秒同步一次）。<br>
          <b>纪律</b>：黑名单只放"你能指出具体不符点"的条目；内置项是团队已核实的（附证据与来源链接），
          与自建条目一样可以<b>停用或直接移除</b>。
        </p>
        <div class="x-kpis" style="grid-template-columns:repeat(4,1fr)">
          <div class="x-kpi"><div class="k">黑名单</div><div class="v x-bad">${c.blacklist || 0}</div></div>
          <div class="x-kpi"><div class="k">其中启用</div><div class="v x-ok">${c.blacklist_enabled || 0}</div></div>
          <div class="x-kpi"><div class="k">白名单</div><div class="v x-info">${c.whitelist || 0}</div></div>
          <div class="x-kpi"><div class="k">累计拦截</div><div class="v x-grey">${d.hits_total || 0} 次</div></div>
        </div>

        ${tabs(LIST_TABS.map((t) => ({ key: t.key, label: t.label, count: tabCount[t.key] || 0 })), LIST_TAB)}
        <p class="x-muted" style="font-size:12.5px;margin:0 0 var(--x-s3)">${LIST_TABS.find((t) => t.key === LIST_TAB).hint.replace(/\*\*/g, '')}</p>

        ${LIST_TAB === 'plugin' ? '' : `
        <div style="display:flex;gap:var(--x-s2);flex-wrap:wrap;align-items:center;margin-bottom:var(--x-s2)">
          <input class="input" id="listInput" style="max-width:360px" placeholder="${LIST_TAB === 'black' ? '域名或企业名，如 bcmixue.cn / 某某餐饮管理有限公司' : '要放行的企业名'}">
          <span class="select is-small"><select id="listKind">
            <option value="auto">自动识别</option><option value="domain">域名</option><option value="entity">主体名</option>
          </select></span>
          <input class="input" id="listNote" style="max-width:240px" placeholder="备注/理由（可选；黑名单建议写清不符点）">
          <button class="button is-primary is-small" id="listAdd">添加</button>
          <button class="button is-light is-small" id="listBulk">批量粘贴</button>
          <button class="button is-light is-small" id="listExport">导出 JSON</button>
          <label class="button is-light is-small" style="margin:0">导入<input type="file" id="listImport" accept=".json" style="display:none"></label>
          <span class="x-muted" id="listMsg" style="font-size:12px"></span>
        </div>
        <textarea class="textarea" id="listBulkBox" style="display:none;margin-bottom:var(--x-s2)" rows="4"
          placeholder="每行一条，支持「值,备注」格式，例如：&#10;bcmixue.cn,冒用蜜雪冰城名义招商&#10;某某餐饮管理有限公司,与官方主体不符"></textarea>`}

        <div class="x-table-wrap" style="max-height:none">
          <table class="table is-fullwidth x-table">
            <thead><tr>
              <th>${LIST_TAB === 'black' ? '域名 / 主体名' : LIST_TAB === 'white' ? '企业' : '站点'}</th>
              <th>来源</th><th>${LIST_TAB === 'plugin' ? '到期时间' : '证据 / 理由'}</th>
              <th>${LIST_TAB === 'plugin' ? '剩余' : '命中'}</th><th>添加时间</th><th>操作</th>
            </tr></thead>
            <tbody>${rows[LIST_TAB] || `<tr><td colspan="6">${emptyState({
              icon: 'list',
              title: LIST_TAB === 'black' ? '黑名单还是空的' : (LIST_TAB === 'white' ? '白名单还是空的' : '还没有站点放行记录'),
              desc: emptyText[LIST_TAB].replace(/\*\*/g, ''),
              compact: true,
            })}</td></tr>`}</tbody>
          </table>
        </div>
      </div></div>`;

    // 交互
    document.querySelectorAll('[data-tab]').forEach((a) => {
      a.onclick = (ev) => { ev.preventDefault(); LIST_TAB = a.getAttribute('data-tab'); viewLists(); };
    });
    const post = async (url, body) => (await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
    const msg = (t) => { const el = document.getElementById('listMsg'); if (el) el.textContent = t; };
    const addBtn = document.getElementById('listAdd');
    if (addBtn) {
      const doAdd = async (value, kind, note) => {
        const url = LIST_TAB === 'black' ? '/api/v1/lists/blacklist' : '/api/v1/lists/whitelist';
        const r = await post(url, { value: value, kind: kind, note: note });
        return r;
      };
      addBtn.onclick = async () => {
        const v = document.getElementById('listInput').value.trim();
        if (!v) { msg('请输入内容'); return; }
        const r = await doAdd(v, document.getElementById('listKind').value, document.getElementById('listNote').value.trim());
        msg(r.ok ? (r.already ? '已存在' : '已添加') : (r.error || '失败'));
        document.getElementById('listInput').value = ''; document.getElementById('listNote').value = '';
        await loadLists(); viewLists();
      };
      document.getElementById('listBulk').onclick = () => {
        const t = document.getElementById('listBulkBox');
        t.style.display = t.style.display === 'none' ? 'block' : 'none';
      };
      document.getElementById('listBulkBox').addEventListener('change', async (ev) => {
        const lines = String(ev.target.value || '').split('\n').map((s) => s.trim()).filter(Boolean);
        let ok = 0;
        for (const ln of lines) {
          const parts = ln.split(/[,，]/);
          const r = await doAdd(parts[0].trim(), 'auto', (parts[1] || '').trim());
          if (r.ok) ok += 1;
        }
        msg(`批量添加完成：${ok}/${lines.length} 条`);
        ev.target.value = '';
        await loadLists(); viewLists();
      });
      document.getElementById('listExport').onclick = () => {
        const blob = new Blob([JSON.stringify({ blacklist: d.blacklist, whitelist: d.whitelist }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'xray-lists.json'; a.click();
        URL.revokeObjectURL(a.href);
      };
      document.getElementById('listImport').onchange = async (ev) => {
        const f = ev.target.files[0]; if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          let n = 0;
          for (const i of (j.blacklist || [])) { const r = await post('/api/v1/lists/blacklist', { value: i.key, kind: i.kind, note: i.evidence }); if (r.ok) n++; }
          for (const i of (j.whitelist || [])) { const r = await post('/api/v1/lists/whitelist', { value: i.key, note: i.reason }); if (r.ok) n++; }
          msg(`导入完成：${n} 条`);
        } catch (e) { msg('导入失败：' + e.message); }
        await loadLists(); viewLists();
      };
    }
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = async () => {
        await post('/api/v1/lists/blacklist/toggle', { value: b.getAttribute('data-toggle'), enabled: b.getAttribute('data-on') === '1' });
        await loadLists(); viewLists();
      };
    });
    document.querySelectorAll('[data-del]').forEach((b) => {
      b.onclick = async () => {
        const r = await post('/api/v1/lists/blacklist/remove', { value: b.getAttribute('data-del') });
        if (r.note) alert(r.note);        // 移除内置项时给出"如何恢复"的提示（不再阻止删除）
        await loadLists(); viewLists();
      };
    });
    document.querySelectorAll('[data-delw]').forEach((b) => {
      b.onclick = async () => {
        await post('/api/v1/lists/whitelist/remove', { value: b.getAttribute('data-delw') });
        await loadLists(); viewLists();
      };
    });
    document.querySelectorAll('[data-delp]').forEach((b) => {
      b.onclick = async () => {
        const r = await post('/api/v1/lists/plugin-allow/remove', { host: b.getAttribute('data-delp') });
        alert(r.note || '已登记取消');
        await loadLists(); viewLists();
      };
    });
  }
