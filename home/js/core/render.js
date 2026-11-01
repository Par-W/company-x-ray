/* ==========================================================================
 * render.js · 轻量渲染内核（3.0.1）
 * --------------------------------------------------------------------------
 * 为什么不用 innerHTML 拼字符串：
 *   原来的做法是每个视图函数返回一个 HTML 字符串，再赋给 $('#view').innerHTML。
 *   问题有三个 ——
 *     ① 拼出来的按钮每次渲染后都要重新 onclick 接线（漏一处就是"点了没反应"）；
 *     ② 字符串里插值必须手动 esc()，漏一处就是 XSS；
 *     ③ 视图之间没有边界，改一个视图怕碰坏另一个，2313 行全在一个文件里。
 *
 * 这里换成：模板函数 → 虚拟节点 → 差异化更新 + 事件委托。
 *   - html``  模板标签：插值自动转义，数组自动 join，可安全嵌 HTML 用 raw()
 *   - mount() 把虚拟树挂到真实 DOM，按 key 做最小更新
 *   - delegate() 事件委托：data-act="xxx" 一律走一个处理器，
 *     渲染时不需要重新接线 —— 从根上消掉"点了没反应"这类 bug
 *
 * 零依赖、无构建步骤，浏览器直接跑。
 * ========================================================================== */

/* ---------- 虚拟节点 ---------- */

/** 创建虚拟节点。children 可以是字符串 / 节点 / 数组 / null。 */
export function h(tag, props, ...children) {
  const p = props || {};
  const node = {
    tag,
    props: p,
    children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false),
    key: p.key !== undefined ? p.key : null,
  };
  return node;
}

/* ---------- 模板标签 ---------- */

const RAW = Symbol('raw');

/** 标记一段 HTML 为「已信任、不转义」。只用于我们自己拼的片段。 */
export function raw(html) {
  const s = String(html);
  // 带 toString：赋值给 innerHTML 时浏览器会隐式调用它
  return { [RAW]: s, toString: () => s, valueOf: () => s };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 模板标签：html`<p>${userInput}</p>`
 * 插值默认转义；数组自动拼接；raw() 标记的按原样输出。
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += stringify(values[i]) + strings[i + 1];
  }
  return raw(out);
}

function stringify(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v && v[RAW] !== undefined) return v[RAW];
  if (Array.isArray(v)) return v.map(stringify).join('');
  if (typeof v === 'object' && v.tag) return renderToString(v);
  return escapeHtml(v);
}

/** 虚拟树 → HTML 字符串（用于需要字符串的场景，如 clipboard / 导出）。 */
export function renderToString(node) {
  if (!node) return '';
  if (node[RAW] !== undefined) return node[RAW];
  if (Array.isArray(node)) return node.map(renderToString).join('');
  if (typeof node !== 'object') return escapeHtml(node);
  const { tag, props, children } = node;
  const attrs = [];
  for (const k of Object.keys(props || {})) {
    const v = props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class' || k === 'className') attrs.push(`class="${escapeHtml(v)}"`);
    else if (k === 'style' && typeof v === 'object') {
      const st = Object.keys(v).map((p) => `${p}:${v[p]}`).join(';');
      if (st) attrs.push(`style="${escapeHtml(st)}"`);
    } else if (k.startsWith('on') && typeof v === 'function') continue;   // 事件走委托，不进 HTML
    else if (v === true) attrs.push(k);
    else attrs.push(`${k}="${escapeHtml(v)}"`);
  }
  const inner = children.map((c) => (typeof c === 'object' && c && c.tag
    ? renderToString(c)
    : stringify(c))).join('');
  const a = attrs.length ? ' ' + attrs.join(' ') : '';
  // void 元素不写闭合标签
  if (VOID_TAGS.has(tag)) return `<${tag}${a}>`;
  return `<${tag}${a}>${inner}</${tag}>`;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

/* ---------- 渲染与差异化更新 ---------- */

/**
 * 把虚拟树挂到容器。
 * @param {Element} container
 * @param {object} tree            虚拟节点
 * @param {object} opts            { onAct(actionName, event, dataset) }
 */
export function mount(container, tree, opts = {}) {
  if (!container) return;
  const prev = container.__xrayTree || null;
  const next = normalize(tree);
  patch(container, prev, next);
  container.__xrayTree = next;
  if (opts.onAct && !container.__xrayActBound) {
    container.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !container.contains(t)) return;
      const name = t.getAttribute('data-act');
      opts.onAct(name, e, t);
    });
    container.__xrayActBound = true;
  }
  if (opts.onInput && !container.__xrayInputBound) {
    container.addEventListener('input', (e) => {
      const t = e.target.closest('[data-input]');
      if (!t || !container.contains(t)) return;
      opts.onInput(t.getAttribute('data-input'), e, t);
    });
    container.addEventListener('change', (e) => {
      const t = e.target.closest('[data-change]');
      if (!t || !container.contains(t)) return;
      const name = t.getAttribute('data-change');
      if (opts.onChange) opts.onChange(name, e, t);
      else if (opts.onInput) opts.onInput(name, e, t);
    });
    container.__xrayInputBound = true;
  }
}

