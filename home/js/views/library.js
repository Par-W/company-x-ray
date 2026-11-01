/* ==========================================================================
 * views/library.js · 官方核验入口资料库（3.1.0 重做）
 * --------------------------------------------------------------------------
 * 3.1.0 之前这里只是「每个分组一张卡、卡里一排磁贴」的静态列表。
 * 入口从 28 条扩到 102 条之后，那个形态就崩了：
 *   · 一屏放不下，用户不知道该翻到哪里；
 *   · 找东西只能靠肉眼扫标题（「商标」在哪一栏？翻了三屏才看到）；
 *   · 每条只有一句话，看不出「在这里具体查什么」。
 *
 * 现在改成**可搜、可筛、可折叠**的资料库：
 *   ① 顶部指标条：入口总数 / 覆盖分组 / 官方占比（现算，不写死）
 *   ② 实时搜索框：按名称、用途、怎么用、标签全文匹配（纯前端，不发请求）
 *   ③ 分组导航：点一下滚到该组，并显示该组有几条
 *   ④ 分组可折叠：默认展开第一组（六锚点），其余收起 —— 首屏就不会是一堵墙
 *   ⑤ 每条三件事说清楚：**查得到什么** / **怎么查** / **直接打开**
 *   ⑥ 第三方平台与官方入口视觉上彻底分开（标签 + 配色）
 *
 * ⚠ 搜索只筛「已渲染的条目」，不重新请求 —— 102 条全在内存里，
 *   一次 innerHTML 重排就够快，没必要走网络。
 * ========================================================================== */

import { esc } from '../core/env.js';
import { copyName } from '../core/actions.js';
import { pageHead, emptyState } from '../components/components.js';

/* 折叠状态：记住用户上次展开到哪儿（刷新页面不丢）。 */
const LS_OPEN = 'xray.libOpen';
const LS_Q = 'xray.libQuery';

function loadOpen() {
  try {
    const v = localStorage.getItem(LS_OPEN);
    if (!v) return null;
    const arr = JSON.parse(v);
    return Array.isArray(arr) ? arr : null;
  } catch (e) { return null; }
}
function saveOpen(list) {
  try { localStorage.setItem(LS_OPEN, JSON.stringify(list)); } catch (e) { /* 无痕模式：只本次 */ }
}

/* 匹配：名称 / 用途 / 怎么用 / 标签 / 分组名 —— 全都参与。 */
function match(item, group, kw) {
  if (!kw) return true;
  const hay = [
    item.name, item.what, item.how, group.title, group.key,
    ...(item.tags || []),
  ].join(' ').toLowerCase();
  return kw.split(/\s+/).filter(Boolean).every((w) => hay.indexOf(w) >= 0);
}

/** 组内条目数（不受搜索影响 —— 导航上的数字要是真实容量，不是过滤后的残数）。 */
function groupCount(g) {
  return (g.items || []).length;
}

