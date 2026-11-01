/* ==========================================================================
 * core/cmdk.js · 命令面板（⌘K / Ctrl+K）（3.2.0 新增）
 * --------------------------------------------------------------------------
 * 依据：Linear / Raycast / Vercel 三家做法一致（见 docs/ui-reference.md #13–15）：
 *   · 触发：全局 Cmd/Ctrl+K，必须 preventDefault（否则浏览器自己也会开搜索）
 *   · 交互：输入框**保持真实焦点**，方向键移动的是"虚拟高亮"（WAI-ARIA combobox，
 *     用 aria-activedescendant 而不是把焦点挪进列表 —— 后者会让人没法继续打字）
 *   · Esc 关闭；点遮罩关闭；关闭后焦点还给触发按钮
 *   · 无结果必须有空态（"没有匹配的命令"），不能是一片空白
 *   · 用稳定 id 做键，不用 label（改名后最近记录不会丢）
 *
 * ⚠ 不引入 cmdk / fuse.js 之类依赖：命令只有 13 条，一个子序列匹配足够，
 *   为 13 条命令引 20KB 依赖不划算（Ant Design 的"克制"原则）。
 * ========================================================================== */

/** 命令注册表。
 *  分组顺序即渲染顺序：先"跳转"，再"动作" —— 用户 90% 的时间在跳页面。
 *  when(): 可选，返回 false 时这条命令不出现（按当前上下文裁剪）。 */
const CMDS = [
  // ---------- 跳转 ----------
  { id: 'go.home',      grp: '跳转', label: '核验台',      desc: '付款前查一家公司', icon: 'M3 10.6 12 3.2l9 7.4V20a1 1 0 0 1-1 1h-5.2v-6.2H9.2V21H4a1 1 0 0 1-1-1z', kw: 'home 首页 查询 核验', run: () => (location.hash = '#/home') },
  { id: 'go.alerts',    grp: '跳转', label: '检测记录',    desc: '插件拦下来的记录', icon: 'M12 4.2a5 5 0 0 0-5 5c0 4-1.6 5.6-1.6 5.6h13.2S17 13.2 17 9.2a5 5 0 0 0-5-5z', kw: 'alerts 记录 告警', run: () => (location.hash = '#/alerts') },
  { id: 'go.guard',     grp: '跳转', label: '自动检测',    desc: '插件与拦截配置', icon: 'M12 3.2 4.6 6.1v5.6c0 4.4 3.1 7.7 7.4 9 4.3-1.3 7.4-4.6 7.4-9V6.1z', kw: 'guard 插件 拦截', run: () => (location.hash = '#/guard') },
  { id: 'go.track',     grp: '跳转', label: '追踪',        desc: '我关注的企业', icon: 'm12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.1l-5.3 2.7 1.1-5.9L3.5 9.8l5.9-.8z', kw: 'track 关注 追踪', run: () => (location.hash = '#/track') },
  { id: 'go.changes',   grp: '跳转', label: '变化监测',    desc: '这家在变好还是变坏', icon: 'M4 19.2V4.8M4 19.2h16M7.4 15.4l4-4.2 3 2.8 4.6-5.4', kw: 'changes 变化 趋势', run: () => (location.hash = '#/changes') },
  { id: 'go.lists',     grp: '跳转', label: '名单管理',    desc: '黑名单 / 白名单', icon: 'M4.2 4.6h6.3V19.6H4.2zM13.5 4.6h6.3V19.6h-6.3z', kw: 'lists 黑白名单 拦截', run: () => (location.hash = '#/lists') },
  { id: 'go.library',   grp: '跳转', label: '资料库',      desc: '官方核验入口 102 条', icon: 'M4.2 4.6h6.3V19.6H4.2zM13.5 4.6h6.3V19.6h-6.3', kw: 'library 资料 官方 入口 查哪个网站', run: () => (location.hash = '#/library') },
  { id: 'go.settings',  grp: '跳转', label: '设置',        desc: '外观 / 通知 / AI', icon: 'M4 7.5h9.2M17.4 7.5H20M4 16.5h4.4M12.6 16.5H20M15.3 5v5M9.8 14v5', kw: 'settings 设置 主题 深色 浅色', run: () => (location.hash = '#/settings') },
  { id: 'go.changelog', grp: '跳转', label: '更新日志',    desc: '每一版改了什么', icon: 'M6.2 3.4h7.4l4.2 4.2v13H6.2zM9.4 12.4h5.4M9.4 16h5.4', kw: 'changelog 更新 版本 日志', run: () => (location.hash = '#/changelog') },

  // ---------- 动作 ----------
  { id: 'act.query',    grp: '动作', label: '查询当前输入的公司', desc: '等同点顶栏的「查询」', icon: 'M11 4.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM16 16l4.4 4.4', kw: 'query 查询 查一下 search', run: () => (window.__xrayQuery ? window.__xrayQuery() : (location.hash = '#/home')) },
  { id: 'act.report',   grp: '动作', label: '打开完整评估报告', desc: '投资评分（独立服务 :3210）', icon: 'M4 19.2V4.8M4 19.2h16M7.4 15.4l4-4.2 3 2.8 4.6-5.4', kw: 'report 报告 评分 投资 财务', run: () => (window.__xrayReport ? window.__xrayReport() : null) },
  { id: 'act.theme',    grp: '动作', label: '切换深色 / 浅色', desc: '当前主题的对立面', icon: 'M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2zM12 3.4v17.2', kw: 'theme 主题 深色 浅色 暗 color', run: () => window.__xrayToggleTheme && window.__xrayToggleTheme() },
  { id: 'act.reload',   grp: '动作', label: '重新加载页面', desc: '取最新的界面与数据', icon: 'M20 12a8 8 0 1 1-2.3-5.6M20 4.4V9h-4.6', kw: 'reload 刷新 重载 refresh', run: () => location.reload() },
];

