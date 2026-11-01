'use strict';

// 主体可信度（公司X光后端口径）—— 投资评分侧的单向校验
//
// 为什么要这一步：v1 里两个界面互不知情。一家公司可能「六锚点里发现主体不一致」
// 或「资金往来被判高风险」（可信度 = 偏低），同时因为财报漂亮拿到「目前适合投资」。
// 两个结论都各自"有据"，但摆在一起就是自相矛盾 —— 而用户只会觉得系统不靠谱。
//
// 方向是**单向**的：投资评分看可信度，可信度不看投资评分。
// 理由：可信度回答「它是不是它、钱走得正不正常」，是事实判断；
//       投资评分回答「值不值得投」，是判断之上的判断。事实判断不该被估值判断影响。
//       反过来，估值结论必须建立在事实成立之上。
//
// ⚠ 后端没起时如实标 unavailable，**不默认干净**，也不假装核过。

const BASE = String(process.env.XRAY_BACKEND || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const DEFAULT_TIMEOUT = 3000;

function summarize(t) {
  const fund = t.fund || {};
  const sum = fund.summary || {};
  return {
    state: 'ok',
    trust: t.trust || 'unknown',
    label: t.trust_label || '',
    hint: t.trust_hint || '',
    verified: t.verified === undefined ? null : t.verified,
    mismatch: t.mismatch === undefined ? null : t.mismatch,
    coverage: t.coverage === undefined ? null : t.coverage,
    inLibrary: !!t.in_library,
    fund: {
      state: fund.state || 'unknown',
      redHard: Number(sum.red_hard || 0),
      redSoft: Number(sum.red_soft || 0)
    },
    // 触发投资结论撤回的条件：可信度已判「偏低」（主体不一致 或 资金往来异常）
    conflict: t.trust === 'low',
    note: t.trust_label
      ? '主体核验：' + t.trust_label
      : '主体核验已完成'
  };
}

async function fetchTrust(name, opts) {
  const o = opts || {};
  if (o.disabled) {
    return { state: 'off', conflict: false, note: '本次未做主体一致性核验（显式关闭）。' };
  }
  const trimmed = String(name || '').trim();
  if (!trimmed) {
    return { state: 'off', conflict: false, note: '未提供公司名称，跳过主体核验。' };
  }
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, o.timeoutMs || DEFAULT_TIMEOUT);
  try {
    const res = await fetch(BASE + '/api/v1/trust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
      signal: controller.signal
    });
    if (!res.ok) {
      return {
        state: 'error', conflict: false,
        note: '主体核验接口返回 HTTP ' + res.status + '，本次**未做**主体一致性核验（不代表没问题）。'
      };
    }
    const t = await res.json();
    const s = summarize(t || {});
    s.note = s.note + '（来源：公司X光本地已复核事实库；' +
      (s.verified === null ? '已核项数未知' : '六锚点已核一致 ' + s.verified + ' 项') + '）';
    return s;
  } catch (e) {
    const why = e && e.name === 'AbortError' ? '请求超时' : (e && e.message) || String(e);
    return {
      state: 'unavailable', conflict: false,
      note: '连不上公司X光后端（' + BASE + '，' + why + '），本次**未做**主体一致性核验（不代表没问题）。'
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { fetchTrust, BACKEND: BASE };
