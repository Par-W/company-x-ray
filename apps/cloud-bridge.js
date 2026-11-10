/* cloud-bridge.js · 托管版「加分项」页面的云端适配层（只随站点发布，不进 front/）
 *
 * 这两个页面原本由本机 Node 服务提供，页面里写的是相对路径 fetch('api/analyze')。
 * 搬到静态站上后没有 Node，请求会 404。这里只做一件事：把这四个相对接口
 * 翻译成一次 AppWrite Function 调用，返回标准 Response，页面脚本一行不用改。
 *
 * 与 home/js/core/env.js 的 callCloud 是同一套协议（含访客隔离标识），
 * 但刻意不 import 它：这两个页面是普通 <script>，不是 ES module。
 *
 * 3.4.1 两档：默认跟首页一样走网页精简版（xray-lite）。精简版**刻意不带**
 * 投资评分 / 人员透视的离线快照，所以这里直接返回 501 + 人话，不发网络请求，
 * 免得页面空等一次冷启动再显示一句看不懂的错误。?full=1 切回云端完整版。
 */
(function () {
  'use strict';
  var EP = 'https://sgp.cloud.appwrite.io/v1';
  var PROJ = '6ae6a81d0010c6980d02';
  var FN_FULL = 'xray-api';
  var FN_LITE = 'xray-lite';
  var MAP = {
    'api/analyze': '/api/analyze',
    'api/personnel': '/api/personnel',
    'api/profile': '/api/profile',
    'api/config': '/api/config'
  };
  var KEY = 'xray-cloud-visitor';

  function tier() {
    try {
      var q = new URLSearchParams(location.search || '');
      if (q.get('full') === '1') { localStorage.setItem('xray.cloudTier', 'full'); return 'full'; }
      if (q.get('lite') === '1') { localStorage.setItem('xray.cloudTier', 'lite'); return 'lite'; }
      return localStorage.getItem('xray.cloudTier') === 'full' ? 'full' : 'lite';
    } catch (e) { return 'lite'; }
  }
  var TIER = tier();
  var FN = TIER === 'full' ? FN_FULL : FN_LITE;

  function visitor() {
    try {
      var v = localStorage.getItem(KEY);
      if (!v) {
        v = 'v_' + (window.crypto && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '')
          : Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem(KEY, v);
      }
      return v;
    } catch (e) { return 'v_nostorage'; }
  }

  var raw = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var u = typeof input === 'string' ? input : String((input && input.url) || '');
    // 只接相对路径；绝对 URL / 其它资源一律原样放行
    if (/^https?:/i.test(u) || u.indexOf('//') === 0) return raw(input, init);
    var clean = u.split('?')[0].replace(/^\.\//, '').replace(/^\//, '');
    var target = MAP[clean];
    if (!target) return raw(input, init);

    if (TIER === 'lite') {
      return Promise.resolve(new Response(JSON.stringify({
        ok: false, cloud: true, lite: true, code: 'not_in_lite',
        note: '网页精简版不提供投资评分 / 人员透视：这一版只有 5 项只读核验，'
          + '也不带离线快照。在网址后加 ?full=1 切到云端完整版，或用桌面客户端。'
          + '这只说明能力边界，不代表目标公司有问题。'
      }), { status: 501, headers: { 'Content-Type': 'application/json' } }));
    }

    var opts = init || {};
    var method = (opts.method || 'GET').toUpperCase();
    var body = opts.body != null ? String(opts.body) : '';
    var vid = visitor();
    return raw(EP + '/functions/' + FN + '/executions', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJ },
      body: JSON.stringify({
        body: body, method: method,
        path: target + '?__v=' + encodeURIComponent(vid),
        headers: { 'content-type': 'application/json', 'x-xray-visitor': vid }
      })
    }).then(function (r) { return r.json(); }).then(function (d) {
      return new Response(String(d.responseBody == null ? '' : d.responseBody), {
        status: Number(d.responseStatusCode || 200),
        headers: { 'Content-Type': 'application/json' }
      });
    });
  };

  /* 页面里必须看得见「这是快照 / 这一档不提供」：两个子应用自己不知道自己在云上。
     用 DOM 插一条，不改它们任何一行源码。 */
  function banner() {
    if (document.getElementById('xrayStageNotice')) return;
    var bar = document.createElement('div');
    bar.id = 'xrayStageNotice';
    bar.style.cssText = 'position:relative;z-index:9999;padding:9px 14px;'
      + 'background:#fff4d6;color:#5a4300;border-bottom:1px solid #d9b75c;'
      + 'font:13px/1.7 system-ui,-apple-system,sans-serif;text-align:center';
    if (TIER === 'lite') {
      bar.innerHTML = '<b>网页精简版</b>：投资评分与人员透视<b>不在这一版的 5 个能力点里</b>，'
        + '这一版也没有带离线快照。在网址后加 <code>?full=1</code> 切到云端完整版'
        + '（那里给的是与本机同一份代码算好的离线快照，不是实时查询），或用桌面客户端。';
    } else {
      bar.innerHTML = '<b>云端版</b>：本页数据来自<b>与本机同一份代码算好的离线快照</b>，'
        + '不是实时查询；生成时间与数据来源写在结果里，查不到主体不代表它有问题。'
        + '要实时评分 / 实时人员透视请用本机版。';
    }
    (document.body || document.documentElement).insertBefore(bar,
      (document.body || document.documentElement).firstChild);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', banner);
  } else { banner(); }
})();
