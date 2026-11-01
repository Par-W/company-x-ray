/* ==========================================================================
 * components.js · 复用组件（3.2.0 重做）
 * --------------------------------------------------------------------------
 * 依据 docs/ui-reference.md：
 *   · pageHead   ← Shopify Polaris 的 Page / Stripe 的三段式 / AWS 面包屑
 *   · banner     ← Atlassian Flag / Polaris Banner
 *   · emptyState ← AWS「创建第一个」/ Polaris 教程式空态
 *   · tabs       ← Ant Design 的下划线式页签
 *
 * ⚠ 全站页头只能由 pageHead() 产出。
 *   3.1.0 有 5 个页面自己手写 `<h1 style="font-size:24px">`，而首页用组件
 *   （16px）—— 同一产品里两种标题层级。这类"看起来只是差几个像素"的分歧，
 *   在客户眼里就是"这产品不是一个团队做的"。
 * ========================================================================== */

import { html, raw } from '../core/render.js';

/* ---------- 指标块 ---------- */

export function metric(label, value, sub, tone, extra) {
  return html`
    <div class="x-metric">
      <div class="k">${label}</div>
      <b class="${tone ? 'v-' + tone : ''}">${value}</b>
      ${sub ? html`<div class="s">${sub}</div>` : null}
      ${extra || null}
    </div>`;
}

export function metrics(list) {
  return html`<div class="x-metrics">${list.map((m) => metric(m[0], m[1], m[2], m[3], m[4]))}</div>`;
}

/* ---------- 卡片 ---------- */

/** 卡片。
 *  @param {*} title   标题；为空则不画头
 *  @param {*} body    正文
 *  @param {*} right   头部右侧动作
 *  @param {false} barColor 传 false 去掉左侧色条
 *  @param {string} foot 脚注（说明这段数据的来源/口径） */
export function card(title, body, right, barColor, foot) {
  return html`
    <div class="x-card">
      ${title ? html`
        <div class="hd">
          ${barColor === false ? null : html`<span class="x-bar" style="${barColor ? `background:${barColor}` : ''}"></span>`}
          <h2>${title}</h2>
          ${right ? html`<div class="right">${right}</div>` : null}
        </div>` : null}
      <div class="bd">${body}</div>
      ${foot ? html`<div class="ft">${foot}</div>` : null}
    </div>`;
}

/* ---------- 标签 ---------- */

export function tag(text, tone, mono) {
  return html`<span class="x-tag ${tone || ''} ${mono ? 'mono' : ''}">${text}</span>`;
}

/* ---------- 提示条 ---------- */

export function note(body, tone) {
  return html`<div class="x-note ${tone || ''}">${body}</div>`;
}

/* 通知条：标题 + 说明 + 动作。
   比 note 重一档 —— note 用于一句话提醒，banner 用于"有件事你得知道/该做点什么"。 */
const BANNER_ICON = {
  bad: 'M12 3.4 2.8 20h18.4zM12 9.2v4.4M12 16.6v.9',
  warn: 'M12 3.4 2.8 20h18.4zM12 9.2v4.4M12 16.6v.9',
  ok: 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2zM8 12.2l2.8 2.8 5.2-5.6',
  '': 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2zM12 10.6v5.4M12 7.4v.9',
};

export function banner(opts) {
  const o = typeof opts === 'string' ? { title: opts } : (opts || {});
  const tone = o.tone || '';
  return html`
    <div class="x-banner ${tone}" role="${tone === 'bad' || tone === 'warn' ? 'alert' : 'status'}">
      <svg class="b-ic" viewBox="0 0 24 24" aria-hidden="true">
        <path d="${BANNER_ICON[tone] || BANNER_ICON['']}"/></svg>
      <div class="b-main">
        <div class="b-title">${o.title || ''}</div>
        ${o.body ? html`<div class="b-body">${o.body}</div>` : null}
      </div>
      ${o.actions ? html`<div class="b-acts">${o.actions}</div>` : null}
    </div>`;
}

/* ---------- 空状态 ----------
   ⚠ 必须有"下一步"：只说"没有数据"等于把用户晾在原地。
     所以 e-title / e-desc / 行动按钮三件套，缺一不可（除非真的无事可做）。 */
const EMPTY_ICON = {
  search: 'M11 4.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM16 16l4.4 4.4',
  doc: 'M6.2 3.4h7.4l4.2 4.2v13H6.2zM13.6 3.4v4.2h4.2M9.4 12.4h5.4M9.4 16h5.4',
  alert: 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2zM12 8v4.6M12 15.8v.9',
  star: 'm12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.1l-5.3 2.7 1.1-5.9L3.5 9.8l5.9-.8z',
  list: 'M4.2 4.6h6.3V19.6H4.2zM13.5 4.6h6.3V19.6h-6.3z',
};

export function emptyState(opts) {
  const o = opts || {};
  return html`
    <div class="x-empty ${o.compact ? 'is-compact' : ''}">
      <svg class="e-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="${EMPTY_ICON[o.icon] || EMPTY_ICON.doc}"/></svg>
      <div class="e-title">${o.title || '这里还没有内容'}</div>
      ${o.desc ? html`<div class="e-desc">${o.desc}</div>` : null}
      ${o.actions ? html`<div class="x-empty-act">${o.actions}</div>` : null}
    </div>`;
}