/** 子序列匹配：query 的每个字符按顺序出现在 haystack 里就算命中。
 *  为什么不用 includes：命令面板里人们打的是首字母缩写（"zlk" → 资料库），
 *  includes 一条都匹配不上。子序列 + 连续奖励才是 command palette 的常规做法。 */
function score(hay, q) {
  if (!q) return 1;
  let hi = 0, s = 0, streak = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    let found = -1;
    for (let j = hi; j < hay.length; j++) {
      if (hay[j] === c) { found = j; break; }
    }
    if (found < 0) return 0;
    // 连续命中给更高分，位置越靠前越好
    streak = found === hi ? streak + 1 : 0;
    s += 2 + streak * 2 - Math.min(found, 20) * 0.05;
    hi = found + 1;
  }
  return s;
}

let selIdx = 0;
let shown = [];
let lastFocus = null;
let wired = false;

function el(id) { return document.getElementById(id); }

function renderList(q) {
  const list = el('cmdkList');
  const cnt = el('cmdkCount');
  if (!list) return;
  const needle = String(q || '').trim().toLowerCase();
  shown = [];
  CMDS.forEach((c) => {
    if (c.when && !c.when()) return;
    const hay = (c.label + ' ' + c.desc + ' ' + c.kw).toLowerCase();
    const sc = score(hay, needle);
    if (sc > 0) shown.push({ c, sc });
  });
  // 有查询词按分数排；没查询词保持注册顺序（分组稳定，位置可记忆）
  if (needle) shown.sort((a, b) => b.sc - a.sc);

  if (!shown.length) {
    list.innerHTML = '<div class="x-cmdk-empty">没有匹配的命令。<br>试试「资料库」「查询」「设置」。</div>';
    if (cnt) cnt.textContent = '0';
    selIdx = 0;
    return;
  }
  selIdx = Math.max(0, Math.min(selIdx, shown.length - 1));

  let html = '';
  let lastGrp = '';
  shown.forEach((it, i) => {
    if (it.c.grp !== lastGrp) {
      html += '<div class="x-cmdk-grp">' + it.c.grp + '</div>';
      lastGrp = it.c.grp;
    }
    const sel = i === selIdx ? ' sel' : '';
    html += '<button type="button" class="x-cmdk-item' + sel + '" role="option"'
      + ' aria-selected="' + (i === selIdx ? 'true' : 'false') + '"'
      + ' id="cmdk-i' + i + '" data-i="' + i + '">'
      + '<svg class="ci" viewBox="0 0 24 24" aria-hidden="true"><path d="' + it.c.icon + '"/></svg>'
      + '<span class="ct">' + it.c.label + '</span>'
      + '<span class="cd">' + it.c.desc + '</span>'
      + '</button>';
  });
  list.innerHTML = html;
  if (cnt) cnt.textContent = String(shown.length);

  const inp = el('cmdkInput');
  if (inp) inp.setAttribute('aria-activedescendant', 'cmdk-i' + selIdx);
  // 让高亮项保持在可视范围内（用 scrollIntoView 而不是改 scrollTop：
  // 结果列表高度由 CSS 决定，硬算偏移会在不同字号下错位）
  const cur = el('cmdk-i' + selIdx);
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}

