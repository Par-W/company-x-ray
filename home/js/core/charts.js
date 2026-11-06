/* charts.js · 图表（雷达图 / 迷你走势 / 大盘走势） */

import { esc } from '../core/env.js';

  export const ORDER = ['特许经营备案', '商标持有人', 'ICP备案主体', '蓝V认证主体', '签约主体', '收款主体'];
  export const SHORT = { '特许经营备案': '备案', '商标持有人': '商标', 'ICP备案主体': 'ICP', '蓝V认证主体': '蓝V', '签约主体': '签约', '收款主体': '收款' };
  export function radar(anchors) {
    const N = 6, R = 98, cx = 138, cy = 122;
    const by = {}; (anchors || []).forEach((a) => { by[a.name] = a; });
    const v = (n) => { const a = by[n]; return a ? (a.pass === true ? 1 : (a.pass === false ? 0 : 0.5)) : null; };
    const pt = (i, val) => { const ang = -Math.PI / 2 + 2 * Math.PI * i / N;
      return [cx + Math.cos(ang) * R * val, cy + Math.sin(ang) * R * val]; };
    let g = '';
    [0.25, 0.5, 0.75, 1].forEach((r) => { g += `<polygon points="${Array.from({ length: N }, (_, i) => pt(i, r).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--x-svg-line)"/>`; });
    for (let i = 0; i < N; i++) { const [x, y] = pt(i, 1); g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--x-code-bg)"/>`; }
    const vals = ORDER.map(v);
    const poly = vals.map((x, i) => pt(i, x == null ? 0.06 : x).map((n) => n.toFixed(1)).join(',')).join(' ');
    let dots = '', labels = '';
    vals.forEach((x, i) => {
      const [px, py] = pt(i, x == null ? 0.06 : x);
      // 一致=绿 / 不一致=红 / 部分待核=琥珀（与正文里"黄 = 部分待核"同一套语义）
      const col = x === 1 ? 'var(--x-ok)' : (x === 0 ? 'var(--x-bad)' : (x === 0.5 ? 'var(--x-grey)' : 'var(--x-dot)'));
      dots += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${col}"/>`;
      const [lx, ly] = pt(i, 1.30);
      labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11.5" fill="var(--x-muted)" text-anchor="middle">${esc(SHORT[ORDER[i]])}</text>`;
    });
    return `<svg viewBox="0 0 276 250" width="100%" height="234" role="img" aria-label="六锚点雷达图">
      ${g}<polygon points="${poly}" fill="var(--x-chart-fill)" stroke="var(--x-brand)" stroke-width="1.8">
      <animate attributeName="opacity" from="0" to="1" dur=".5s" fill="freeze"/></polygon>${dots}${labels}</svg>`;
  }
  export function spark(values) {
    const nums = values.map((x) => Number(String(x).replace(/[^\d.\-]/g, ''))).filter((n) => isFinite(n));
    if (nums.length < 2) return '<p class="x-muted">数据不足，画不出趋势（至少需 2 个报告期）。</p>';
    const W = 620, H = 128, pad = 30;
    const max = Math.max(...nums), min = Math.min(...nums), span = (max - min) || 1;
    const xs = (i) => pad + (W - pad * 2) * (i / (nums.length - 1));
    const ys = (x) => H - pad - (H - pad * 2) * ((x - min) / span);
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="136" role="img" aria-label="趋势折线">
      <polyline points="${nums.map((x, i) => `${xs(i).toFixed(1)},${ys(x).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--x-accent)" stroke-width="2.2"/>
      ${nums.map((x, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(x).toFixed(1)}" r="3.6" fill="var(--x-accent)"/>`).join('')}
      <text x="${pad}" y="${H - 6}" font-size="11" fill="var(--x-dot)">较早</text>
      <text x="${W - pad}" y="${H - 6}" font-size="11" fill="var(--x-dot)" text-anchor="end">最近</text>
      <text x="${pad}" y="16" font-size="11" fill="var(--x-muted)">峰值 ${esc(max.toLocaleString('zh-CN'))}｜谷值 ${esc(min.toLocaleString('zh-CN'))}</text></svg>`;
  }
  /* ---------- Chart.js 按需加载（3.3.3）----------
   * 原来 index.html 从来没加载过 chart.umd.min.js，于是 renderBigChart() 里
   * `typeof Chart === 'undefined'` 恒真 → 每次都退回文本时间线，大图**一次都没画出来过**，
   * 但页面有优雅降级，所以谁都不报错（第七类安静失败）。
   *
   * 修法不是往 index.html 里塞一个 208KB 的 <script>：那是首屏成本，
   * 而这张图只在「追踪 → 变化时间线」用到，且云端版根本不提供追踪。
   * 改成真要看图时才拉，拉不到再降级成文本。
   */
  let _chartLoading = null;
  export function loadChartLib() {
    if (typeof Chart !== 'undefined') return Promise.resolve(true);
    if (_chartLoading) return _chartLoading;
    _chartLoading = new Promise((resolve) => {
      try {
        const s = document.createElement('script');
        s.src = '../assets/chart.umd.min.js';
        s.async = true;
        s.onload = () => resolve(typeof Chart !== 'undefined');
        s.onerror = () => resolve(false);
        (document.head || document.body).appendChild(s);
      } catch (e) { resolve(false); }
    });
    return _chartLoading;
  }

  export function bigChartHtml(h) {
    const checks = (h && h.timeline) || [];
    const note = (checks.length < 2)
      ? '<p class="x-muted" style="font-size:12px">目前只有 1 次核验，所以图上只有一个点 —— 这是正常的：'
        + '图只画我们真正记过的核验记录。之后再「检查更新」或重新查询，曲线就会长出来。</p>'
      : '';
    return `<div style="border:1px solid var(--x-line);border-radius:var(--x-r-md);background:var(--x-svg-surface);padding:10px">
        <div style="position:relative;height:360px"><canvas id="chgChart"></canvas></div></div>
      ${note}
      <div class="x-muted" id="chgSpan" style="font-size:12px;margin-top:6px"></div>
      <p class="x-muted" style="font-size:12px;margin-top:6px">
        折线＝历次核验的<b>已核验一致项数</b>（红点＝那次发现不一致），<b>横轴按真实日期排序、最新点在最右</b>；
        浅色竖带＝<b>近 6 个月</b>窗口。<br>
        <b>图上只画我们自己留档的核验点</b>（从你开始追踪/查询时起）—— 追踪之前的点没有就是没有，
        <b>不联网回填、也不用 AI 编造</b>；联网财务数字以表格形式在上方「首次追踪基线」卡里，不混进这张图。
      </p>`;
  }
  export function renderBigChart(h) {
    const el = document.getElementById('chgChart');
    if (!el || typeof Chart === 'undefined') return false;
    const base = (h && h.baseline) || null;
    const checks = (h && h.timeline) || [];

    // 图表配色跟主题走：渲染时从 CSS 变量取当前值（深色下不再是白卡黑字看不清）。
    // 切主题后回到本页会重新渲染，所以这里只保证"画的时候是当前主题"。
    const cssVar = (n, fb) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb);
    const cLine = cssVar('--x-brand', '#1677ff');
    const cBad = cssVar('--x-bad', '#b42342');
    const cSurface = cssVar('--x-svg-surface', '#fff');
    const cInk = cssVar('--x-svg-ink', '#374151');
    const cMuted = cssVar('--x-muted', '#6b7280');
    const cGrid = cssVar('--x-svg-line', '#e6e8ec');
    // 填充与窗口带各取各的变量。
    // ⚠ 原实现是拿 --x-brand 的当前值跟一个硬编码色值比对来判"现在是不是深色"，
    //   但那个色值其实不是深色下的 brand（brand 在深色下是另一种淡蓝），条件永远不成立
    //   —— 于是深色模式一直在用旧那套靛紫的半透明填充。改成直接读变量，不再靠猜色值。
    const fillLine = cssVar('--x-chart-fill', 'rgba(13,95,200,.10)');
    const cWindow = cssVar('--x-chart-window', 'rgba(13,95,200,.12)');   // 近 6 个月窗口带：同色系低透明度

    // x 轴：**只画我们自己留档的核验点**，按真实日期排序（最新点在最右）。
    //  [人类决定] 撤回"联网回填历史财报点"：图上不再出现追踪之前的财报点；
    //  财务数字仍以**表格**保留在下方「首次追踪基线（近 6 个月）」卡里，不再作为图上的历史点。
    //  [保留的修正] 原实现未按时间排序、且用 MM/DD 当键会撞车 —— 这两点已修，继续有效。
    const keyOfCheck = (ts) => String(ts || '').replace(/[-:T]/g, '').slice(0, 8);   // 2026-10-03T.. → 20261003
    const labelOf = (k) => `${k.slice(4, 6)}/${k.slice(6, 8)}`;
    const keySet = new Map();
    checks.forEach((c) => {
      const k = keyOfCheck(c.ts);
      if (!k || k.length !== 8) return;
      keySet.set(k, { key: k, label: labelOf(k), checked: true });
    });
    const cols = Array.from(keySet.values()).sort((a, b) => a.key.localeCompare(b.key));  // 升序 → 最右最新
    const cats = cols.map((c) => c.label);
    const lineData = cols.map((c) => {
      const hit = checks.find((x) => keyOfCheck(x.ts) === c.key);
      return hit ? (hit.verified ?? null) : null;
    });
    const pointColors = cols.map((c) => {
      const hit = c.checked ? checks.find((x) => keyOfCheck(x.ts) === c.key) : null;
      return hit && (hit.mismatch || 0) > 0 ? cBad : cLine;
    });
    const spanNote = (() => {
      if (!cols.length) return '';
      const oldest = cols[0].key, newest = cols[cols.length - 1].key;
      const d = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(b.slice(4, 6)) - Number(a.slice(4, 6)));
      return `时间跨度 ${labelOf(oldest)} ~ ${labelOf(newest)}（约 ${d(oldest, newest)} 个月）｜ 核验点 ${cols.length} 个（全部是我们自己留档的真实记录）`;
    })();

    // 近 6 个月窗口带（自绘插件）
    const windowPlugin = {
      id: 'xrayWindow',
      beforeDatasetsDraw(chart) {
        if (!base || !base.window || !cols.length) return;
        const area = chart.chartArea; if (!area) return;
        const fromKey = String(base.window.from || '').replace(/-/g, '');   // 2026-04-03 → 20260403
        let idx = cols.findIndex((c) => c.key >= fromKey);
        if (idx < 0) idx = 0;
        const x0 = chart.scales.x.getPixelForValue(idx);
        chart.ctx.save();
        chart.ctx.fillStyle = cWindow;
        chart.ctx.fillRect(Math.max(area.left, x0), area.top, Math.max(0, area.right - Math.max(area.left, x0)), area.bottom - area.top);
        chart.ctx.restore();
      },
    };

    // 时间跨度说明
    const spanEl = document.getElementById('chgSpan');
    if (spanEl) {
      spanEl.textContent = spanNote
        ? (spanNote + '；只画我们真正记过的点，没有数据的时间段留空、不插值、不补造。')
        : '';
    }

    new Chart(el.getContext('2d'), {
      data: {
        labels: cats,
        datasets: [
          // [人类决定] 撤回"联网回填历史财报点"：图上只保留我们自己留档的核验折线。
          // 财务数字仍以表格保留在下方「首次追踪基线（近 6 个月）」卡里。
          { type: 'line', label: '已核验一致项（我们自己的核验记录）', data: lineData, borderColor: cLine,
            backgroundColor: fillLine, fill: true, tension: .25, spanGaps: true,
            pointRadius: 5, pointBackgroundColor: pointColors, pointBorderColor: cSurface, pointBorderWidth: 2, yAxisID: 'y' },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { boxWidth: 12, font: { size: 12 }, color: cInk } },
          tooltip: { callbacks: { afterBody: (items) => {
            const c = checks.find((x) => keyOfCheck(x.ts) === (cols[items[0].dataIndex] || {}).key);
            return c ? [`判级：${c.trust_label || '—'}`, `不一致：${c.mismatch ?? 0} 项`, `核验时间：${String(c.ts).replace('T', ' ').slice(0, 16)}`] : [];
          } } },
        },
        scales: {
          y: { position: 'left', title: { display: true, text: '已核验一致项数', font: { size: 11 }, color: cMuted },
            beginAtZero: true, ticks: { precision: 0, color: cMuted }, border: { color: cGrid }, grid: { color: cGrid } },
          x: { ticks: { font: { size: 11 }, color: cMuted }, border: { color: cGrid }, grid: { color: cGrid } },
        },
      },
      plugins: [windowPlugin],
    });
    return true;
  }
