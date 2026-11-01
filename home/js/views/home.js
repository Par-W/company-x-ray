/* ==========================================================================
 * views/home.js · 核验台（首页）（3.2.0）
 * --------------------------------------------------------------------------
 * 定位：对标天眼查/阿里云控制台 —— 首屏先给数，再给操作入口。
 * 数据全部现算（libStats），库里变了这里跟着变。
 *
 * 3.2.0 布局调整（依据 docs/ui-reference.md）：
 *   · 页头补面包屑（AWS / Stripe 的控制台惯例）
 *   · 查询区从"一排按钮"改成"输入 + 主动作 + 次要动作分组"
 *   · 右栏「能力边界」改用 x-item 行式排列，扫读更快
 *   · 最近核验为空时给行动按钮（Polaris 的空态规范），不再只写一句话
 *
 * ⚠ 结构不变量（scripts/probe_home_layout.js 逐条断言，改这里要同步跑探针）：
 *   ① 指标条必须在**第一个 x-card 之前** —— 首屏先给数，不给宣传语
 *   ② 指标条恰好 4 个
 *   ③ 页头必须有 x-page-head 且含「核验台」
 *   ④ q2 / invType / 四个 data-act 动作 / data-act="sample" 一个不能少
 *   ⑤ 交互只走 data-act 委托，不许出现 onclick
 *   ⑥ div 开合必须配平
 * ========================================================================== */

import { html, raw } from '../core/render.js';
import { metrics, card, emptyState, pageHead } from '../components/components.js';
import { recentList, recentPush } from '../core/store.js';
import { IS_CLIENT } from '../core/env.js';

/* 最近查询的读写统一放在 core/store.js —— 3.0.1 之前这里和 panels.js
   各有一份实现、两个 localStorage 键，写入与读取对不上，列表永远是空的。 */
export { recentList, recentPush };

/** 库内规模：全部现算，不写死数字。 */
export function libStats() {
  const off = (window.XrayOfflineUnified || {}).entries || {};
  const keys = Object.keys(off);
  let high = 0;
  keys.forEach((k) => {
    if (off[k] && off[k].verdict && off[k].verdict.trust === 'high') high++;
  });
  const groups = ((window.XrayLibrary || {}).groups) || [];
  const links = groups.reduce((a, g) => a + (((g || {}).items || []).length), 0);
  return { entries: keys.length, high, links, names: keys };
}

/** 六锚点对应的官方入口（3.1.0）。
 *  首页右栏要摆一份「去哪儿核」速览 —— 用户问的第一句话往往是
 *  「那我去哪个网站查」，答案不该让他自己回忆。
 *  取资料库 anchors 组：那是与 backend/engine.py 的 SOURCES 口径对齐的一组。 */
export function anchorEntries() {
  const groups = ((window.XrayLibrary || {}).groups) || [];
  const g = groups.find((x) => x && x.key === 'anchors');
  return (g && g.items) || [];
}

