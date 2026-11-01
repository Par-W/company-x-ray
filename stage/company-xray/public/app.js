'use strict';

var cfgLoaded = false;

function esc(s){ var d=document.createElement('div'); d.textContent=s==null?'':String(s); return d.innerHTML; }

function fmtShares(n){
  if(n==null||n==='') return '';
  n=Number(String(n).replace(/,/g,''));
  if(!isFinite(n)) return String(n);
  if(n>=100000000) return (n/100000000).toFixed(2)+' 亿股';
  if(n>=10000) return (n/10000).toFixed(1)+' 万股';
  return String(n)+' 股';
}

function loadConfig(){
  fetch('api/config').then(function(r){return r.json();}).then(function(d){
    if(!d.ok) return;
    var m=d.mcpConfigured||{};
    document.querySelectorAll('.srcChip[data-src]').forEach(function(el){
      var k=el.getAttribute('data-src');
      if(k==='fallback') return;
      if(m[k]) el.classList.add('ok'); else el.classList.add('no');
    });
    cfgLoaded=true;
  }).catch(function(){});
}

function go(){
  var company=document.getElementById('fCompany').value.trim();
  if(!company){ alert('请输入公司名称'); return; }
  document.getElementById('btnGo').disabled=true;
  document.getElementById('result').style.display='none';
  document.getElementById('loading').style.display='block';
  document.getElementById('loadStep').textContent='并发查询企查查 / 水滴信用 / 天眼查 + 公开兜底渠道…';
  fetch('api/profile',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({company:company})
  }).then(function(r){return r.json();}).then(function(d){
    document.getElementById('loading').style.display='none';
    document.getElementById('btnGo').disabled=false;
    if(!d.ok){ alert(d.error||'查询失败'); return; }
    render(d);
  }).catch(function(e){
    document.getElementById('loading').style.display='none';
    document.getElementById('btnGo').disabled=false;
    alert('网络异常：'+e.message);
  });
}

function renderReg(r){
  var html='<div class="card"><h3>工商登记<span class="sub">'+esc(r.regSource?('数据源：'+r.regSource):'')+'</span></h3>';
  // [整合修正] 查不到时必须说明原因，而不是只显示"未获取到"
  if(r.noData){
    html+='<div class="empty" style="text-align:left;line-height:1.9"><b>未匹配到该主体（不是"有问题"，是本模块覆盖不到）</b><br>'
      + esc(r.noDataReason||'') + '<br><span class="sub">'+esc(r.coverageNote||'')+'</span></div>';
    html+='<div style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="https://www.gsxt.gov.cn/index.html">去国家企业信用信息公示系统查</a> '
      + '<a class="btn" target="_blank" rel="noopener" href="http://www.cninfo.com.cn/">去巨潮资讯查公告</a></div>';
    html+='</div>';
    return html;
  }
  var g=r.reg;
  if(g){
    var items=[];
    if(g.legalPerson) items.push(['法定代表人',g.legalPerson]);
    if(r.actualController) items.push(['实际控制人',r.actualController+(r.controllerSource?(' <span class="res">来源：'+esc(r.controllerSource)+'</span>'):'')]);
    if(g.creditNo) items.push(['统一社会信用代码',g.creditNo]);
    if(g.regCapital) items.push(['注册资本',g.regCapital]);
    if(g.establishDate) items.push(['成立日期',g.establishDate]);
    if(g.companyType) items.push(['企业类型',g.companyType]);
    if(g.status) items.push(['登记状态',g.status]);
    if(g.authority) items.push(['登记机关',g.authority]);
    if(items.length){
      html+='<div class="metaGrid">';
      for(var i=0;i<items.length;i++){
        html+='<div class="metaItem"><div class="k">'+esc(items[i][0])+'</div><div class="v">'+items[i][1]+'</div></div>';
      }
      html+='</div>';
    }
  } else {
    html+='<div class="empty">未获取到登记信息（三源均未命中或未配置）。</div>';
  }
  html+='</div>';
  return html;
}

function renderShareholders(r){
  var sub='';
  if(r.shareholderSource){ sub='数据源：'+r.shareholderSource+(r.shareholderEndDate?' · 报告期 '+r.shareholderEndDate:''); }
  sub+='（一层直接持股，比例按数据源原样展示）';
  var html='<div class="card"><h3>大股东构成<span class="sub">'+esc(sub)+'</span></h3>';
  if(r.shareholders&&r.shareholders.length){
    html+='<table><tr><th style="width:34px;">#</th><th>股东名称</th><th style="width:90px;" class="r">持股比例</th><th style="width:110px;" class="r">持股数量</th><th style="width:130px;">认缴出资</th></tr>';
    for(var i=0;i<r.shareholders.length;i++){
      var s=r.shareholders[i];
      html+='<tr><td>'+(s.rank||i+1)+'</td>'
        +'<td><span class="nm">'+esc(s.name)+'</span></td>'
        +'<td class="r">'+(s.ratio!=null?esc(s.ratio)+'%':'—')+'</td>'
        +'<td class="r">'+(s.shares!==''&&s.shares!=null?esc(fmtShares(s.shares)):'—')+'</td>'
        +'<td>'+esc(s.subscribed||'—')+'</td></tr>';
    }
    html+='</table>';
  } else {
    html+='<div class="empty">未获取到股东数据。</div>';
  }
  html+='</div>';
  return html;
}

