/* result.js · 查询结果渲染（字段对照 / 十维评分 / KPI） */

import { esc, state } from '../core/env.js';
import { radar, spark } from '../core/charts.js';
import { doProfile } from '../core/actions.js';

  export const TRUST_MAP = {
    high: ['x-ok', '高'], medium: ['x-grey', '一般'], low: ['x-bad', '偏低'],
    ai_medium: ['x-grey', '一般 · AI 线索'], unknown: ['x-grey', '信息不足'],
  };
  export const FSTATE = {
    agree: ['is-success', '两侧一致'], conflict: ['is-danger', '两侧冲突'],
    local_only: ['is-light', '仅本地'], cloud_only: ['is-warning', '仅云端'],
  };
  export const CLOUD_STATE = {
    ok: '已取得线索', not_wired: '未配置 AI 密钥', unknown: '检索/抽取无结果',
    error: '通道异常', off: '本次未启用', offline: '离线模式（无云端）',
  };
  export const SRC_LABEL = { 'brands.json': '品牌库', 'entities.json': '实体库', 'fund_flows.json': '资金流水' };
  export function srcLabel(s) {
    const k = String(s || '').trim();
    if (!k) return '';
    if (SRC_LABEL[k]) return SRC_LABEL[k];
    if (/\.json$/i.test(k)) return '本地库';
    if (/^(ai|web|cloud)/i.test(k)) return '云端检索';
    return k;
  }
  /* 连点保护：只认最后一次查询的结果。
     ⚠⚠ 这里原来写的是 `export let uniSeq = 0`，actions.js 里 `++uniSeq` ——
       **ES module 的 import 绑定是只读的**，对导入方重新赋值会抛
       `TypeError: Assignment to constant variable`。
       而这行恰好在 doUnified() 的**第三行**（拿到查询名之后、发请求之前），
       于是**每次点「查询」都在发请求之前就炸掉**，一个包都发不出去 ——
       页面表现就是「查询功能没了」，而且控制台只有一条不显眼的 TypeError。
       （浏览器里 ESM 是 live binding，但仍然不可写；这是规范，不是实现细节。）
       修法：改成对象容器，改的是**属性**而不是绑定，跨模块完全合法。 */
  export const uniSeq = { n: 0 };
  export function fieldsHtml(fields) {
    if (!fields || !fields.length) {
      return '<p class="x-muted" style="margin:0">两侧都没有可比的字段。</p>';
    }
    const rows = fields.map((f) => {
      const st = FSTATE[f.state] || ['is-light', f.state];
      const L = f.local ? esc(f.local.v) + `<div class="x-muted" style="font-size:11.5px">${esc(srcLabel(f.local.src))}</div>` : '<span class="x-muted">—</span>';
      const C = f.cloud ? esc(f.cloud.v) + `<div class="x-muted" style="font-size:11.5px">${esc(srcLabel(f.cloud.src))}</div>` : '<span class="x-muted">—</span>';
      const note = (f.note || '').trim();
      // 「仅本地」时后端给的备注和那个 tag 说的是同一件事，六行都重复一遍就是噪音 ——
      // tag 已经表达了结论，备注收进 title，鼠标悬停仍看得到，信息没丢。
      const showNote = note && f.state !== 'local_only';
      return `<tr${f.state === 'conflict' ? ' style="background:var(--x-sev-bg-bad)"' : ''}>
        <td>${esc(f.label)}</td><td>${L}</td><td>${C}</td>
        <td><span class="tag ${st[0]} is-light"${note ? ` title="${esc(note)}"` : ''}>${esc(st[1])}</span>
          ${showNote ? `<div class="x-muted" style="font-size:11.5px;margin-top:3px">${esc(note)}</div>` : ''}</td></tr>`;
    }).join('');
    return `<table class="table is-fullwidth x-table" style="margin:0">
      <thead><tr><th style="width:22%">字段</th><th>本地事实库</th><th>云端线索</th><th style="width:24%">对照结论</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }
  export function anchorRowsHtml(anchors) {
    return (anchors || []).map((a) => {
      const m = a.pass === true ? ['一致', 'is-success'] : (a.pass === false ? ['不一致', 'is-danger'] : ['库内无记录 / 需页面信息', 'is-light']);
      return `<tr><td>${esc(a.name)}</td><td><span class="tag ${m[1]} is-light">${m[0]}</span></td>
        <td class="x-muted">${esc(a.evidence || '')}</td>
        <td>${a.source_url ? `<a href="${esc(a.source_url)}" target="_blank" rel="noopener">复核</a>` : ''}</td></tr>`;
    }).join('');
  }

  /* 「去哪儿自己核」面板（3.1.0）。
   * 🔑 为什么结果页也要摆这个：
   *   我们的结论只是「替你先跑一遍」，真正掏钱的人还是得自己去官方看一眼。
   *   以前这一步要用户自己记住"商标去商标网、诉讼去裁判文书网"——
   *   于是整条"可回溯"的卖点就断在了最后一步。现在把入口直接摆在结论旁边，
   *   并且**带上这家公司名**（支持的站点直接生成检索链接，不用手打）。
   *
   *   只列 anchors 组（与后端 SOURCES 口径对齐的那几条），
   *   全量 102 条在「资料库」页 —— 这里要的是"最该去的那几个"，不是清单。
   */
  export function officialEntryPanel(companyName) {
    const groups = ((window.XrayLibrary || {}).groups) || [];
    const g = groups.find((x) => x && x.key === 'anchors');
    const items = (g && g.items) || [];
    if (!items.length) return '';
    const total = groups.reduce((a, x) => a + (((x || {}).items || []).length), 0);
    const q = String(companyName || '').trim();
    return `<div class="x-lib-panel">
      <div class="x-lib-panel-hd">
        <b>自己去官方核一遍</b>
        <span class="x-quiet">这 ${items.length} 个是本次判定用到的入口；资料库共 ${total} 条</span>
      </div>
      <div class="x-lib-items" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        ${items.map((it) => {
          const qUrl = it.q ? it.q.replace('{q}', encodeURIComponent(q || '公司名')) : '';
          return `<div class="x-lib-item">
            <div class="x-lib-item-hd"><span class="x-lib-name">${esc(it.name)}</span></div>
            <div class="x-lib-what">${esc(it.what || '')}</div>
            <div class="x-lib-ops" style="margin-top:6px">
              <a class="x-btn sm primary" href="${esc(it.url)}" target="_blank" rel="noopener">打开 ↗</a>
              ${qUrl ? `<a class="x-btn sm" href="${esc(qUrl)}" target="_blank" rel="noopener"
                title="打开检索页并带上本次查询名">带名搜索 ↗</a>` : ''}
              <a class="x-btn sm ghost" href="#/library">资料库</a>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="x-muted" style="font-size:11.5px;margin-top:8px;line-height:1.7">
        我们只替你先跑一遍；<b>最终确认请以官方登记为准</b>。官方站点查无记录，
        也不等于企业一定有问题 —— 可能只是这项本来就不需要公示。
      </div>
    </div>`;
  }
  /* 完整报告的入口。
     ⚠ 路径历史（三次踩坑，每次都不一样）：
       ① 最早是 front/x/invest/            —— x/ 目录后来整个迁走了，404
       ② 改成 /stage/invest-score/         —— 那是**源码目录**，不是访问路径，404
       ③ 正确：投资评分是独立 Node 服务，由后端 lifespan 自动拉起，端口 3210
          （人员透视是 3211）。见 backend/bonus.py 顶部的注释与 EXTRAS 表。
     ⚠⚠ 参数名以评分页自己读的为准：front/stage/invest-score/public/index.html
       里是 qs.get('q') 与 qs.get('type') —— **不是 name**。
       用错参数名的话页面能打开但不会自动查询，等于又回到 3.0.0 记的那个老坑：
       「点过去是一片空白首页」。这里已与评分页逐字核对过。 */
  export const INVEST_URL = 'http://127.0.0.1:3210';
  export const XRAY_URL = 'http://127.0.0.1:3211';
  export function reportUrl(invType, companyName) {
    const t = invType === 'unlisted' ? 'unlisted' : 'listed';
    const q = String(companyName || '').trim();
    return INVEST_URL + '/?type=' + t + (q ? '&q=' + encodeURIComponent(q) : '');
  }
  export function investHtml(inv, err, invType, companyName) {
    if (err) {
      return `<div class="x-note warn"><b>投资评分这次没取到</b>：${esc(err)}
        <div class="x-muted" style="margin-top:4px">上面的可信度结论不受影响；稍后重试或
        <a href="${reportUrl(invType, companyName)}" target="_blank" rel="noopener">在评分页里重新试一次</a>。</div></div>`;
    }
    if (!inv) return '<p class="x-muted" style="margin:0">投资评分：查询中…</p>';
    if (inv.ok === false) return `<div class="x-note warn">投资评分未给出结论：${esc(inv.error || '未知原因')}</div>`;
    const r = inv.result || {};
    const v = r.verdict || {};
    const col = v.color === 'green' ? 'x-ok' : (v.color === 'red' ? 'x-bad' : (v.color === 'grey' ? 'x-grey' : 'x-info'));
    const dims = (r.breakdown || []).map((b) => `<tr${b.raw == null ? ' class="off"' : ''}><td>${esc(b.label)}</td>
      <td>${b.weighted == null ? '未评分' : esc(b.weighted)}</td>
      <td class="x-muted">${b.raw == null ? '未取得可核对的公开数据' : esc(b.raw)}</td></tr>`).join('');
    const scoredN = (r.breakdown || []).filter((b) => b.raw != null).length;
    const totalN = (r.breakdown || []).length;
    const notes = (r.dataNotes || []).filter((n) => /AI|演示|撤回|覆盖度/.test(String(n)));

    // 交易所披露：诉讼与团队两维的唯一一手来源，把它顶到首页而不是只写在报告里。
    // 「未见」比「0 条」诚实 —— 未达披露标准的事项本来就不会进公告。
    const dc = r.disclosure;
    let discHtml = '';
    if (dc && dc.status === 'ok') {
      const cs = dc.cats || {};
      const nOf = (k) => (cs[k] && cs[k].count) || 0;
      const chip = (label, k) => {
        const n = nOf(k);
        return `<span class="x-chip">${label} <b class="${n ? 'x-bad' : 'x-ok'}">${n ? n + ' 条' : '未见'}</b></span>`;
      };
      const ev = (dc.evidence || []).slice(0, 3);
      const srcName = dc.market === 'hkex' ? '港交所披露易' : '交易所披露';
      discHtml = `<div style="margin:10px 0 4px">
        <div class="x-muted" style="font-size:12.5px">${srcName}（近 24 个月 ${esc(dc.total)} 条公告，覆盖自 ${esc(dc.earliest || '—')}${dc.complete ? '' : '，时段不完整'}）</div>
        <div class="x-chips" style="margin-top:6px">
          ${chip('诉讼/仲裁', 'litigation')}
          ${chip('监管处罚/问询', 'penalty')}
          ${chip('高管变动', 'management')}
          ${chip('股权质押/变动', 'equity')}
        </div>
        ${ev.length ? `<ul style="margin:8px 0 0;padding-left:18px;font-size:12.5px;line-height:1.7">${
          ev.map((it) => `<li><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.date)} ${esc(it.title)}</a></li>`).join('')
        }</ul>` : ''}
        <div class="x-muted" style="font-size:11.5px;margin-top:6px">
          「未见」指该期间公告中未出现此类事项；未达披露标准的小额纠纷不会进公告。
        </div>
      </div>`;
    } else if (dc && dc.status && dc.status !== 'pending') {
      discHtml = `<div class="x-note" style="margin:10px 0">
        交易所披露：${esc(dc.note || '不可用')}。诉讼与团队两维因此无法从公告核对。</div>`;
    }
    /* 3.7.0：托管版五维评分**默认联网现算**，取数失败才回落离线快照。
       两种口径都必须顶在 KPI 上方写明「本次是哪一种」—— 只改横幅不改结果卡，
       等于页面拿着快照还说实时，或者实时结果却没有正面标识。 */
    const snap = inv.snapshot || null;
    const rt = inv.realtime || null;
    const mode = inv.mode || (snap && snap.mode === 'snapshot' ? 'snapshot_fallback' : null);
    const snapHtml = mode === 'snapshot_fallback' ? `
      <div class="x-note" style="margin-bottom:10px;border-left-color:var(--x-warn, #d97706)">
        <b>本次实时取数未成功，这是一份五维离线快照（非实时）</b>：
        结果由同一份评分代码在 <b>${esc(snap.generated_at || '—')}</b> 生成，
        行情与公告会变，结论也会跟着变；可稍后重试以取得实时结果。
        原因：${esc(inv.fallback_reason || '未提供')}。${snap.snapshot_name && snap.snapshot_name !== (r.query || {}).name
          ? `（本次按「${esc(snap.snapshot_name)}」取的快照）` : ''}
      </div>` : '';
    const rtHtml = (mode === 'realtime' && rt) ? `
      <div class="x-note" style="margin-bottom:10px;border-left-color:var(--x-brand-solid, #256fc9)">
        <b>本次为联网实时评分</b>：取数于 <b>${esc(rt.fetched_at || '—')}</b>，
        当场取得 <b>${esc((rt.channels_ok || []).length)}</b> 类公开数据后按五维算分
        （耗时 ${esc(rt.elapsed_ms == null ? '—' : rt.elapsed_ms)} ms）。
        行情与公告变化后需要重查。
      </div>` : '';
    return `
      ${snapHtml}${rtHtml}
      <div class="x-kpis" style="margin-bottom:10px">
        <div class="x-kpi"><div class="k">投资结论</div><div class="v ${col}">${esc(v.label || '—')}</div></div>
        <div class="x-kpi"><div class="k">综合评分</div><div class="v x-info">${r.score == null ? '—' : esc(r.score)}</div></div>
        <div class="x-kpi"><div class="k">数据覆盖度</div><div class="v x-grey">${r.coverage == null ? '—' : esc(r.coverage) + '%'}</div></div>
        <div class="x-kpi"><div class="k">精英人物加分</div><div class="v x-info">+${esc(r.eliteBonus || 0)}</div></div>
      </div>
      ${v.detail ? `<div class="x-note" style="margin-bottom:10px">${esc(v.detail)}</div>` : ''}
      ${(r.stock && r.stock.shortName) ? `<p style="font-size:13.5px;margin:6px 0">证券：<b>${esc(r.stock.shortName)}（${esc(r.stock.code)}）</b>
        ${r.stock.market ? '｜市场：' + esc(r.stock.market) : ''}</p>` : ''}
      ${discHtml}
      <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:700">维度明细（已评分 ${scoredN} / ${totalN}）</summary>
        <table class="table is-fullwidth x-table" style="margin-top:8px">
          <thead><tr><th>维度</th><th>加权得分</th><th>原始值</th></tr></thead>
          <tbody>${dims || '<tr><td colspan="3" class="x-muted">没有维度数据</td></tr>'}</tbody></table>
        ${scoredN < totalN ? `<p class="x-muted" style="font-size:12px;margin:8px 0 0">
          总分只在 <b>${scoredN} / ${totalN}</b> 维上计算。未评分的维度没有取得可核对的公开数据，
          <b>不按中性 50 分计入</b> —— 按中性计入会把"查不到"错误地表达成"中等水平"。</p>` : ''}</details>
      ${notes.length ? `<div class="x-note" style="margin-top:10px;border-left-color:var(--x-grey);background:var(--x-sev-bg-warn)">
        <b>评分引擎的诚实性说明</b><br>${notes.map((n) => '· ' + esc(n)).join('<br>')}</div>` : ''}
      <p class="x-muted" style="font-size:12px;margin-top:8px">
        投资评分由独立子应用给出，"数据不足"时会<b>自动撤回结论</b>（不给投资建议）。
        <a href="${reportUrl(invType, companyName)}" target="_blank" rel="noopener" style="font-weight:700">生成完整评估报告 ↗</a></p>`;
  }
  export function kpiHtml(v, inv, conflicts, fund, invLabel, tm) {
    const items = [
      `<div class="x-kpi"><div class="k">① 主体可信度</div><div class="v ${tm[0]}">${esc(v.trust_label || '—')}</div></div>`,
      `<div class="x-kpi"><div class="k">② 投资评估</div><div class="v x-info">${esc(invLabel)}</div></div>`,
      `<div class="x-kpi"><div class="k">已核验一致项</div><div class="v x-info">${v.verified == null ? '—' : esc(v.verified)} 项</div></div>`,
      `<div class="x-kpi"><div class="k">两侧冲突</div><div class="v ${conflicts.length ? 'x-bad' : 'x-ok'}">${conflicts.length} 项</div></div>`,
    ];
    const fs = fund.summary || null;
    if (fs) {
      const cls = fs.red_hard ? 'x-bad' : (fs.red_soft ? 'x-grey' : 'x-ok');
      items.push(`<div class="x-kpi"><div class="k">资金往来</div><div class="v ${cls}">${esc(fs.total)} 笔</div></div>`);
    }
    const cov = inv && inv.result && inv.result.coverage;
    if (typeof cov === 'number' && isFinite(cov)) {
      // 覆盖率只是"数据够不够"，不是好坏：50% 以下判红是口径规定的"不给结论"线
      const cls = cov < 50 ? 'x-bad' : (cov < 75 ? 'x-grey' : 'x-ok');
      items.push(`<div class="x-kpi"><div class="k">数据覆盖率</div><div class="v ${cls}">${esc(cov)}%</div></div>`);
    }
    return `<div class="x-kpis">${items.join('')}</div>`;
  }
  export function renderMerged(u, inv, meta) {
    meta = meta || {};
    const v = (u && u.verdict) || {};
    const tm = TRUST_MAP[v.trust] || ['x-info', v.trust || '—'];
    const conflicts = (u && u.conflicts) || [];
    const local = (u && u.sources && u.sources.local) || {};
    const cloud = (u && u.sources && u.sources.cloud) || {};
    const invLabel = (inv && inv.result && inv.result.verdict) ? inv.result.verdict.label : (meta.invErr ? '评分不可用' : '查询中…');
    const fund = v.fund || {};

    const banner = conflicts.length ? `<div class="x-note" style="border-left-color:var(--x-bad);background:var(--x-sev-bg-bad);margin-bottom:12px">
      <b>⚠ 两侧说法不同（${conflicts.length} 项）</b>：${conflicts.map((c) =>
        `${esc(c.label)}（本地：${esc(c.local.v)}；云端：${esc(c.cloud.v)}）`).join('；')}
      <div class="x-muted" style="font-size:12px;margin-top:4px">本页不替你选一个：请以官方登记为准，核实后再决定是否付款。</div>
    </div>` : '';

    $('#verdictBox').innerHTML = `
      <div class="x-meta">口径 <b>${esc(meta.typeLabel || '')}</b>
        ${meta.phase === 'local' ? '· 正在补充云端线索' : (meta.phase === 'done' ? '· 云端线索已并入' : '')}</div>
      ${kpiHtml(v, inv, conflicts, fund, invLabel, tm)}
      <div class="x-note" style="margin-bottom:10px">${esc(v.trust_hint || '')}</div>
      ${banner}

      <div class="x-card" style="box-shadow:none;margin-bottom:14px"><div class="hd" style="padding:0 0 8px;border:0">
        <span class="x-bar"></span><h2 style="font-size:15.5px;letter-spacing:-.2px">① 主体核验 · 逐字段对照（本地已复核库 / 云端线索）</h2>
        <a href="../query/?name=${encodeURIComponent(u && u.query ? u.query.name : '')}" target="_blank" rel="noopener"
          class="x-quiet" style="margin-left:auto">单独页面打开 ↗</a></div>
        ${fieldsHtml(u && u.fields)}
        <details style="margin-top:12px"><summary style="cursor:pointer;font-weight:700">六锚点逐条取证与官方入口</summary>
          <table class="table is-fullwidth x-table" style="margin-top:8px"><thead><tr><th>锚点</th><th>本次能否判断</th><th>依据</th><th>官方</th></tr></thead>
            <tbody>${anchorRowsHtml(v.anchors) || '<tr><td colspan="4" class="x-muted">没有锚点数据</td></tr>'}</tbody></table>
        </details>
        ${officialEntryPanel((u && u.query || {}).name)}
        ${(fund.summary) ? `<div class="x-note" style="border-left-color:${fund.summary.red_hard ? 'var(--x-bad)' : (fund.summary.red_soft ? 'var(--x-grey)' : 'var(--x-ok)')};margin-top:12px">
          <b>资金往来（已并入本次评估）</b>
          <div style="margin-top:6px;font-size:13px;line-height:1.8">
            共 <b>${fund.summary.total}</b> 笔，涉及对手方 ${fund.summary.counterparts} 家、金额 ¥${Number(fund.summary.amount_total || 0).toLocaleString('zh-CN')}；
            高风险 <b class="${fund.summary.red_hard ? 'x-bad' : ''}">${fund.summary.red_hard || 0}</b> 笔、
            需复核 ${fund.summary.red_soft || 0} 笔。
            <a href="${esc(fund.link || '/fund/')}" target="_blank" rel="noopener" style="font-weight:700">查看每笔明细 →</a></div></div>`
        : (fund.state === 'unknown' ? `<div class="x-muted" style="font-size:12px;margin-top:10px">资金往来：${esc(fund.note || '库内无该主体的资金往来记录')}</div>` : '')}
        ${v.in_library === false ? `<div class="x-note warn" style="margin-top:12px">
          <b>为什么主体可信度判为「信息不足」</b>这一栏只统计<b>已复核事实库里的六锚点一致项</b>；
          这个主体不在库内、本次也没有页面上的签约/收款信息，所以判不了 —— <b>无法判断 ≠ 有问题</b>。
          想看公开线索与人员信息（联网整理，需自己核对）：
          <div style="margin-top:8px"><button class="button is-primary is-small" id="btnToProfile">收集企业档案 · 查看公开线索与人员 →</button></div>
        </div>` : ''}
      </div>

      <div class="x-card" style="box-shadow:none;margin-bottom:14px"><div class="hd" style="padding:0 0 8px;border:0">
        <span class="x-bar"></span><h2 style="font-size:15.5px;letter-spacing:-.2px">② 投资评估 · 十维评分</h2></div>
        ${investHtml(inv, meta.invErr, meta.invType, (u && u.query || {}).name)}
      </div>

      <div class="x-note" style="border-left-color:var(--x-grey);background:var(--x-sev-bg-warn)">
        <b>两项结论为何分列</b>：① 回答"它是不是它、公开信息对不对得上"，② 回答"这家公司值多少钱"。
        本地库查不到（①为「信息不足」）不代表不能投，也不代表能投；反过来投资评分高，也不代表签约主体就是官方主体。<br>
        <b>本次来源</b>：本地 ${local.state === 'hit' ? '命中' + (local.brand ? '品牌「' + esc(local.brand) + '」' : '') + (local.entity ? '主体「' + esc(local.entity) + '」' : '') : '未收录'}
        ｜云端 ${esc(CLOUD_STATE[cloud.state] || cloud.state || '—')}${cloud.note ? '（' + esc(cloud.note) + '）' : ''}
      </div>
      <ul class="x-muted" style="font-size:12px;margin:8px 0 0 18px;padding:0">
        ${((u && u.limits) || []).map((x) => `<li>${esc(x)}</li>`).join('')}
      </ul>
      <p class="x-muted" style="font-size:12px;margin-top:8px">${esc(v.manual_note || '')}
        官方入口见 <a href="#/library">资料库</a>；<b>查无记录不等于企业有问题</b>。</p>`;
    if ($('#radarBox')) $('#radarBox').innerHTML = radar(((v.anchors) || []).map((r) => ({ name: r.name, pass: r.pass })));
    // 「收集企业档案」是每次渲染新插入的按钮，必须重新接线（否则点了没反应）
    const bp = document.getElementById('btnToProfile');
    if (bp) bp.onclick = doProfile;
  }
  export function fundSecHtml(s) {
    const fs = s.fund_summary || {};
    const badge = s.state === 'ok' ? '📊' : '◯';
    let h = `<div style="margin-bottom:14px"><div style="font-weight:700">${badge} ${esc(s.title)}
      <span class="x-muted" style="font-weight:400">来源：${esc(s.source)}</span></div>`;
    if (s.note) h += `<div class="x-muted" style="margin:5px 0">${esc(s.note)}</div>`;
    if (fs.total) {
      h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 10px;align-items:center">
        <span class="tag is-light">往来 ${fs.total} 笔</span>
        <span class="tag ${fs.red_hard ? 'is-danger' : 'is-light'} is-light">高风险 ${fs.red_hard || 0}</span>
        <span class="tag ${fs.red_soft ? 'is-warning' : 'is-light'} is-light">需复核 ${fs.red_soft || 0}</span>
        <span class="tag is-light">正常 ${fs.green || 0}</span>
        <span class="x-muted" style="font-size:12px">涉及 ¥${Number(fs.amount_total || 0).toLocaleString('zh-CN')} · 对手方 ${fs.counterparts || 0} 家</span>
        <a href="${esc(s.fund_link || '/fund/')}" target="_blank" rel="noopener" style="font-size:12.5px;font-weight:700">打开资金流水核验 →</a>
      </div>`;
    }
    if (s.rows && s.rows.length) h += '<table class="table is-fullwidth x-table"><thead><tr><th>资金往来</th><th>核验</th><th>依据</th></tr></thead><tbody>'
      + s.rows.map((r) => `<tr><td>${esc(r.name)}</td>
        <td><span class="tag ${r.pass ? 'is-success' : 'is-danger'} is-light">${r.pass ? '正常' : '异常'}</span></td>
        <td class="x-muted">${esc(r.evidence)}</td></tr>`).join('') + '</tbody></table>';
    return h + '</div>';
  }
  export function secHtml(s) {
    if (s.key === 'fund') return fundSecHtml(s);
    const badge = { ok: '✅', unknown: '◯', not_found: '◯', not_wired: '⚠️', external: '↗' }[s.state] || '·';
    let h = `<div style="margin-bottom:14px"><div style="font-weight:700">${badge} ${esc(s.title)}
      <span class="x-muted" style="font-weight:400">来源：${esc(s.source)}</span></div>`;
    if (s.note) h += `<div class="x-muted" style="margin:5px 0">${esc(s.note)}</div>`;
    if (s.facts && s.facts.length) h += '<table class="table is-fullwidth x-table">' + s.facts.map((f) =>
      `<tr><td class="x-muted" style="width:132px">${esc(f.k)}</td><td>${esc(f.v)}</td></tr>`).join('') + '</table>';
    if (s.rows && s.rows.length) h += '<table class="table is-fullwidth x-table">' + s.rows.map((r) => {
      const m = r.pass === true ? ['一致', 'is-success'] : (r.pass === false ? ['不一致/查无', 'is-danger'] : ['无公开数据', 'is-light']);
      return `<tr><td>${esc(r.name)}</td><td><span class="tag ${m[1]} is-light">${m[0]}</span></td>
        <td class="x-muted">${esc(r.evidence)}</td><td>${r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">复核</a>` : ''}</td></tr>`;
    }).join('') + '</table>';
    if (s.company) { const c = s.company;
      h += `<div style="font-size:13.5px;margin-top:6px">证券简称：<b>${esc(c.matched_name)}</b>（${esc(c.code)}）`
        + (c.industry ? ` ｜ 行业：${esc(c.industry)}` : '') + (c.market_cap ? ` ｜ 总市值：${esc(c.market_cap)}` : '')
        + (c.listing_date ? ` ｜ 上市：${esc(c.listing_date)}` : '') + '</div>';
      if (c.info_note) h += `<div class="x-muted">${esc(c.info_note)}</div>`; }
    if (s.history && s.history.length) s.history.forEach((row) => {
      const keys = Object.keys(row.values);
      h += `<div style="margin-top:10px;font-size:13px"><b>${esc(row.metric)}</b>（按报告期）：`
        + keys.map((k) => `${k.slice(4, 6)}/${k.slice(6, 8)}: <b>${esc(row.values[k])}</b>`).join('　') + '</div>';
      if (row.metric.indexOf('营业') >= 0) h += spark(keys.map((k) => row.values[k])); });
    if (s.links && s.links.length) h += '<div style="font-size:13px;margin-top:6px">'
      + s.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener" style="margin-right:10px">${esc(l.name)}</a>`).join('') + '</div>';
    return h + '</div>';
  }