/* ---------- 表格 ---------- */

export function table(headers, rows, opts = {}) {
  return html`
    <table class="x-table">
      <thead><tr>${headers.map((hd) => html`
        <th class="${hd.num ? 'num' : ''}">${hd.label || hd}</th>`)}</tr></thead>
      <tbody>
        ${rows.length ? rows.map((r) => html`
          <tr class="${r.cls || ''}">
            ${r.cells.map((c, i) => html`
              <td class="${(headers[i] && headers[i].num) ? 'num' : ''}">${c}</td>`)}
          </tr>`) : html`
          <tr><td colspan="${headers.length}" class="x-muted" style="text-align:center;padding:16px">${opts.empty || '暂无数据'}</td></tr>`}
      </tbody>
    </table>`;
}

/* ---------- 页签（下划线式） ----------
 * items: [{ key, label, count }]，activeKey，dataAttr 默认 data-tab。
 * ⚠ 页签是"同一份数据的不同切面"，不是导航 —— 所以用下划线而不是按钮组。 */
export function tabs(items, activeKey, dataAttr) {
  const attr = dataAttr || 'data-tab';
  return html`
    <div class="x-tabs" role="tablist">
      ${items.map((t) => html`
        <button class="x-tab ${t.key === activeKey ? 'on' : ''}" role="tab"
                aria-selected="${t.key === activeKey ? 'true' : 'false'}"
                ${raw(attr + '="' + t.key + '"')}>
          ${t.label}${t.count != null ? html`<span class="ct">${t.count}</span>` : null}
        </button>`)}
    </div>`;
}

/* ---------- 雷达图（六锚点） ---------- */

/**
 * 六锚点雷达图。原版是拼字符串 + 写死颜色值，
 * 现在颜色全走变量（深浅两套自动一致）。
 */
export function radar(anchors) {
  if (!anchors || !anchors.length) return null;
  const N = anchors.length;
  const cx = 138, cy = 122, R = 92;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / N;
    return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r];
  };
  const passRate = anchors.filter((a) => a.pass).length / N;
  const poly = anchors.map((_, i) => pt(i, passRate).map((x) => x.toFixed(1)).join(',')).join(' ');

  let grid = '';
  [0.25, 0.5, 0.75, 1].forEach((r) => {
    grid += `<polygon points="${anchors.map((_, i) => pt(i, r).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--x-svg-line)" stroke-width="1"/>`;
  });
  for (let i = 0; i < N; i++) {
    const [x, y] = pt(i, 1);
    grid += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--x-svg-line)" stroke-width="1"/>`;
  }
  let dots = '', labels = '';
  anchors.forEach((a, i) => {
    const [px, py] = pt(i, passRate);
    const col = a.pass ? 'var(--x-ok)' : 'var(--x-grey)';
    dots += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="${col}"/>`;
    const [lx, ly] = pt(i, 1.24);
    labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="10.5" fill="var(--x-muted)" text-anchor="middle">${a.name}</text>`;
  });
  return raw(`<svg viewBox="0 0 276 250" width="100%" height="230" role="img" aria-label="六锚点雷达图">
    ${grid}<polygon points="${poly}" fill="var(--x-chart-fill)" stroke="var(--x-brand)" stroke-width="1.6"/>
    ${dots}${labels}</svg>`);
}

/* ---------- 迷你走势（sparkline） ---------- */

export function spark(values, opts = {}) {
  if (!values || values.length < 2) return null;
  const W = opts.width || 240, H = opts.height || 44;
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const xs = (i) => (i / (values.length - 1)) * (W - 4) + 2;
  const ys = (v) => H - 3 - ((v - min) / span) * (H - 8);
  const pts = values.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
  const area = `2,${H - 1} ${pts} ${xs(values.length - 1).toFixed(1)},${H - 1}`;
  return raw(`<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="走势">
    <polygon points="${area}" fill="var(--x-chart-fill)"/>
    <polyline points="${pts}" fill="none" stroke="var(--x-brand)" stroke-width="1.6"/>
    ${values.map((v, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(v).toFixed(1)}" r="1.8" fill="var(--x-brand)"/>`).join('')}
  </svg>`);
}

/* ---------- 页面头 ----------
 * 三层结构：面包屑 → 标题 + 副标题 → 右侧动作。
 * @param {string} title 标题
 * @param {string} sub   一句话说明（可选）
 * @param {*} right      右侧动作（可选）
 * @param {Array} crumbs 面包屑：[['标签', '#/链接'], ['当前页']]（可选；最后一项不带链接）
 */
export function pageHead(title, sub, right, crumbs) {
  return html`
    <div class="x-page-head">
      ${(crumbs && crumbs.length) ? html`
        <nav class="x-crumbs" aria-label="面包屑">
          ${crumbs.map((c, i) => html`
            ${i ? html`<span class="sep" aria-hidden="true">/</span>` : null}
            ${c[1] ? html`<a href="${c[1]}">${c[0]}</a>` : html`<span class="cur">${c[0]}</span>`}`)}
        </nav>` : null}
      <div class="x-page-head-row">
        <h1>${title}</h1>
        ${sub ? html`<span class="sub">${sub}</span>` : null}
        ${right ? html`<div class="right">${right}</div>` : null}
      </div>
    </div>`;
}
