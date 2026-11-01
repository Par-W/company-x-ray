/* views/guard.js · 浏览器插件检测（客户端里不成立，单独说明） */

import { esc, sk, state, stopViewTimer, viewTimer } from '../core/env.js';
import { TUT_IMGS } from '../components/panels.js';
import { pageHead } from '../components/components.js';

  export async function guardStatus() {
    try { return await (await fetch('/api/v1/guard/status', { cache: 'no-store' })).json(); }
    catch (e) { return { configured: 0, active: 0, notify_on: 0, channels: [], note: '读取失败（后端未响应）', verdict: 'red' }; }
  }
  export async function refreshGuardBadge(pre) {
    const d = pre || await guardStatus();
    const badge = document.getElementById('navGuardBadge');
    const nav = document.getElementById('navGuard');
    if (!badge) return d;
    // ⚠ 徽标类名只有一套（nav-badge + 色调修饰类），别整体覆盖 className ——
    //   覆盖会把 margin-left:auto 之类的布局一起冲掉，徽标就不靠右了。
    //   显隐只认 .on（有事要说才显示）。
    const tone = d.verdict === 'red' ? 'danger' : (d.verdict === 'partial' ? 'warn' : 'ok');
    badge.classList.remove('danger', 'warn', 'ok');
    badge.classList.add(tone);
    badge.classList.toggle('on', tone !== 'ok');
    badge.textContent = tone === 'danger' ? '未配置' : (tone === 'warn' ? '无活动' : '在岗');
    if (nav) {
      nav.classList.remove('nav-danger', 'nav-warn');
      if (tone === 'danger') nav.classList.add('nav-danger');
      else if (tone === 'warn') nav.classList.add('nav-warn');
    }
    return d;
  }
  export const GUARD_TUTORIAL = `
    ${TUT_IMGS.extension}
    <ol style="margin:0;padding-left:20px;line-height:2">
      <li>打开扩展管理页：Edge 输入 <code>edge://extensions</code>，Chrome 输入 <code>chrome://extensions</code></li>
      <li>打开右上角「<b>开发者模式</b>」</li>
      <li>点「<b>加载已解压的扩展程序</b>」</li>
      <li>选择本项目的 <code>backend/extension</code> 目录</li>
      <li>装好后<b>随便打开一个网页</b>（插件靠页面报到），再回本页点「刷新状态」</li>
    </ol>
    <p class="x-muted" style="margin:10px 0 4px"><b>怎么验证它真的在工作：</b>打开 <code>http://www.bcmixue.cn/</code> 会弹出全屏拦截遮罩；
      打开 <code>https://www.mxbc.com/</code> 图标显示 <code>✓</code>；点图标可看「本页诊断」。</p>
    <p class="x-muted" style="margin:8px 0 4px"><b>角标含义：</b><code>✓</code> 核验通过（绿）｜ <code>!</code> 有风险（红/橙）｜ <code>·</code> 未核验或已放行（灰）｜ <code>?</code> 后端不可达。
      灰色<b>不等于</b>有问题。</p>
    <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">排查：显示「未检测到」怎么办？</summary>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:1.95">
        <li>① 扩展还没装 → 按上面 5 步装一次。</li>
        <li>② 装了但<b>从没打开过网页</b> → 打开任意网页即可触发报到。</li>
        <li>③ 刚重启过后端 → 等下一次心跳（最长 30 秒）再刷新。</li>
        <li>④ 装了但列表里是灰色/关闭状态 → 在扩展页把它打开。</li>
        <li>⑤ 都不行 → 在扩展页点该扩展的「刷新 ↻」，然后刷新当前网页。</li>
      </ul></details>
    <details style="margin-top:6px"><summary style="cursor:pointer;font-weight:700">排查：网页上没反应 / 没弹窗？</summary>
      <ul style="margin:8px 0 0;padding-left:20px;line-height:1.95">
        <li>本机演示页默认被跳过：到插件弹窗里勾选「允许在本机演示页上运行」。</li>
        <li>不确定为什么没弹 → 点插件图标看「本页诊断」，会写明场景分、动作与原因。</li>
        <li>后端没起 → 图标显示 <code>?</code>；先双击 <code>一键启动.bat</code>。</li>
      </ul></details>`;
  export const CH_STATE = {
    active: { txt: '已开启', cls: 'is-success', col: 'var(--x-ok)' },
    idle: { txt: '曾在线，当前无活动', cls: 'is-warning', col: 'var(--x-grey)' },
    never_seen: { txt: '未检测到', cls: 'is-danger', col: 'var(--x-bad)' },
    configured: { txt: '已配置', cls: 'is-success', col: 'var(--x-ok)' },
    unset: { txt: '未配置', cls: 'is-warning', col: 'var(--x-grey)' },
    planned: { txt: '未实现（规划中）', cls: 'is-light', col: 'var(--x-muted)' },
  };
  export const chState = (c) => CH_STATE[(c && c.state) || '']
  export const detectCh = (d) => ((d && d.channels) || []).find((c) => c.kind === 'detect') || {};
  export const activeWin = (d) => (d && d.active_window_seconds) || 45;
  export function guardBanner(d) {
    if (d.verdict === 'red') {
      return `<div class="notification is-danger" style="margin:0 0 4px">
        <b style="font-size:17px">尚无任何检测通道，付款环节暂无实时保护</b>
        <div style="margin-top:6px">请按下面教程启用「浏览器插件」（5 步，1 分钟）。</div></div>`;
    }
    if (d.verdict === 'partial') {
      return `<div class="notification is-warning is-light" style="margin:0 0 4px">
        <b style="font-size:16px">检测通道当前无活动</b>
        <div style="margin-top:6px">浏览器插件曾报到过（${esc(detectCh(d).detail || '')}），
        但最近 <b>${activeWin(d)} 秒</b>内没有收到心跳。常见原因：<b>浏览器后台空闲被回收（属正常）</b>、
        插件被关闭或卸载、或浏览器已关。随便打开一个网页就会重新报到 —— 本页状态每 5 秒自动刷新。</div></div>`;
    }
    return `<div class="notification is-success is-light" style="margin:0 0 4px"><b>检测通道已就位</b>：浏览器插件在岗；另有 ${d.notify_on} 条提醒通道。</div>`;
  }
  export async function refreshGuardLive() {
    const d = await guardStatus();
    if (!d || !Array.isArray(d.channels) || !d.channels.length) return;   // 后端不可达：保留上次内容，不编造
    const b = document.getElementById('guardPageBanner');
    if (b) b.innerHTML = guardBanner(d);
    const c = detectCh(d);
    const tag = document.getElementById('extTag');
    const det = document.getElementById('extDetail');
    if (tag && c.state) { const s = chState(c); tag.className = 'tag is-light ' + s.cls; tag.textContent = s.txt; }
    if (det) { det.textContent = c.detail || ''; det.style.color = chState(c).col; }
    refreshGuardBadge(d);
  }
  export function viewGuardInClient() {
    $('#view').innerHTML = `
      ${pageHead('自动检测需要浏览器插件', '桌面客户端里没有插件，这条线在客户端形态下不成立', null,
        [['首页', '#/home'], ['自动检测']])}
      <div class="x-card"><div class="bd">
        <p class="x-muted" style="margin:0 0 var(--x-s3);line-height:1.8">
          「自动检测」是在你<b>用浏览器付款时</b>由插件在后台完成的（读取页面上的签约主体与收款账户，
          与宣称品牌比对不上就拦下）。桌面客户端里没有浏览器插件，所以这里不提供 ——
          不是坏了，是它在这个形态下没有意义。
        </p>
        <div class="x-note" style="margin-bottom:var(--x-s3)">
          <b>你可以：</b>
          <div style="margin-top:6px;line-height:1.9">
            · 在<b>浏览器</b>里用本系统，付款时的自动拦截才生效（拦截记录也在浏览器版里看）；<br>
            · 在客户端里直接<b>手动查询</b>（左侧「核验台」），结果会把可信度与投资评分一起给出。
          </div>
        </div>
        <a class="x-btn primary" href="#/home">← 回核验台查询</a>
      </div></div>`;
  }
  export async function viewGuard() {
    $('#view').innerHTML = '<div class="x-card"><div class="bd">' + sk(6) + '</div></div>';
    const d = await guardStatus();
    const banner = guardBanner(d);

    const card = (c) => {
      const s = chState(c);
      const isExt = c.key === 'extension';
      return `<div class="x-card"><div class="hd">
          <span class="x-bar"></span><h2>${c.icon} ${esc(c.name)}</h2>
          <span class="tag is-light ${s.cls}"${isExt ? ' id="extTag"' : ''}>${esc(s.txt)}</span>
          ${c.kind === 'detect' ? '<span class="tag is-primary is-light">检测 + 拦截</span>' : ''}
          ${c.kind === 'notify' ? '<span class="tag is-warning is-light">仅提醒</span>' : ''}
        </div>
        <div class="bd">
          <p${isExt ? ' id="extDetail"' : ''} style="font-size:13.5px;margin:0 0 6px;color:${s.col};font-weight:600">${esc(c.detail || '')}</p>
          <p class="x-muted" style="margin:0 0 6px">${esc(c.desc)}</p>
          <p class="x-note" style="margin:0"><b>它保护的是：</b>${esc(c.protects || '')}</p>
          ${c.key === 'extension' ? `<div style="margin-top:12px">${GUARD_TUTORIAL}</div>` : ''}
          ${c.key === 'bot' ? `<div class="x-note" style="margin-top:10px">把消息发到家人的群（企业微信/钉钉/飞书）。到
            <a href="#/settings">⚙ 设置 → 家人通知</a> 填 Webhook 地址即可，插件不用再填。</div>` : ''}
        </div></div>`;
    };

    $('#view').innerHTML = `
      ${pageHead('自动检测（守护）', '在你付钱/转账的那一刻介入，发现可疑收款就当场拦下', null,
        [['首页', '#/home'], ['核验'], ['自动检测']])}
      <div class="x-card"><div class="bd">
        <p class="x-muted" style="margin:0 0 var(--x-s3);line-height:1.8">
          这是本软件的<b>主要功能之一</b>：在你<b>付钱/转账的那一刻</b>介入，发现可疑收款就当场拦下，并把消息推给家人。
        </p>
        <div id="guardPageBanner">${banner}</div>
        <div style="display:flex;gap:var(--x-s2);flex-wrap:wrap;margin-top:var(--x-s3)">
          <button class="button is-light" id="btnRefreshGuard">刷新状态</button>
          <span class="x-muted" style="align-self:center" id="guardMsg"></span>
        </div>
      </div></div>

      ${(d.channels || []).map(card).join('')}

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>通道之间的关系</h2></div>
        <div class="bd x-muted">
          · <b>浏览器插件</b>（检测 + 拦截）：网页付款场景（微信里打开的链接、电脑浏览器下单、招商落地页付款）——覆盖最广，<b>首选，也是目前唯一能真正拦住付款的通道</b>。<br>
          · <b>群机器人</b>（仅提醒）：把风险消息送到家人的群；不检测、不拦付款。<br>
          · <b>手机守护</b>（未实现）：真正在手机上读屏拦截，是最终形态；目前只有未接线原型。<br>
          · 三者共用同一套判定引擎（六锚点 + 拦截规则），结论一致；差别只在"能不能在付款那一刻拦住你"。
        </div></div>`;

    $('#btnRefreshGuard').onclick = async () => { stopViewTimer(); await refreshGuardBadge(); viewGuard(); };
    refreshGuardBadge(d);
    // 停在本页时每 5 秒自动刷新（修复：以前是一次性快照，插件断开后"已开启"永远不变）
    stopViewTimer();
    viewTimer.id = setInterval(refreshGuardLive, 5000);
  }