function normalize(v) {
  if (v === null || v === undefined || v === false || v === true) return null;
  if (Array.isArray(v)) {
    const kids = v.map(normalize).filter(Boolean);
    return kids.length ? { tag: '#frag', props: {}, children: kids, key: null } : null;
  }
  if (typeof v !== 'object') return { tag: '#text', props: {}, children: [String(v)], key: null };
  if (v[RAW] !== undefined) return { tag: '#raw', props: {}, children: [String(v[RAW])], key: null };
  return {
    tag: v.tag,
    props: v.props || {},
    children: (v.children || []).map(normalize).filter(Boolean),
    key: v.key !== undefined ? v.key : null,
  };
}

/** 节点级更新：同 tag 同 key 就复用 DOM，只改变化的部分。 */
function patch(parent, prev, next) {
  if (!prev) {
    parent.textContent = '';
    appendNode(parent, next);
    return;
  }
  if (!next) {
    parent.textContent = '';
    return;
  }
  if (prev.tag !== next.tag || prev.key !== next.key) {
    const tmp = document.createElement('div');
    appendNode(tmp, next);
    parent.replaceChildren(...Array.from(tmp.childNodes));
    return;
  }
  // 属性差异
  const oldP = prev.props || {};
  const newP = next.props || {};
  for (const k of Object.keys(oldP)) {
    if (!(k in newP) && !k.startsWith('on')) {
      if (k === 'class' || k === 'className') parent.removeAttribute('class');
      else parent.removeAttribute(k);
    }
  }
  for (const k of Object.keys(newP)) {
    if (k.startsWith('on') || k === 'key') continue;
    const v = newP[k];
    if (oldP[k] === v) continue;
    if (k === 'class' || k === 'className') parent.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const p of Object.keys(v)) parent.style.setProperty(p, v[p]);
    } else if (v === true) parent.setAttribute(k, '');
    else if (v === false || v === null || v === undefined) parent.removeAttribute(k);
    else parent.setAttribute(k, v);
  }
  // 文本节点
  if (next.tag === '#text') {
    const t = next.children.join('');
    if (parent.textContent !== t) parent.textContent = t;
    return;
  }
  if (next.tag === '#raw') {
    const t = next.children.join('');
    if (parent.innerHTML !== t) parent.innerHTML = t;
    return;
  }
  // 子节点：按 key 对齐
  const prevKids = prev.children || [];
  const nextKids = next.children || [];
  const prevByKey = new Map();
  prevKids.forEach((k, i) => { if (k.key) prevByKey.set(k.key, k); });
  const used = new Set();
  const domKids = Array.from(parent.childNodes);
  let idx = 0;
  for (const kid of nextKids) {
    let old = null;
    if (kid.key) {
      old = prevByKey.get(kid.key) || null;
      if (old) used.add(old);
    } else {
      old = prevKids[idx] || null;
      idx++;
    }
    if (!old) {
      const tmp = document.createElement('div');
      appendNode(tmp, kid);
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      parent.insertBefore(frag, domKids[idx] || null);
    } else {
      const target = findDomFor(parent, old);
      if (target) patch(target, old, kid);
      else {
        const tmp = document.createElement('div');
        appendNode(tmp, kid);
        while (tmp.firstChild) parent.insertBefore(tmp.firstChild, null);
      }
    }
  }
  // 移除多余的旧节点
  const keep = new Set();
  collectDom(parent, keep, nextKids);
  for (const n of Array.from(parent.childNodes)) {
    if (!keep.has(n)) parent.removeChild(n);
  }
}