export function homeView(ctx) {
  return {
    mount(el, c) {
      const stats = libStats();
      const samples = stats.names.slice(0, 5);
      const recent = recentList().slice(0, 8);
      const anchors = anchorEntries();

      // 首屏渲染（直接写 innerHTML 是允许的：整个视图只有一次）
      el.innerHTML = html`
        ${pageHead('核验台', '付款前给收款公司拍一次 X 光', null, [['首页']])}
        ${metrics([
          ['库内已复核主体', stats.entries, '本地库 · 非实时行情'],
          ['六锚点结论为「高」', stats.high, `占库内 ${stats.entries ? Math.round((stats.high / stats.entries) * 100) : 0}%`, 'ok'],
          ['官方核验入口', stats.links, '每条结论可回溯原文'],
          ['取证锚点', 6, '主体 · 法人 · 统一码 …'],
        ])}
        <div class="x-card"><div class="bd">
          <div style="display:flex;gap:var(--x-s2);align-items:center;flex-wrap:wrap">
            <input class="x-input" id="q2" placeholder="输入公司或品牌名" style="flex:1 1 260px" data-input="q" />
            <select class="x-select" data-change="invType" style="width:150px">
              <option value="listed">上市公司口径</option>
              <option value="unlisted">未上市公司口径</option>
            </select>
            <button class="x-btn primary" data-act="query">查询</button>
          </div>
          <div style="display:flex;gap:6px;align-items:center;margin-top:var(--x-s2);flex-wrap:wrap">
            <button class="x-btn sm" data-act="track" title="加入追踪后可在「追踪」里看变化监测">追踪</button>
            <button class="x-btn sm ghost" data-act="copy">复制名称</button>
            <button class="x-btn sm ghost" data-act="report">完整报告 ↗</button>
            <span style="width:1px;height:14px;background:var(--x-line);margin:0 var(--x-s1)"></span>
            <span class="x-muted" style="font-size:var(--x-fs-small)">库内样本</span>
            ${samples.length ? samples.map((n) => html`
              <button class="x-btn sm is-text" data-act="sample" data-name="${n}">${n}</button>`)
              : html`<span class="x-muted" style="font-size:var(--x-fs-small)">（本地库为空，先查一个试试）</span>`}
          </div>
          <p class="x-muted" style="margin:var(--x-s2) 0 0;font-size:var(--x-fs-small);line-height:1.7">
            ${raw(IS_CLIENT
              ? '<b>付款前的自动拦截</b>需要浏览器插件，桌面客户端里不提供。'
              : '<b>付款前的自动拦截</b>由浏览器插件完成 —— 检测记录与配置见左侧「自动检测」。')}
          </p>
          <div id="msg" class="x-muted" style="margin-top:var(--x-s2);min-height:17px;font-size:12px"></div>
          <div id="verdictBox" style="margin-top:var(--x-s2)"></div>
        </div></div>
        <div class="x-cols">
          <div>
            ${card('工作方式', html`
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--x-s3)">
                ${[
                  ['1', '主体核验', '本地库 + 云端线索逐字段对照，冲突并列不取舍'],
                  ['2', '投资评估', '十维打分，只统计真正取得数据的通道，覆盖率不足就不给建议'],
                  ['3', '来源留痕', '每条结论可回溯到官方入口，查无记录也照实写'],
                ].map(([no, t, d]) => html`
                  <div>
                    <div style="font-weight:600;font-size:12.5px;margin-bottom:2px">
                      <span class="x-mono x-info">${no}</span> ${t}</div>
                    <div class="x-muted" style="font-size:var(--x-fs-small);line-height:1.7">${d}</div>
                  </div>`)}
              </div>`, null, false, '三步都在本机完成；不联网也能给出「信息不足」这种诚实的结论。')}
            ${card('最近核验', recent.length ? html`
              <div style="margin:calc(-1 * var(--x-s3))">
                ${recent.map((n) => html`
                  <button class="x-list-item" data-act="sample" data-name="${n}">
                    <span style="flex:1">${n}</span>
                    <span class="x-quiet">重查 →</span>
                  </button>`)}
              </div>` : emptyState({
                icon: 'search',
                title: '还没有查询记录',
                desc: '查过的公司会留在这里，方便回头复核。先输入一个公司名试试。',
                compact: true,
                actions: html`<button class="x-btn sm primary" data-act="focusQ">开始查询</button>`,
              }))}
          </div>
          <div>
            ${card('能力边界', html`
              <div style="display:grid;gap:var(--x-s2)">
                ${[
                  ['ok', '能', '主体是否就是官方主体'],
                  ['bad', '不', '不替你判断"值不值得投"'],
                  ['ok', '能', '十维评分与覆盖率缺口'],
                  ['bad', '不', '不替代合同与法律尽调'],
                  ['ok', '能', '每笔资金往来的核验结论'],
                  ['bad', '不', '不对未核过的主体下判断'],
                ].map(([tone, k, v]) => html`
                  <div style="display:flex;gap:var(--x-s2);align-items:baseline">
                    <span class="x-tag ${tone}">${k}</span>
                    <span style="font-size:12px;line-height:1.6">${v}</span>
                  </div>`)}
              </div>`)}
            ${card('官方核验入口（去哪儿查）', html`
              <div class="x-muted" style="font-size:var(--x-fs-small);margin-bottom:var(--x-s2);line-height:1.7">
                每一行判定的依据都在这些官方站点上。点开即到官方入口，
                查无记录<b>不等于</b>企业有问题，但要自己去核对过才敢付款。
              </div>
              <div class="x-lib-items" style="grid-template-columns:minmax(0,1fr);gap:6px">
                ${anchors.map((it) => html`
                  <div class="x-lib-item">
                    <div class="x-lib-item-hd">
                      <span class="x-lib-name">${it.name}</span>
                    </div>
                    <div class="x-lib-ops" style="margin-top:5px">
                      <a class="x-btn sm primary" href="${it.url}" target="_blank" rel="noopener">打开 ↗</a>
                    </div>
                  </div>`)}
              </div>
              <div class="x-muted" style="font-size:var(--x-fs-micro);margin-top:var(--x-s2);line-height:1.7">
                资料库还有<b>司法、税务、招投标、资质、投诉举报</b>等 ${stats.links} 条入口，按你要核的那一项分组。
              </div>`, html`<a class="x-btn sm is-text" href="#/library">全部 ${stats.links} 条 →</a>`)}
            ${card('本地已复核库', html`
              <table class="x-table"><tbody>
                <tr><td>库内主体</td><td class="num">${stats.entries}</td></tr>
                <tr><td>六锚点结论为「高」</td><td class="num x-ok">${stats.high}</td></tr>
                <tr><td>官方核验入口</td><td class="num">${stats.links}</td></tr>
                <tr><td>取证锚点</td><td class="num">6</td></tr>
              </tbody></table>`, null, false,
              html`库内没有的主体不是「有问题」，是<b>没核过</b> —— 页面会如实标「信息不足」。`)}
          </div>
        </div>`;

      // 事件全走委托：渲染新节点不用重新接线
      const onAct = (name, e, t) => {
        if (name === 'sample') {
          const n = t.getAttribute('data-name') || '';
          const input = document.getElementById('q2');
          if (input) input.value = n;
          /* ⚠ 必须显式同步到顶栏的 #q —— doUnified 读的是 #q，不是 #q2。
             直接赋值 input.value **不会触发 input 事件**，所以那条
             「#q2 输入 → 同步 #q」的委托链路走不到，
             结果就是点库内样本后查询报「请先输入公司或品牌名」。
             （用户体感：查询功能好像坏了。） */
          ctx.actions.onQueryChange(n);
          ctx.actions.query();
        } else if (name === 'focusQ') {
          const input = document.getElementById('q2');
          if (input) input.focus();
        } else if (name === 'query') {
          ctx.actions.query();
        } else if (name === 'track') {
          ctx.actions.track();
        } else if (name === 'copy') {
          ctx.actions.copy();
        } else if (name === 'report') {
          ctx.actions.report();
        }
      };
      const onInput = (name, e, t) => {
        if (name === 'q') ctx.actions.onQueryChange(t.value);
      };
      const onChange = (name, e, t) => {
        if (name === 'invType') ctx.actions.onTypeChange(t.value);
      };
      el.addEventListener('click', (e) => {
        const t = e.target.closest('[data-act]');
        if (t && el.contains(t)) onAct(t.getAttribute('data-act'), e, t);
      });
      el.addEventListener('input', (e) => {
        const t = e.target.closest('[data-input]');
        if (t && el.contains(t)) onInput(t.getAttribute('data-input'), e, t);
      });
      el.addEventListener('change', (e) => {
        const t = e.target.closest('[data-change]');
        if (t && el.contains(t)) onChange(t.getAttribute('data-change'), e, t);
      });

      // 回车即查
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.id === 'q2') ctx.actions.query();
      });

      /* 客户端里不画「自动检测未启用」红横幅：
         桌面客户端没有浏览器插件，这条告警永远消不掉 —— 画出来只是制造无法处理的噪音。
         客户端里这条线由侧栏隐藏 + 路由兜底（#/guard、#/alerts 落到说明页）处理。 */
      if (!IS_CLIENT) {
        ctx.actions.guardBanner?.();
      }
    },
  };
}
