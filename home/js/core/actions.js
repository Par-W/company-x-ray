/* actions.js · 业务动作（查询 / 追踪 / 档案 / AI / 设置） */

import { esc, sk, state } from '../core/env.js';
import { radar } from '../core/charts.js';
import { recentPush } from '../core/store.js';
import { renderMerged, secHtml, uniSeq } from '../components/result.js';

  export async function postJSON(url, body) {
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  /* 查询名的**唯一取值口径**。
     ⚠ 页面上有两个输入框：顶栏的 #q 与首页工作区的 #q2。
       以前只读 #q，而工作区的 #q2 → #q 是靠 input 事件委托同步的 ——
       直接赋值（点「库内样本」）不触发 input，#q 就是旧的，
       于是查询报「请先输入公司或品牌名」（用户体感：查询功能坏了）。
     现在两个框都读，谁有内容用谁；两个都有且不一致时以**最后被编辑的那个**为准
     （顶栏是主入口，优先）。 */
  export function currentQuery() {
    const top = ($('#q') || {}).value || '';
    const work = (document.getElementById('q2') || {}).value || '';
    return String(top.trim() || work.trim() || '').trim();
  }
  export async function doUnified() {
    const name = currentQuery();
    if (!name) { msg('请先输入公司或品牌名'); return; }
    if (!document.getElementById('verdictBox')) { location.hash = '#/home'; setTimeout(doUnified, 300); return; }
    const my = ++uniSeq.n;
    recentPush(name);
    const invType = (document.getElementById('invType') || {}).value || 'listed';
    const typeLabel = invType === 'listed' ? '上市公司查询' : '未上市公司查询';
    msg('正在查询…（可信度先出，投资评分要联网取行情/财报，通常 2–20 秒）');
    $('#verdictBox').innerHTML = sk(6);

    // 投资评分先发出去、不 await：它与本地可信度并行，不互相拖慢
    let invErr = '';
    const pInvest = postJSON('/api/v1/invest', { name, type: invType })
      .catch((e) => { invErr = String((e && e.message) || e); return null; });

    let uni = null;
    try {
      uni = await postJSON('/api/v2/query', { name, cloud: false });   // ① 本地立刻出
    } catch (e) {
      if (my === uniSeq.n) {
        $('#verdictBox').innerHTML = '<p class="x-muted">查询失败（后端未响应）。</p>';
        msg(String(e));
      }
      return;
    }
    if (my !== uniSeq.n) return;
    state.lastVerdict = uni.verdict;
    renderMerged(uni, null, { phase: 'local', typeLabel, invErr, invType });     // 先给一半，别让人干等

    const inv = await pInvest;                                          // ② 投资评分
    if (my !== uniSeq.n) return;
    renderMerged(uni, inv, { phase: 'invest', typeLabel, invErr, invType });

    try {                                                               // ③ 云端线索并入
      const full = await postJSON('/api/v2/query', { name, cloud: true });
      if (my !== uniSeq.n) return;
      state.lastVerdict = full.verdict;
      renderMerged(full, inv, { phase: 'done', typeLabel, invErr, invType });
    } catch (e) { /* 云端失败不影响已渲染的结果 */ }
    msg('');
  }
  export function doInvest() { return doUnified(); }
  export function doVerify() { return doUnified(); }
  export function searchInvest() { return doUnified(); }
  export async function doProfile() {
    const name = currentQuery();
    if (!name) { msg('请先输入公司或品牌名'); return; }
    if (!document.getElementById('profileBox')) { location.hash = '#/home'; setTimeout(doProfile, 260); return; }
    msg('正在收集档案…（联网那节十几秒）'); $('#profileBox').innerHTML = sk(7);
    recentPush(name);
    let ok = false;
    try {
      const d = await (await fetch('/api/v1/profile/' + encodeURIComponent(name), { cache: 'no-store' })).json();
      state.lastProfile = d;
      $('#profileBox').innerHTML = d.sections.map(secHtml).join('')
        + `<p class="x-muted" style="font-size:12px">${esc(d.disclaimer)}（生成于 ${esc(d.generated_at)}）</p>`;
      const a = (d.sections.find((s) => s.key === 'anchors') || {}).rows;
      if (a && a.length && $('#radarBox')) $('#radarBox').innerHTML = radar(a.map((r) => ({ name: r.name, pass: r.pass })));
      msg('');
      ok = true;
    } catch (e) { $('#profileBox').innerHTML = '<p class="x-muted">收集失败（后端未响应或超时）。</p>'; msg(String(e)); }
    if (!ok) return;

    // 追踪中的企业：每次收集档案都记一次快照（这就是「变化监测」的数据来源）
    try {
      const list = await trackedNames();
      if (list.some((n) => String(n).trim() === name)) {
        const s = await (await fetch('/api/v1/track/snapshot', { method: 'POST',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })).json();
        if (s && s.ok) msg(`已为该企业记下一次快照（可在「追踪 → 变化监测」查看与上次相比的变化）。`);
      }
    } catch (e) { /* 快照失败不影响档案展示 */ }

    // AI 已启用时自动整理一次（人类反馈："配了密钥但不知道有什么用"——那就别再让他手动点）
    try {
      const st = await (await fetch('/api/v1/ai/profile-status', { cache: 'no-store' })).json();
      if (st.enabled) {
        msg((msg() || '') + ' 正在用 AI 把档案整理成人话…');
        await doAi(true);
      }
    } catch (e) { /* 忽略 */ }
  }
  export async function aiStatus() {
    const el = $('#aiState'); if (!el) return;
    try {
      const d = await (await fetch('/api/v1/ai/profile-status', { cache: 'no-store' })).json();
      el.textContent = d.enabled ? `AI 已启用（${d.model}）· 收集档案后自动整理` : 'AI 未启用 —— 到「⚙ 设置」填 API Key 即可自动整理';
    } catch (e) { el.textContent = ''; }
  }
  export async function doAi(auto) {
    const name = currentQuery();
    if (!name) { msg('请先输入公司或品牌名'); return; }
    if (!document.getElementById('aiBox')) { location.hash = '#/home'; setTimeout(() => doAi(auto), 300); return; }
    $('#aiHost').style.display = 'block';
    $('#aiBox').innerHTML = '<div class="x-sk" style="width:70%"></div><div class="x-sk" style="width:90%"></div>';
    if (auto) msg('档案已就绪，正在用 AI 把它整理成人话…');
    try {
      const d = await (await fetch('/api/v1/ai/profile-summary', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })).json();
      if (!d.ok) { $('#aiBox').innerHTML = `<b>AI 未给出结果</b><div class="x-muted">${esc(d.note || '')}</div>`; return; }
      $('#aiBox').innerHTML = `<div style="font-weight:700;margin-bottom:6px">✨ AI 把上面的公开事实整理成了人话
          <span class="tag is-light">不参与判级</span></div>
        <div>${esc(d.text).replace(/\n/g, '<br>')}</div>
        <div class="x-muted" style="margin-top:8px;font-size:12px">${esc(d.disclaimer || '')}
        ${d.filtered ? `<br><b style="color:var(--x-grey)">已自动剔除 AI 输出中的定性词：${esc((d.banned_hits || []).join('、'))}</b>` : ''}</div>`;
      if (auto) msg('AI 整理完成（见下方紫色卡片）。');
    } catch (e) { $('#aiBox').innerHTML = `<b>AI 调用失败</b><div class="x-muted">${esc(String(e))}</div>`; }
  }
  export async function trackedNames() {
    try { return ((await (await fetch('/api/v1/track', { cache: 'no-store' })).json()).tracked || []).map((t) => t.name); }
    catch (e) { return []; }
  }
  export function paintStar(on) {
    const b = document.getElementById('btnStar');
    if (!b) return;
    b.textContent = on ? '已追踪' : '追踪';
    // 点亮反馈：金色 + 轻微放大（金色即 --x-grey 的琥珀档，与"待留意"同一支）
    b.style.background = on ? 'var(--x-sev-bg-warn)' : '';
    b.style.borderColor = on ? 'var(--x-grey)' : '';
    b.style.color = on ? 'var(--x-grey)' : '';
    b.style.fontWeight = on ? '800' : '';
    b.style.transform = on ? 'scale(1.06)' : '';
    if (on) setTimeout(() => { if (b) b.style.transform = ''; }, 220);
  }
  export async function syncStar() {
    const name = currentQuery();
    if (!name) { paintStar(false); return; }
    const list = await trackedNames();
    paintStar(list.some((n) => String(n).trim() === name));
  }
  export async function toggleTrack() {
    const name = currentQuery();
    if (!name) { msg('请先输入公司或品牌名'); return; }
    const list = await trackedNames();
    const on = list.some((n) => String(n).trim() === name);
    if (on) {
      await fetch('/api/v1/track/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }) });
      paintStar(false);
      msg(`已取消追踪「${name}」。`);
      return;
    }
    // 首次追踪：后端在**后台**跑「近 6 个月基线扫描」，这里不再干等
    paintStar(true);
    msg(`已加入追踪「${name}」，正在后台查询它近 6 个月的公开信息…（有上市数据的会带上联网财务）`);
    const r = await (await fetch('/api/v1/track', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }) })).json();
    if (r.baseline_pending) {
      msg(`已追踪「${name}」。近 6 个月信息正在后台查询，稍后到「变化监测」即可看到（不用等）。`);
    } else if (r.baseline) {
      msg(`已追踪「${name}」，并已查到近 6 个月信息（${r.baseline.window.from} ~ ${r.baseline.window.to}）。`);
    } else {
      msg(`已追踪「${name}」——已记下第 1 次核验作为起点。`);
    }
    setTimeout(() => { location.hash = '#/changes?name=' + encodeURIComponent(name); }, 600);
  }
  export async function copyName(explicit) {
    const n = explicit || currentQuery();
    if (!n || n === '（未输入）') { msg('请先输入公司或品牌名'); return; }
    try { await navigator.clipboard.writeText(n); msg(`已复制「${n}」，粘贴到官方入口搜索框即可。`); }
    catch (e) { msg('复制失败，请手动选中输入框内容复制。'); }
  }
  export function msg(t) {
    const el = document.getElementById('msg');
    if (t === undefined) return el ? el.textContent : '';
    if (el) el.textContent = t;
  }
  export async function loadSettings() {
    try {
      const d = await (await fetch('/api/v1/settings/ai', { cache: 'no-store' })).json();
      $('#setKeyState').textContent = d.has_key
        ? `当前：已配置（来源：${d.source}${d.key_masked ? '，' + d.key_masked : ''}${d.env_override ? '；环境变量优先' : ''}）`
        : '当前：未配置';
      $('#setModel').value = d.model || '';
      $('#setBase').value = d.base_url || '';
    } catch (e) { $('#setKeyState').textContent = '读取设置失败'; }
  }
  export function setMsg(t, cls) {
    const el = $('#setMsg'); el.style.display = 'block';
    el.className = 'notification ' + (cls || 'is-light'); el.textContent = t;
  }
  export async function saveSettings() {
    const key = $('#setKey').value;
    const body = { model: $('#setModel').value.trim(), base_url: $('#setBase').value.trim() };
    if (key === '-') body.api_key = '';
    else if (key.trim()) body.api_key = key.trim();
    const d = await (await fetch('/api/v1/settings/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) })).json();
    setMsg(d.note + `（来源：${d.source}，模型：${d.model}）`, d.enabled ? 'is-success is-light' : 'is-warning is-light');
    $('#setKey').value = '';
    loadSettings(); aiStatus();
  }
  export async function testSettings() {
    setMsg('正在测试连接…');
    const d = await (await fetch('/api/v1/settings/ai/test', { method: 'POST' })).json();
    setMsg(d.ok ? `连接成功：模型 ${d.model} 回复「${d.reply || ''}」` : (d.note || '测试失败'), d.ok ? 'is-success is-light' : 'is-danger is-light');
  }