function renderPersonnel(r){
  var html='<div class="card"><h3>核心团队（董事长 / 法定代表人 / 董监高 / 主要人员）<span class="sub">多源交叉合并，共 '+(r.personnel?r.personnel.length:0)+' 人</span></h3>';
  // [整合新增] 来源说明 + AI 显著标注 + 每人的「查事迹」入口（人类要求：标明 AI、辨明来源、便于验证）
  var srcNote = r.personnelSource || '';
  var anyAI = /AI/.test(srcNote) || (r.personnel||[]).some(function(pp){ return /AI/.test((pp.sources||[]).join(' ')) || pp.aiKnowledge; });
  if(anyAI){
    html+='<div class="note warn" style="margin-bottom:10px"><b>⚠️ 标有 <span class="aiBadge">AI</span> 的人员来自 AI</b>：'
      + '由大模型依据公开报道或自身知识整理，<b>不是实时工商接口</b>，可能过时或不完整。'
      + '请点每个人后面的「查事迹 / 官方核对」自行验证；带<b>「已复核事实库」「东方财富F10」</b>等字样的条目来自具体数据源，可按来源名称追查。</div>';
  } else if(srcNote){
    html+='<div class="note" style="margin-bottom:10px">数据来源：<b>'+esc(srcNote)+'</b>（可据此复核）</div>';
  }
  if(r.personnel&&r.personnel.length){
    html+='<table><tr><th style="width:110px;">姓名</th><th>职务 / 头衔</th><th style="width:170px;">来源（可验证）</th><th style="width:230px;">搜索人员事迹</th></tr>';
    for(var i=0;i<r.personnel.length;i++){
      var p=r.personnel[i];
      var isTop=/董事长|法定代表/.test(p.position);
      var srcTxt=(p.sources||[]).join('；')||'（未标注来源）';
      var isAI=/AI/.test(srcTxt)||p.aiKnowledge;
      var q=encodeURIComponent(p.name+' '+(r.company||'')+' 履历 经历');
      html+='<tr><td><span class="nm">'+esc(p.name)+'</span>'+(isTop?'<span class="badge top">核心</span>':'')+'</td>'
        +'<td>'+esc(p.position||'主要人员')+(p.resume?'<div class="resume">'+esc(p.resume)+'</div>':'')+'</td>'
        +'<td>'+(isAI?'<span class="aiBadge">AI</span> ':'')+'<span class="chip '+(isAI?'amber':'blue')+'">'+esc(srcTxt)+'</span></td>'
        +'<td class="acts">'
        +   '<a class="abtn" target="_blank" rel="noopener" href="https://cn.bing.com/search?q='+q+'">🔍 必应</a>'
        +   '<a class="abtn" target="_blank" rel="noopener" href="https://www.baidu.com/s?wd='+q+'">🔍 百度</a>'
        +   '<a class="abtn" target="_blank" rel="noopener" href="https://www.gsxt.gov.cn/index.html">🏛 官方核对</a>'
        + '</td></tr>';
    }
    html+='</table>';
  } else {
    html+='<div class="empty">未获取到人员数据（未上市且无公开报道的公司覆盖有限）。</div>';
  }
  html+='</div>';
  return html;
}

function renderChannels(r){
  var html='<div class="card"><h3>数据渠道状态<span class="sub">单渠道失败不影响整体结果</span></h3>';
  var c=r.channels||[];
  var conf=r.mcpConfigured||{};
  if(!conf.qcc&&!conf.shuidi&&!conf.tyc){
    html+='<div class="note warn">未配置任何 MCP Token：当前仅使用公开兜底渠道（东方财富F10/公开索引/AI记忆库），覆盖 A 股最全。在项目根目录放 <b>mcp.local.json</b>（含 qcc/shuidi/tyc 的 token）即可启用三源工商数据。</div>';
  }
  if(!c.length && !(r.aiFallback&&r.aiFallback.used)){ html+='<div class="empty">无渠道记录。</div>'; }
  for(var i=0;i<c.length;i++){
    var ch=c[i];
    var label=ch.tool||'';
    html+='<span class="chan '+esc(ch.status)+'"><i></i>'+esc(ch.source)+' · '+esc(label)+(ch.note?' <span>'+esc(ch.note)+'</span>':'')+'</span>';
  }
  if(r.aiFallback&&r.aiFallback.used){
    html+='<span class="chan ok"><i></i>AI 记忆库 · 大模型自身知识 <span>联网未命中时兜底（非实时，可能过时）</span></span>';
  } else if(r.aiFallback&&r.aiFallback.error){
    html+='<span class="chan failed"><i></i>AI 记忆库 <span>'+esc(r.aiFallback.error)+'</span></span>';
  }
  html+='</div>';
  return html;
}

function render(r){
  var el=document.getElementById('result');
  el.style.display='block';
  var html='';
  html+='<div class="card" style="border-color:var(--line2);"><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;">'
    +'<span style="font-size:20px;font-weight:500;">'+esc(r.company)+'</span>'
    +'<span style="font-size:12px;color:var(--tx3);">透视耗时 '+(r.elapsedMs/1000).toFixed(1)+'s · '+new Date(r.analyzedAt).toLocaleString('zh-CN')+'</span>'
    +'</div>';
  if(r.aiFallback && r.aiFallback.used){
    html+='<div style="margin-top:12px;background:var(--amber-bg);border:1px solid var(--amber-line);border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.7;color:var(--amber);">'
      +'<b>⚠️ 本结果主要由「AI 记忆库」生成</b>：联网渠道未能查到该公司的实时数据，以下信息来自大模型自身知识（可能过时或不完整，且无法像工商接口那样保证 T+0 准确）。'
      +(r.aiFallback.note?(' '+esc(r.aiFallback.note)):'')
      +'</div>';
  }
  html+='</div>';
  html+=renderReg(r);
  html+=renderPersonnel(r);
  html+=renderShareholders(r);
  html+=renderChannels(r);
  el.innerHTML=html;
  window.scrollTo(0,0);
}

loadConfig();