export function viewLibrary() {
  const lib = window.XrayLibrary || { groups: [] };
  const groups = lib.groups || [];
  const cur = ($('#q') || {}).value ? $('#q').value.trim() : '';
  const total = groups.reduce((a, g) => a + groupCount(g), 0);
  const official = groups.filter((g) => !g.third).reduce((a, g) => a + groupCount(g), 0);
  const third = total - official;

  /* 展开状态：默认只展开六锚点组（首屏给最该看的那几个），
     用户手动改过就以他上次的选择为准。 */
  const saved = loadOpen();
  const openSet = new Set(saved || ['anchors']);
  const kw = (function () {
    try { return localStorage.getItem(LS_Q) || ''; } catch (e) { return ''; }
  })().trim().toLowerCase();

  const groupHtml = (g) => {
    const items = g.items || [];
    const hit = items.filter((it) => match(it, g, kw));
    if (kw && !hit.length) return '';
    const open = openSet.has(g.key);
    return `
      <div class="x-card x-lib-group" id="libg-${esc(g.key)}" data-group="${esc(g.key)}">
        <div class="hd">
          <span class="x-bar"></span>
          <h2>${esc(g.icon || '')} ${esc(g.title)}</h2>
          <span class="x-tag mono">${hit.length} 条</span>
          ${g.third ? '<span class="x-tag warn">非官方 · 仅作线索</span>'
            : '<span class="x-tag ok">官方</span>'}
          <div class="right">
            <button class="x-btn sm" data-toggle="${esc(g.key)}" aria-expanded="${open ? 'true' : 'false'}">
              ${open ? '收起' : '展开'}</button>
          </div>
        </div>
        <div class="bd">
          ${g.hint ? `<div class="x-note" style="margin-bottom:10px">${esc(g.hint)}</div>` : ''}
          <div class="x-lib-items${open ? '' : ' collapsed'}">
            ${hit.map((it) => {
              /* 官方条目给「打开」；有 q 模板的额外给「带名搜索」——
                 只有确实支持 URL 传参的站点才有这个按钮（见 library.js 的说明）。 */
              const qUrl = it.q ? it.q.replace('{q}', encodeURIComponent(cur || '公司名')) : '';
              return `
                <div class="x-lib-item">
                  <div class="x-lib-item-hd">
                    <span class="x-lib-name">${esc(it.name)}</span>
                    ${it.tags && it.tags.length ? `<span class="x-tag mono x-lib-tags">${esc(it.tags[0])}</span>` : ''}
                  </div>
                  <div class="x-lib-what">${esc(it.what || '')}</div>
                  ${it.how ? `<div class="x-lib-how"><b>怎么查</b>${esc(it.how)}</div>` : ''}
                  <div class="x-lib-ops">
                    <a class="x-btn sm primary" href="${esc(it.url)}" target="_blank" rel="noopener">打开 ↗</a>
                    ${qUrl ? `<a class="x-btn sm" href="${esc(qUrl)}" target="_blank" rel="noopener"
                      title="打开检索页并带上当前查询名">带名搜索 ↗</a>` : ''}
                    <button class="x-btn sm ghost" data-copy="${esc(it.name)}">复制名称</button>
                    <a class="x-quiet x-lib-url" href="${esc(it.url)}" target="_blank" rel="noopener"
                      title="${esc(it.url)}">${esc(it.url.replace(/^https?:\/\//, ''))}</a>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  };

  $('#view').innerHTML = `
    ${pageHead('资料库 · 官方核验入口', lib.note || '', `
      <button class="x-btn sm" id="libCopy">复制当前名字</button>`, [['首页', '#/home'], ['资料库']])}

    <div class="x-metrics">
      <div class="x-metric"><div class="k">官方核验入口</div><b>${total}</b><div class="s">每条结论可回溯原文</div></div>
      <div class="x-metric"><div class="k">官方来源</div><b class="v-ok">${official}</b><div class="s">政府 / 交易所 / 行业主管部门</div></div>
      <div class="x-metric"><div class="k">第三方线索</div><b class="v-warn">${third}</b><div class="s">仅用于快速定位，结论须回官方</div></div>
      <div class="x-metric"><div class="k">覆盖分组</div><b class="v-info">${groups.length}</b><div class="s">按核验事项分组</div></div>
    </div>

    <div class="x-card"><div class="bd">
      <div class="x-lib-search">
        <input class="x-input" id="libQ" type="search" autocomplete="off"
               placeholder="搜入口、用途或关键词，例如：商标 / 诉讼 / 备案 / 发票 / 资质" value="${esc(kw)}">
        <button class="x-btn" id="libClear" type="button">清空</button>
      </div>
      <div class="x-lib-nav">
        ${groups.map((g) => `
          <button class="x-btn sm" data-jump="${esc(g.key)}" title="${esc(g.title)}">
            ${esc(g.icon || '')} ${esc(g.title.replace(/（.*?）/g, '').replace(/本产品判定的依据/g, '').trim())}
            <span class="x-quiet">${groupCount(g)}</span>
          </button>`).join('')}
      </div>
      <div class="x-muted" style="font-size:11.5px;margin-top:8px">
        搜索是<b>本机即时过滤</b>（不发任何请求）。点分组名可跳到该组；
        「展开 / 收起」只影响显示，不影响条目数量。
      </div>
      <div id="libStat" class="x-muted" style="font-size:11.5px;margin-top:4px"></div>
    </div></div>

    <div id="libGroups">${groups.map(groupHtml).join('')}</div>

    ${groups.every((g) => !(g.items || []).some((it) => match(it, g, kw)))
      ? `<div class="x-card"><div class="bd">${emptyState({
          icon: 'search',
          title: '没有匹配的入口',
          desc: '换个词试试，或点上面的「清空」看全部 ' + total + ' 条。',
          actions: '<button class="x-btn sm primary" id="libEmptyClear">清空搜索</button>',
        })}</div></div>` : ''}
  `;

  /* ---------- 交互 ---------- */

  const paintStat = () => {
    const el = document.getElementById('libStat');
    if (!el) return;
    const shown = groups.reduce((a, g) => a
      + (g.items || []).filter((it) => match(it, g, $('#libQ') ? $('#libQ').value.trim().toLowerCase() : '')).length, 0);
    el.textContent = $('#libQ') && $('#libQ').value.trim()
      ? `当前匹配 ${shown} / ${total} 条。`
      : `共 ${total} 条入口，其中官方 ${official} 条。`;
  };
  paintStat();

  const applyFilter = () => {
    const v = $('#libQ') ? $('#libQ').value.trim().toLowerCase() : '';
    try { localStorage.setItem(LS_Q, v); } catch (e) { /* 无痕模式 */ }
    $('#libGroups').innerHTML = groups.map(groupHtml).join('');
    paintStat();
    // 过滤后可能一个都不剩，补一条空状态
    const any = $('#libGroups').textContent.trim().length > 0;
    const box = document.getElementById('libEmptyBox');
    if (!any) {
      if (!box) {
        const d = document.createElement('div');
        d.className = 'x-card';
        d.id = 'libEmptyBox';
        d.innerHTML = '<div class="bd"><div class="x-empty">'
          + '<div class="e-title">没有匹配的入口</div>'
          + '<div class="e-desc">换个词试试，或点上面的「清空」看全部 ' + total + ' 条。</div>'
          + '<div class="x-empty-act"><button class="x-btn sm primary" id="libEmptyClear">清空搜索</button></div>'
          + '</div></div>';
        $('#libGroups').after(d);
        const c2 = document.getElementById('libEmptyClear');
        if (c2) c2.onclick = () => { if (lb) { lb.value = ''; applyFilter(); lb.focus(); } };
      }
    } else if (box) {
      box.remove();
    }
  };

  const lb = document.getElementById('libQ');
  if (lb) {
    lb.addEventListener('input', applyFilter);
    lb.addEventListener('keydown', (e) => { if (e.key === 'Escape') { lb.value = ''; applyFilter(); } });
  }
  const cl = document.getElementById('libClear');
  if (cl) cl.onclick = () => { if (lb) { lb.value = ''; applyFilter(); lb.focus(); } };
  // 首屏就无匹配时（localStorage 里存了旧关键词），空态里的「清空」也要能用
  const ec0 = document.getElementById('libEmptyClear');
  if (ec0) ec0.onclick = () => { if (lb) { lb.value = ''; applyFilter(); lb.focus(); } };

  // 分组折叠：只改 class，不写内联 display（折叠态要能被 CSS 规则顶掉）
  document.querySelectorAll('[data-toggle]').forEach((b) => {
    b.onclick = () => {
      const key = b.getAttribute('data-toggle');
      const card = b.closest('.x-lib-group');
      const body = card ? card.querySelector('.x-lib-items') : null;
      const btn = card ? card.querySelector('[data-toggle]') : null;
      if (!body || !btn) return;
      const nowOpen = body.classList.toggle('collapsed') === false;
      btn.textContent = nowOpen ? '收起' : '展开';
      btn.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      const list = Array.from(openSet);
      const i = list.indexOf(key);
      if (nowOpen && i < 0) list.push(key);
      if (!nowOpen && i >= 0) list.splice(i, 1);
      openSet.clear();
      list.forEach((k) => openSet.add(k));
      saveOpen(list);
    };
  });

  // 分组导航：滚动到该组，并把该组展开
  document.querySelectorAll('[data-jump]').forEach((b) => {
    b.onclick = () => {
      const key = b.getAttribute('data-jump');
      const card = document.getElementById('libg-' + key);
      if (!card) return;
      const body = card.querySelector('.x-lib-items');
      const btn = card.querySelector('[data-toggle]');
      if (body && body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        if (btn) { btn.textContent = '收起'; btn.setAttribute('aria-expanded', 'true'); }
        if (!openSet.has(key)) { openSet.add(key); saveOpen(Array.from(openSet)); }
      }
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  $('#libCopy').onclick = copyName;
  document.querySelectorAll('[data-copy]').forEach((b) => {
    b.onclick = () => copyName(b.getAttribute('data-copy'));
  });
}