/** 给虚拟节点找到对应的真实 DOM 节点（靠路径走）。 */
function findDomFor(parent, vnode) {
  const path = [];
  let cur = vnode;
  const root = parent.__xrayTree;
  // 用索引路径定位：简化实现，按 childNodes 序号匹配
  const idx = indexOfChild(parent.__xrayTree, vnode);
  if (idx < 0) return null;
  let dom = parent;
  for (const i of idx) {
    if (!dom.childNodes[i]) return null;
    dom = dom.childNodes[i];
  }
  return dom;
}

function indexOfChild(tree, target) {
  if (!tree) return -1;
  const walk = (node, path) => {
    if (node === target) return path;
    for (let i = 0; i < (node.children || []).length; i++) {
      const r = walk(node.children[i], path.concat(i));
      if (r) return r;
    }
    return null;
  };
  return walk(tree, []);
}

function collectDom(parent, keep, nextKids) {
  // 保守策略：本次渲染涉及的子树全部保留，其余由 patch 里的 remove 处理。
  // 这里只标记第一层，足够覆盖绝大多数"列表项增删"场景。
  nextKids.forEach((k, i) => {
    if (parent.childNodes[i]) keep.add(parent.childNodes[i]);
  });
}

function appendNode(parent, node) {
  if (!node) return;
  if (node.tag === '#text') {
    parent.appendChild(document.createTextNode(node.children.join('')));
    return;
  }
  if (node.tag === '#raw') {
    const tmp = document.createElement('div');
    tmp.innerHTML = node.children.join('');
    while (tmp.firstChild) parent.appendChild(tmp.firstChild);
    return;
  }
  if (node.tag === '#frag') {
    (node.children || []).forEach((c) => appendNode(parent, c));
    return;
  }
  const el = document.createElement(node.tag);
  for (const k of Object.keys(node.props || {})) {
    const v = node.props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class' || k === 'className') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const p of Object.keys(v)) el.style.setProperty(p, v[p]);
    } else if (k.startsWith('on') && typeof v === 'function') continue;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  (node.children || []).forEach((c) => appendNode(el, c));
  parent.appendChild(el);
}

/* ---------- 事件委托 ---------- */

/**
 * 全局委托：给根元素挂一个监听器，
 * 页面上任何带 data-act="name" 的元素被点/输入/变更时回调。
 * 渲染新节点不用重新接线 —— 这是换掉 onclick 拼法的关键。
 */
export function delegate(root, handlers) {
  const on = (evt, sel, fn) => {
    root.addEventListener(evt, (e) => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) fn(e, t);
    });
  };
  if (handlers.click) on('click', '[data-act]', handlers.click);
  if (handlers.input) on('input', '[data-input]', handlers.input);
  if (handlers.change) on('change', '[data-change]', handlers.change);
  if (handlers.keydown) on('keydown', '[data-key]', handlers.keydown);
}

/* ---------- 小工具 ---------- */

/** 条件类名：cls('x-on', cond) → 'x-on' 或 '' */
export function cls(...args) {
  const out = [];
  for (let i = 0; i < args.length; i += 2) {
    if (args[i + 1]) out.push(args[i]);
  }
  return out.join(' ');
}

/** 条件渲染：cond ? h(...) : null */
export function when(cond, fn) {
  return cond ? fn() : null;
}
