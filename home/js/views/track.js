/* views/track.js · 追踪与变化监测 */

import { AI_DONE, esc, sk, state } from '../core/env.js';
import { bigChartHtml, renderBigChart } from '../core/charts.js';
import { SEV, timelineHtml } from '../components/panels.js';
import { msg } from '../core/actions.js';
import { pageHead, emptyState } from '../components/components.js';

  export async function changesPanel(name, box) {
    box.style.display = 'block';
    box.innerHTML = sk(5);
    const d = await (await fetch('/api/v1/changes/' + encodeURIComponent(name), { cache: 'no-store' })).json();
    if (!d.ok) {
      box.innerHTML = `<div class="x-note">${esc(d.note || '')}</div>`;
      return;
    }
    const dirCls = { bad: 'is-danger', good: 'is-success', flat: 'is-light', new: 'is-info' }[d.direction.kind] || 'is-light';
    const grp = (g) => (g.items && g.items.length)
      ? `<div style="margin-top:12px"><div style="font-weight:700;font-size:13.5px">${esc(g.title)}
           <span class="x-muted" style="font-weight:400">${esc(g.hint)}</span></div>
           ${g.items.map((it) => { const s = SEV[it.severity] || SEV.info;
             return `<div style="margin-top:6px;padding:8px 10px;border-radius:var(--x-r-sm);background:${s.bg};border-left:3px solid ${s.c}">
               <span style="color:${s.c};font-weight:700;font-size:12px">${s.t}</span>
               <span style="font-size:13px">${esc(it.text)}</span>
               <span class="x-muted" style="font-size:11.5px">（${esc((it.ts || '').replace('T', ' ').slice(0, 16))}）</span></div>`; }).join('')}</div>`
      : `<div style="margin-top:12px"><div style="font-weight:700;font-size:13.5px">${esc(g.title)}</div>
         <div class="x-muted" style="font-size:12.5px">✅ 与上次核验一致，无需处理（${esc(g.hint)}）</div></div>`;

    // 首次追踪基线（近 6 个月）——后端 baseline_scan 的产物
    let baseHtml = '';
    if (d.baseline_status === 'running' || d.baseline_status === 'pending') {
      baseHtml = `<div class="x-card" style="margin-top:14px;border-color:var(--x-soft-border)"><div class="bd">
        <b>📅 正在后台查询该企业近 6 个月的公开信息…</b>
        <div class="x-muted" style="font-size:12.5px">含联网财务（若有上市数据）。本页稍后会自动刷新，你不用等着。</div>
        <div class="x-sk" style="width:60%"></div><div class="x-sk" style="width:80%"></div>
      </div></div>`;
      const box2 = box;
      const nm2 = d.name;
      let tries = 0;
      const timer = setInterval(async () => {
        tries += 1;
        try {
          const r = await (await fetch('/api/v1/changes/' + encodeURIComponent(nm2), { cache: 'no-store' })).json();
          if (r.baseline_status === 'done' || tries >= 10) {
            clearInterval(timer);
            if (document.body.contains(box2)) await changesPanel(nm2, box2);
          }
        } catch (e) { if (tries >= 10) clearInterval(timer); }
      }, 3000);
    } else if (d.baseline) {
      const b = d.baseline;
      const fin = (b.financial_window && b.financial_window.length)
        ? `<table class="table is-fullwidth x-table" style="margin-top:6px">
             <thead><tr><th>财务指标（近 6 个月报告期）</th><th>数值</th></tr></thead>
             <tbody>${b.financial_window.map((r) => `<tr><td>${esc(r.metric)}</td>
               <td>${Object.keys(r.values).map((k) => `${esc(k.slice(4, 6))}/${esc(k.slice(6, 8))}: <b>${esc(r.values[k])}</b>`).join('　')}</td></tr>`).join('')}</tbody>
           </table><p class="x-muted" style="font-size:11.5px">数值单位以数据源返回为准（联网项，来自公开数据源）。</p>`
        : '<p class="x-muted" style="font-size:12.5px">未匹配到上市公司联网财务数据（或接口暂时不可用）。</p>';
      baseHtml = `
        <div class="x-card" style="margin-top:14px;border-color:var(--x-soft-border)">
          <div class="hd"><span class="x-bar"></span><h2>首次追踪基线（近 6 个月）</h2>
            <span class="tag is-primary is-light">自动查询</span>
            <span class="x-muted" style="font-size:12px;margin-left:auto">
              ${esc((b.window && b.window.from) || '')} ~ ${esc((b.window && b.window.to) || '')}（${esc((b.window && b.window.days) || 183)} 天）</span></div>
          <div class="bd">
            ${b.listed && b.market ? `<p style="font-size:13.5px;margin:0 0 4px">上市主体：<b>${esc(b.market.matched_name)}（${esc(b.market.code)}）</b>${b.market.market_cap ? ` ｜ 总市值 ${esc(b.market.market_cap)}` : ''}${b.market.industry ? ` ｜ 行业 ${esc(b.market.industry)}` : ''}</p>` : ''}
            ${fin}
            ${(b.facts && b.facts.length) ? `<div style="margin-top:10px;font-weight:700;font-size:13.5px">公开事实基线</div>
              <table class="table is-fullwidth x-table">${b.facts.map((f) => `<tr><td class="x-muted" style="width:132px">${esc(f.k)}</td><td>${esc(f.v)}</td></tr>`).join('')}</table>` : ''}
            <div id="baseAi" style="margin-top:10px"></div>
            <div style="margin-top:10px;font-weight:700;font-size:13.5px">近 6 个月需要你亲自去官方查的项</div>
            <div style="margin-top:6px">${(b.unwired || []).map((u) => `<div class="x-item" style="align-items:flex-start">
              <div class="grow"><b style="font-size:13px">${esc(u.title)}</b>
                <div class="x-muted" style="font-size:12px">${esc(u.how)}　来源：${esc(u.source)}</div></div>
              <a class="button is-small is-light" href="${esc(u.url)}" target="_blank" rel="noopener">去官方查</a></div>`).join('')}</div>
            <p class="x-muted" style="font-size:12px;margin-top:8px">${esc(b.note || '')}</p>
          </div></div>`;
    }

    box.innerHTML = `
      <div class="notification ${dirCls}" style="margin:0 0 10px">
        <b>${esc(d.direction.text)}</b>
        <div class="x-muted" style="font-size:12px;margin-top:4px">
          追踪于 ${esc((d.first_seen || '').replace('T', ' ').slice(0, 16))} ｜
          共 ${d.check_count} 次核验 ｜ 上次检查 ${esc((d.last_checked || '').replace('T', ' ').slice(0, 16))} ｜
          当前：${esc(d.trust_label || '')}（一致 ${d.verified ?? '—'} 项 / 不一致 ${d.mismatch ?? 0} 项）
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <button class="button is-small is-primary" data-recheck="${esc(d.name)}">检查更新</button>
        <button class="button is-small is-light" data-look="${esc(d.name)}">查看档案</button>
        <button class="button is-small is-light" data-track="${esc(d.name)}">${d.tracked ? '取消关注' : '加入关注'}</button>
        <span class="x-muted" style="align-self:center;font-size:12px" data-msg="${esc(d.name)}"></span>
      </div>

      ${d.groups.map(grp).join('')}

      ${d.calm && d.calm.length ? `<div class="x-note" style="margin-top:12px;background:var(--x-sev-bg-ok);border-left-color:var(--x-ok)">
        <b>✅ 平静项（有人在替你盯着）</b><br>${d.calm.map((c) => '· ' + esc(c)).join('<br>')}</div>` : ''}

      <div style="margin-top:14px"><div style="font-weight:700;font-size:13.5px">📈 变化时间线（大图）</div>${bigChartHtml(d)}</div>

      <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">我们替你检查了哪些项（${(d.checklist || []).length} 条）</summary>
        <table class="table is-fullwidth x-table" style="margin-top:8px">
          <thead><tr><th>检查项</th><th>依据来源</th><th>状态</th></tr></thead>
          <tbody>${(d.checklist || []).map((c) => `<tr><td>${esc(c.label)}</td>
            <td><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.source)}</a></td>
            <td><span class="tag ${c.state === '已自动比对' ? 'is-success' : 'is-warning'} is-light">${esc(c.state)}</span></td></tr>`).join('')}</tbody>
        </table></details>

      <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">本版未接入、需要你点官方入口自查的项（${(d.unwired || []).length} 条）</summary>
        <p class="x-muted" style="margin:8px 0 4px">这些数据来自司法 / 工商 / 交易所，本系统<b>没有实时接口，也不生造事件</b>：</p>
        ${(d.unwired || []).map((u) => `<div class="x-item" style="align-items:flex-start">
            <div class="grow"><b style="font-size:13.5px">${esc(u.title)}</b>
              <div class="x-muted" style="font-size:12.5px">怎么查：${esc(u.how)}　来源：${esc(u.source)}</div></div>
            <a class="button is-small is-light" href="${esc(u.url)}" target="_blank" rel="noopener">去官方查</a></div>`).join('')}
      </details>

      <p class="x-muted" style="font-size:12px;margin-top:10px">${esc(d.note || '')}</p>
      ${baseHtml}`;

    // 画大图（Chart.js；若库没加载成功则退回文本时间线，不让页面空白）
    if (!renderBigChart(d)) {
      const box3 = document.getElementById('chgChart');
      if (box3 && box3.parentElement) box3.parentElement.innerHTML = timelineHtml(d.timeline);
    }

    // 基线里的 AI 整理（只整理已收集的事实，不参与判级）；同一次会话内同一家企业只跑一次
    const baseAi = document.getElementById('baseAi');
    if (baseAi && d.baseline && !AI_DONE.has(d.name)) {
      baseAi.innerHTML = '<div class="x-muted" style="font-size:12.5px">正在用 AI 整理近 6 个月的公开信息…（约 10 秒）</div>';
      (async () => {
        try {
          const st = await (await fetch('/api/v1/ai/profile-status', { cache: 'no-store' })).json();
          if (!st.enabled) { baseAi.innerHTML = '<div class="x-muted" style="font-size:12.5px">AI 未启用（到「⚙ 设置」填 API Key 即可自动整理，不影响其它功能）。</div>'; return; }
          const a = await (await fetch('/api/v1/ai/profile-summary', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: d.name }) })).json();
          AI_DONE.add(d.name);
          baseAi.innerHTML = a.ok
            ? `<div class="x-ai"><div style="font-weight:700;margin-bottom:6px">✨ AI 整理的关注要点 <span class="tag is-light">不参与判级</span></div>
               <div>${esc(a.text).replace(/\n/g, '<br>')}</div>
               <div class="x-muted" style="margin-top:6px;font-size:12px">${esc(a.disclaimer || '')}
               ${a.filtered ? `<br><b style="color:var(--x-grey)">已剔除定性词：${esc((a.banned_hits || []).join('、'))}</b>` : ''}</div></div>`
            : `<div class="x-muted" style="font-size:12.5px">AI 未给出结果：${esc(a.note || '')}</div>`;
        } catch (e) { baseAi.innerHTML = '<div class="x-muted" style="font-size:12.5px">AI 调用失败（不影响上面的数据）。</div>'; }
      })();
    }

    box.querySelectorAll('[data-recheck]').forEach((b) => {
      b.onclick = async () => {
        const m = box.querySelector('[data-msg]');
        if (m) m.textContent = '正在重新核验…';
        await fetch('/api/v1/changes/check/' + encodeURIComponent(b.getAttribute('data-recheck')), { method: 'POST' });
        await changesPanel(b.getAttribute('data-recheck'), box);
        viewChanges.lists && viewChanges.lists();
      };
    });
    box.querySelectorAll('[data-track]').forEach((b) => {
      b.onclick = async () => {
        const nm = b.getAttribute('data-track');
        await fetch('/api/v1/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nm }) });
        await changesPanel(nm, box); viewChanges.lists && viewChanges.lists();
      };
    });
    box.querySelectorAll('[data-look]').forEach((b) => {
      b.onclick = () => { $('#q').value = b.getAttribute('data-look'); location.hash = '#/home'; };
    });
  }
  export async function viewTrack() {
    let known = [];
    try { known = (await (await fetch('/api/v1/changes?limit=50', { cache: 'no-store' })).json()).companies || []; } catch (e) {}
    const tracked = known.filter((k) => k.tracked);
    const others = known.filter((k) => !k.tracked);

    const row = (k) => `<div class="x-item">
        <div class="grow">
          <b>${esc(k.name)}</b> ${k.tracked ? '<span class="tag is-warning is-light">已关注</span>' : ''}
          <div class="x-muted" style="font-size:12px">${esc(k.trust_label || '')}
            ｜ 一致 ${k.verified ?? '—'} 项 ${k.mismatch ? `｜ <b style="color:var(--x-bad)">不一致 ${k.mismatch} 项</b>` : ''}
            ｜ 已核验 ${k.check_count} 次 ｜ 上次 ${esc((k.last_seen || '').replace('T', ' ').slice(0, 16))}</div>
        </div>
        <a class="button is-small is-primary is-light" href="#/changes?name=${encodeURIComponent(k.name)}">📈 变化监测</a>
        <button class="button is-small is-light" data-untrack="${esc(k.name)}">取消关注</button>
        <button class="button is-small is-light" data-look="${esc(k.name)}">查看档案</button>
      </div>`;

    $('#view').innerHTML = `
      ${pageHead('追踪', '我关注的企业 · 首次追踪自动回溯近 6 个月', null,
        [['首页', '#/home'], ['监测'], ['追踪']])}

      <div class="x-card"><div class="bd">
        <p class="x-muted" style="margin:0;line-height:1.8">
          这里是你关注的企业清单。<b>首次追踪时会自动查一次它近 6 个月的公开信息</b>（有上市数据的会带上联网财务），
          之后每次核验都会留档；点右侧「变化监测」看它<b>变好还是变坏</b>（一次只看一家）。<br>
          没有关注也没关系：<b>查过或收集过档案的企业都会自动留档</b>，在下面的"最近核验过的企业"里。
        </p>
      </div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>我的关注</h2>
        <span class="tag is-light">${tracked.length} 家</span></div>
        <div class="bd${tracked.length ? ' is-flush' : ''}">${tracked.length ? tracked.map(row).join('')
          : emptyState({
              icon: 'star',
              title: '还没有关注的企业',
              desc: '在首页查到目标公司后点「追踪」，之后它每次变化都会在这里留档。',
              actions: '<a class="x-btn sm primary" href="#/home">去首页查一家</a>',
            })}</div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>最近核验过的企业</h2>
        <span class="tag is-light">${others.length} 家 · 查询即自动留档</span></div>
        <div class="bd${others.length ? ' is-flush' : ''}">${others.length ? others.map(row).join('')
          : emptyState({
              icon: 'doc',
              title: '还没有其它核验记录',
              desc: '在首页点「查询」或「收集企业档案」，这里就会自动出现它。',
              compact: true,
            })}</div></div>`;

    document.querySelectorAll('[data-untrack]').forEach((b) => {
      b.onclick = async () => {
        await fetch('/api/v1/track/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: b.getAttribute('data-untrack') }) });
        viewTrack();
      };
    });
    document.querySelectorAll('[data-look]').forEach((b) => {
      b.onclick = () => { $('#q').value = b.getAttribute('data-look'); location.hash = '#/home'; };
    });
  }
  export function hashQuery() {
    const h = location.hash || '';
    const i = h.indexOf('?');
    return new URLSearchParams(i >= 0 ? h.slice(i + 1) : '');
  }
  export async function viewChanges() {
    let known = [];
    try { known = (await (await fetch('/api/v1/changes?limit=50', { cache: 'no-store' })).json()).companies || []; } catch (e) {}
    const qs = hashQuery();
    const tracked = known.filter((k) => k.tracked);
    let name = qs.get('name') || '';
    if (!name) name = (tracked[0] || known[0] || {}).name || '';
    const options = known.map((k) => k.name);
    if (name && !options.includes(name)) options.unshift(name);

    if (!name) {
      $('#view').innerHTML = pageHead('变化监测', '看一家企业在变好还是变坏', null,
        [['首页', '#/home'], ['监测'], ['变化监测']]) + `<div class="x-card"><div class="bd">
        ${emptyState({
          icon: 'alert',
          title: '还没有任何核验过的企业',
          desc: '先去首页查一家公司，这里就会有它的变化监测。',
          actions: '<a class="x-btn primary" href="#/home">去首页查一家</a>'
            + '<a class="x-btn" href="#/track">管理关注列表 →</a>',
        })}
        <div class="x-note warn" style="margin:var(--x-s3) 0 0">
          <b>提示</b>：要<b>新增 / 取消关注</b>的企业（也就是你想长期盯着的对象），请到
          「追踪」页面管理；本页只负责看你已经关注/查过的企业的变化。
        </div>
      </div></div>`;
      return;
    }

    $('#view').innerHTML = `
      ${pageHead('变化监测', '本页只看趋势：这家企业在变好还是变坏（一次一家）', null,
        [['首页', '#/home'], ['监测'], ['变化监测']])}
      <div class="x-card"><div class="bd">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span class="x-muted" style="font-size:13px">选择企业</span>
          <span class="select is-small"><select id="chgSel">${options.map((o) =>
            `<option value="${esc(o)}"${o === name ? ' selected' : ''}>${esc(o)}${known.find((k) => k.name === o && k.tracked) ? ' ★' : ''}</option>`).join('')}</select></span>
          <a class="button is-small is-primary is-light" href="#/track">管理关注</a>
          <span class="x-muted" style="margin-left:auto;font-size:12px">带 <b>★</b> 的是已关注企业。</span>
        </div>
      </div></div>
      <div id="chgBox"></div>`;

    $('#chgSel').onchange = (e) => { location.hash = '#/changes?name=' + encodeURIComponent(e.target.value); };
    await changesPanel(name, document.getElementById('chgBox'));
  }