function moveSel(delta) {
  if (!shown.length) return;
  selIdx = (selIdx + delta + shown.length) % shown.length;
  // 只改类，不重排整个列表 —— 重排会丢 scrollIntoView 的平滑与焦点
  const list = el('cmdkList');
  if (!list) return;
  const items = list.querySelectorAll('.x-cmdk-item');
  items.forEach((b, i) => {
    const on = i === selIdx;
    b.classList.toggle('sel', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const inp = el('cmdkInput');
  if (inp) inp.setAttribute('aria-activedescendant', 'cmdk-i' + selIdx);
  const cur = el('cmdk-i' + selIdx);
  if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}

function runSel() {
  const it = shown[selIdx];
  if (!it) return;
  close();
  try { it.c.run(); } catch (e) { console.error('[cmdk]', e); }
}

export function open() {
  const box = el('cmdk');
  const inp = el('cmdkInput');
  if (!box) return;
  lastFocus = document.activeElement;
  box.classList.add('on');
  if (inp) { inp.value = ''; inp.focus(); }
  selIdx = 0;
  renderList('');
}

export function close() {
  const box = el('cmdk');
  if (!box) return;
  box.classList.remove('on');
  // 焦点还给触发者：不还的话键盘用户会掉到 body 上，下一按 Tab 从页首开始
  if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* 元素已移除 */ } }
  lastFocus = null;
}

export function isOpen() {
  const box = el('cmdk');
  return !!(box && box.classList.contains('on'));
}

/** 装配：按钮 + 快捷键 + 输入过滤 + 方向键 + 回车 + Esc + 点遮罩。
 *  只在 boot() 里调一次。重复调用直接返回（避免挂两套监听，
 *  那会让一次方向键跳两格 —— 是命令面板最常见的 bug）。 */
export function initCmdk() {
  if (wired) return;
  wired = true;

  const box = el('cmdk');
  const inp = el('cmdkInput');
  const list = el('cmdkList');
  const btn = el('btnCmdk');

  if (btn) btn.onclick = () => open();
  if (!box || !inp) return;

  inp.addEventListener('input', () => { selIdx = 0; renderList(inp.value); });

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); runSel(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  // 点条目直接执行。用 mousedown 而不是 click：click 在部分壳里
  // 会因为输入框失焦引发重排而丢掉（WebView2 上踩过）。
  if (list) {
    list.addEventListener('mousedown', (e) => {
      const b = e.target.closest('.x-cmdk-item');
      if (!b) return;
      e.preventDefault();
      const i = Number(b.getAttribute('data-i'));
      if (!Number.isNaN(i)) { selIdx = i; runSel(); }
    });
    // 悬浮也跟着移高亮：鼠标和键盘共用同一个"当前项"，不会各记一套
    list.addEventListener('mousemove', (e) => {
      const b = e.target.closest('.x-cmdk-item');
      if (!b) return;
      const i = Number(b.getAttribute('data-i'));
      if (!Number.isNaN(i) && i !== selIdx) { selIdx = i; moveSel(0); }
    });
  }

  // 点遮罩关闭（点面板内部不关）
  box.addEventListener('mousedown', (e) => { if (e.target === box) close(); });

  // 全局快捷键：⌘K / Ctrl+K 开合。必须 preventDefault，
  // 否则浏览器/壳自己的 Ctrl+K（地址栏搜索）也会跳出来。
  window.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') {
      e.preventDefault();
      if (isOpen()) close(); else open();
      return;
    }
    // "/" 直接聚焦顶栏查询框（GitHub 的约定），但不要在输入框里劫持
    if (k === '/' && !isOpen()) {
      const t = e.target || {};
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return;
      const q = document.getElementById('q');
      if (q) { e.preventDefault(); q.focus(); q.select(); }
    }
  });
}
