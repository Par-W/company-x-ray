/* views/settings.js · 设置（外观 / 通知 / AI） */

import { sk } from '../core/env.js';
import { SVG } from '../components/panels.js';
import { doAi, loadSettings, saveSettings, setMsg, testSettings } from '../core/actions.js';
import { pageHead } from '../components/components.js';

  export async function viewSettings() {
    $('#view').innerHTML = `
      ${pageHead('设置', '外观 · 通知 · AI —— 全部只保存在这台机器上', null,
        [['首页', '#/home'], ['配置'], ['设置']])}
      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>外观</h2>
        <span class="tag is-light">浅色 / 深色 / 跟随系统</span></div>
        <div class="bd">
          <p class="x-muted">选择界面配色。选 <b>跟随系统</b> 时，会跟着电脑的深浅色设置自动切换
            （在系统里改深浅色，本页立即生效，不用刷新）。这个选择<b>只保存在这台机器的浏览器里</b>，不上传。</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" role="group" aria-label="外观主题">
            <button class="button is-light" id="thLight"  data-theme-btn="light">浅色</button>
            <button class="button is-light" id="thDark"   data-theme-btn="dark">深色</button>
            <button class="button is-light" id="thSystem" data-theme-btn="system">跟随系统</button>
          </div>
          <p class="x-muted" id="thState" style="margin-top:10px;font-size:12px"></p>

          <div style="margin:18px 0 14px;border-top:1px solid var(--x-line)"></div>
          <p class="x-muted" style="margin:0">侧边栏：选 <b>自动</b> 时，窗口窄到一定程度会自己收成一条图标（把宽度让给内容），
            拉宽又会自己展开；选 <b>手动</b> 则完全听你的，窗口怎么变都不会自己动。
            不管选哪个，顶栏最左边的按钮都能随时收起 / 展开。</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" role="group" aria-label="侧边栏模式">
            <button class="button is-light" id="navAuto" data-nav-btn="auto">自动</button>
            <button class="button is-light" id="navManual" data-nav-btn="manual">手动</button>
            <button class="button is-light" id="navToggleNow">收起 / 展开（立即）</button>
          </div>
          <p class="x-muted" id="navState" style="margin-top:10px;font-size:12px"></p>
        </div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>家人通知（群机器人）</h2>
        <span class="tag is-light">与 AI 设置放在一起</span></div>
        <div class="bd">
          <p class="x-muted">浏览器插件发现风险时会<b>自动往这个群发消息</b>（红色等级零操作自动发）。
            在这里配一次即可，<b>插件里不用再填</b>。地址里带着密钥，<b>只保存在这台机器上</b>，接口不回显完整地址。</p>
          <div style="display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;margin-top:14px">
            <label class="label" style="margin:0">机器人 Webhook</label>
            <div><input class="input" id="botUrl" type="password" placeholder="粘贴群机器人 Webhook 地址（留空=不修改；填单个 - 表示清除）" autocomplete="new-password">
              <p class="x-muted" style="font-size:12px;margin-top:4px" id="botState">读取中…</p></div>
            <label class="label" style="margin:0">平台</label>
            <div><select class="input" id="botPlatform">
                <option value="auto">自动识别（按地址判断）</option>
                <option value="wxwork">企业微信</option>
                <option value="dingtalk">钉钉</option>
                <option value="feishu">飞书</option>
                <option value="generic">通用 JSON（自建网关）</option>
              </select></div>
            <label class="label" style="margin:0">通知策略</label>
            <div><select class="input" id="botPolicy">
                <option value="hard_only">仅硬红（高风险）自动通知　推荐</option>
                <option value="red_and_hard">硬红 + 软红都通知</option>
                <option value="manual">从不自动，只在遮罩上手动点</option>
              </select></div>
          </div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
            <button class="button is-primary" id="btnSaveBot">保存</button>
            <button class="button is-light" id="btnTestBot">发送测试消息</button>
          </div>
          <div class="notification is-light" id="botMsg" style="display:none;margin-top:14px"></div>

          <details style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">怎么拿到这个地址？（三家都很快）</summary>
            <ul style="margin:10px 0 0;padding-left:20px;line-height:1.95">
              <li><b>企业微信</b>：手机/电脑进入目标群 → 右上角「…」→ 群机器人 → 添加机器人 → 复制 Webhook 地址（形如 <code>https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…</code>）</li>
              <li><b>钉钉</b>：群设置 → 智能群助手 → 添加机器人 → 自定义 → 安全设置里勾「自定义关键词」并填 <code>公司X光</code> → 复制 Webhook</li>
              <li><b>飞书</b>：群设置 → 群机器人 → 添加机器人 → 自定义机器人 → 复制 Webhook 地址（形如 <code>https://open.feishu.cn/open-apis/bot/v2/hook/…</code>）</li>
              <li><b>自建网关</b>：任何能收 POST JSON 的地址都行（选「通用 JSON」）。</li>
            </ul>
            <p class="x-muted" style="margin-top:8px">⚠️ 这个地址等同于口令：<b>别分享给别人</b>；如果泄露，到群里把机器人删掉重加即可。</p>
          </details>
        </div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>⚙ AI 辅助整理</h2></div>
        <div class="bd">
          <p class="x-muted">填你自己的 API Key 即可启用「AI 辅助整理」——<b>收集企业档案后会自动运行</b>，把公开事实整理成人话（<b>不参与判级</b>）。
            密钥<b>只保存在这台机器上</b>（<code>backend/data/ai_settings.json</code>），页面与接口都<b>不会回显完整密钥</b>；不填也不影响其它功能。</p>
          <div style="display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;margin-top:14px">
            <label class="label" style="margin:0">API Key</label>
            <div><input class="input" id="setKey" type="password" placeholder="sk-... （留空=不修改；填单个 - 表示清除）" autocomplete="new-password">
              <p class="x-muted" style="font-size:12px;margin-top:4px" id="setKeyState">读取中…</p></div>
            <label class="label" style="margin:0">模型名</label>
            <div><input class="input" id="setModel" type="text" placeholder="deepseek-flash">
              <p class="x-muted" style="font-size:12px;margin-top:4px">按你所用服务商的文档填写。</p></div>
            <label class="label" style="margin:0">接口地址（高级）</label>
            <div><input class="input" id="setBase" type="text" placeholder="https://api.deepseek.com/v1">
              <p class="x-muted" style="font-size:12px;margin-top:4px">兼容 OpenAI 协议即可；不懂就保持默认。</p></div>
          </div>
          <div style="margin-top:16px;display:flex;gap:8px">
            <button class="button is-primary" id="btnSaveSet">保存</button>
            <button class="button is-light" id="btnTest">测试连接</button>
            <button class="button is-light" id="btnA3">用当前输入试一次 AI 整理</button>
          </div>
          <div class="notification is-light" id="setMsg" style="display:none;margin-top:14px"></div>
        </div></div>

      <div class="x-card"><div class="hd"><span class="x-bar"></span><h2>关于本机环境</h2></div>
        <div class="bd x-muted">
          · 后端：<code>uvicorn backend.main:app</code>（本机 8000 端口）<br>
          · 子应用：公司/人员透视 <code>:3211</code>、投资/财务评分 <code>:3210</code>（由 一键启动.bat 一并拉起）<br>
          · 浏览器插件目录：<code>backend/extension</code><br>
          · 界面基底：Bulma（50055★ MIT，已本地化）；图表为自绘 SVG
        </div></div>`;
    loadSettings();
    loadBotSettings();
    // 外观三档：点击即切换并记住（走主题引擎）
    ['light', 'dark', 'system'].forEach((v) => {
      const b = document.querySelector('[data-theme-btn="' + v + '"]');
      if (b) b.onclick = () => window.__xraySetTheme(v);
    });
    window.__xrayApplyTheme();
    // 侧边栏「自动 / 手动」（引擎在 head 的偏好脚本里，这里只负责按钮与文案）
    ['auto', 'manual'].forEach((v) => {
      const b = document.querySelector('[data-nav-btn="' + v + '"]');
      if (b) b.onclick = () => window.__xraySetNavMode(v);
    });
    const navNow = document.getElementById('navToggleNow');
    if (navNow) navNow.onclick = () => window.__xrayToggleNav();
    window.__xrayApplyNav();
    $('#btnSaveSet').onclick = saveSettings;
    $('#btnTest').onclick = testSettings;
    $('#btnA3').onclick = doAi;
    $('#btnSaveBot').onclick = saveBotSettings;
    $('#btnTestBot').onclick = testBot;
  }
  export async function loadBotSettings() {
    try {
      const d = await (await fetch('/api/v1/settings/bot', { cache: 'no-store' })).json();
      $('#botState').textContent = d.has_url
        ? `当前：已配置（${d.platform_label || d.platform}${d.url_masked ? '，' + d.url_masked : ''}）`
        : '当前：未配置（配置后，红色风险会自动发到家人的群里）';
      $('#botPlatform').value = d.platform || 'auto';
      $('#botPolicy').value = d.policy || 'hard_only';
    } catch (e) { $('#botState').textContent = '读取设置失败'; }
  }
  export function botMsg(t, cls) {
    const el = $('#botMsg'); el.style.display = 'block';
    el.className = 'notification ' + (cls || 'is-light'); el.textContent = t;
  }
  export async function saveBotSettings() {
    const raw = $('#botUrl').value;
    const body = { platform: $('#botPlatform').value, policy: $('#botPolicy').value };
    if (raw === '-') body.url = '';
    else if (raw.trim()) body.url = raw.trim();
    const d = await (await fetch('/api/v1/settings/bot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) })).json();
    botMsg(d.note + (d.has_url ? `（${d.platform}${d.url_masked ? '，' + d.url_masked : ''}）` : ''), d.has_url ? 'is-success is-light' : 'is-warning is-light');
    $('#botUrl').value = '';
    loadBotSettings();
  }
  export async function testBot() {
    botMsg('正在往群里发一条测试消息…');
    const d = await (await fetch('/api/v1/settings/bot/test', { method: 'POST' })).json();
    botMsg(d.ok ? `✅ 发送成功（平台：${d.platform || '自动识别'}）—— 去家人群里看一眼就收到了。`
      : `❌ 发送失败：${d.note || '未知原因'}`, d.ok ? 'is-success is-light' : 'is-danger is-light');
  }
