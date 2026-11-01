/* panels.js · 首页面板与共享片段 */

import { esc, state } from '../core/env.js';

/* ⚠ 这里原本还有一整套首页面板函数（homeKpiHtml / recentPanelHtml /
   libPanelHtml / stepsPanelHtml / capsPanelHtml）以及一份重复的
   recentList / recentPush / libStats —— 3.0.1 首页重写成组件化之后，
   它们已经没有任何人调用了，留着只会让人误以为还能用。

   而且那份重复的 recentPush 用的是 'xray-recent'，home.js 里那份用的是
   'xray:recent' —— 两个键不一样，写入和读取对不上，「最近核验」永远是空的。
   现在统一由 home.js 提供（键取 env.js 的 LS_RECENT = 'xray-recent'，
   与 2.x / 3.0.0 一致），actions.js 直接 import home.js 的那份。 */

export const SVG = (inner, w, h) => `<svg viewBox="0 0 ${w || 168} ${h || 92}" width="100%" height="${h || 92}"
      style="border:1px solid var(--x-line);border-radius:var(--x-r-sm);background:var(--x-svg-surface)" role="img">${inner}</svg>`;
  export const STEP_IMGS = [
    // 1) 地址栏输入扩展页
    SVG(`<rect x="8" y="20" width="152" height="20" rx="10" fill="var(--x-svg-surface)" stroke="var(--x-soft-border)"/>
      <circle cx="20" cy="30" r="4" fill="var(--x-code-bg)"/><text x="34" y="34" font-size="10" fill="var(--x-brand)">edge://extensions</text>
      <rect x="8" y="48" width="152" height="34" rx="6" fill="var(--x-svg-surface)" stroke="var(--x-svg-line)"/>
      <text x="16" y="68" font-size="9" fill="var(--x-muted)">← 在浏览器地址栏输入并回车</text>`),
    // 2) 打开开发者模式
    SVG(`<rect x="8" y="22" width="152" height="46" rx="8" fill="var(--x-svg-surface)" stroke="var(--x-svg-line)"/>
      <text x="16" y="42" font-size="10" fill="var(--x-svg-ink)">开发者模式</text>
      <rect x="110" y="30" width="42" height="20" rx="10" fill="var(--x-brand)"/>
      <circle cx="142" cy="40" r="8" fill="var(--x-svg-surface)"/>
      <text x="16" y="60" font-size="9" fill="var(--x-ok)">已开启 ✓</text>
      <text x="16" y="84" font-size="9" fill="var(--x-muted)">把右上角的开关拨到「开」</text>`),
    // 3) 点"加载已解压的扩展程序"
    SVG(`<rect x="16" y="26" width="136" height="26" rx="8" fill="var(--x-nav-on)" stroke="var(--x-soft-border)"/>
      <text x="26" y="43" font-size="10" fill="var(--x-brand)">加载已解压的扩展程序</text>
      <rect x="16" y="60" width="136" height="24" rx="8" fill="var(--x-svg-surface)" stroke="var(--x-svg-line)"/>
      <text x="26" y="76" font-size="10" fill="var(--x-dot)">打包扩展程序</text>`),
    // 4) 选择 backend/extension 目录
    SVG(`<rect x="10" y="18" width="148" height="58" rx="8" fill="var(--x-svg-surface)" stroke="var(--x-svg-line)"/>
      <text x="18" y="34" font-size="9" fill="var(--x-muted)">选择文件夹</text>
      <text x="18" y="52" font-size="10" fill="var(--x-svg-ink)">公司X光 › backend › </text>
      <text x="18" y="68" font-size="10" fill="var(--x-brand)" font-weight="bold">extension</text>
      <rect x="120" y="58" width="32" height="14" rx="7" fill="var(--x-brand)"/>
      <text x="126" y="68" font-size="8" fill="var(--x-svg-surface)">选择</text>`),
    // 5) 工具栏出现图标
    SVG(`<rect x="8" y="24" width="152" height="22" rx="11" fill="var(--x-svg-surface)" stroke="var(--x-svg-line)"/>
      <circle cx="24" cy="35" r="7" fill="var(--x-nav-on)" stroke="var(--x-soft-border)"/>
      <text x="21" y="38" font-size="8" fill="var(--x-brand)">X</text>
      <circle cx="46" cy="35" r="7" fill="var(--x-code-bg)"/>
      <text x="16" y="66" font-size="9" fill="var(--x-muted)">工具栏出现「公司X光」图标 = 装好了</text>
      <text x="16" y="82" font-size="9" fill="var(--x-grey)">别忘了随便打开一个网页，插件才会报到</text>`),
  ];
  export const TUT_IMGS = {
    extension: `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0">
      ${STEP_IMGS.map((s, i) => `<div><div class="x-muted" style="font-size:12px;margin-bottom:4px">第 ${i + 1} 步</div>${s}</div>`).join('')}
    </div>`,
  };
  export const alExtMap = { active: ['插件在岗', 'x-ok'],
    idle: ['曾在线，当前无活动', 'x-grey'], never_seen: ['未检测到插件', 'x-bad'] };
  export const alertsExtHtml = (ext) => {
    const [t, c] = alExtMap[(ext && ext.state) || ''] || ['未知', 'x-muted'];
    return `<b class="${c}">${t}</b>
      <div class="x-muted" style="font-size:12.5px">${esc((ext && ext.note) || '')}`
      + `${ext && ext.seconds_ago != null ? `（最后心跳 ${ext.seconds_ago} 秒前）` : ''}</div>`;
  };
  export const SEV = {
    serious: { c: 'var(--x-bad)', t: '⚠️ 变坏', bg: 'var(--x-sev-bg-bad)' },
    warning: { c: 'var(--x-grey)', t: '留意', bg: 'var(--x-sev-bg-warn)' },
    good: { c: 'var(--x-ok)', t: '↑ 变好', bg: 'var(--x-sev-bg-ok)' },
    info: { c: 'var(--x-muted)', t: '中性变动', bg: 'var(--x-sev-bg-info)' },
  };
  export function timelineHtml(points) {
    if (!points || points.length < 1) return '<p class="x-muted">还没有核验记录。</p>';
    const maxV = Math.max(4, ...points.map((p) => p.verified || 0));
    return `<div style="display:flex;align-items:flex-end;gap:6px;height:110px;padding:8px 4px;border:1px solid var(--x-line);border-radius:var(--x-r-md);background:var(--x-kpi-bg)">`
      + points.map((p) => {
        const h = Math.round(((p.verified || 0) / maxV) * 66) + 6;
        const bad = (p.mismatch || 0) > 0;
        const col = bad ? 'var(--x-bad)' : (p.trust === 'high' ? 'var(--x-ok)' : 'var(--x-grey)');
        return `<div style="flex:1;text-align:center" title="${esc(p.trust_label || '')} 一致${p.verified ?? '—'} 不一致${p.mismatch ?? '—'}">
          <div style="height:${h}px;background:${col};border-radius:5px 5px 0 0;opacity:.85"></div>
          <div style="width:8px;height:8px;border-radius:50%;background:${col};margin:4px auto 0"></div>
          <div class="x-muted" style="font-size:10px;white-space:nowrap">${esc((p.ts || '').slice(5, 10))}</div></div>`;
      }).join('') + `</div>
      <p class="x-muted" style="font-size:12px;margin-top:6px">柱高 = 已核验一致项数；<b style="color:var(--x-bad)">红点/红柱 = 那次发现了不一致</b>，绿 = 信息一致，黄 = 部分待核。</p>`;
  }
