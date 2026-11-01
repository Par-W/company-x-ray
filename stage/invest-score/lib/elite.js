'use strict';

// 行业精英判定 v2：
// 不再只盯法人，而是从企查查/爱企查/新闻媒体等公开报道中提取
// 该公司**常出现的核心人物名**（老板/核心员工/股东），再逐人判定背景：
//   1) 曾在大厂工作（大厂名单 + 履历词）
//   2) 股东入股过很赚钱的项目（投资/入股 + 知名成功项目词）
//   3) 知名企业家库精确命中（保留，最强证据）

const KNOWN_ELITES = {
  '雷军': '小米集团创始人',
  '王传福': '比亚迪集团创始人',
  '曾毓群': '宁德时代创始人',
  '任正非': '华为创始人',
  '董明珠': '珠海格力电器董事长',
  '马云': '阿里巴巴创始人',
  '马化腾': '腾讯创始人',
  '张一鸣': '字节跳动创始人',
  '刘强东': '京东集团创始人',
  '李彦宏': '百度创始人',
  '曹德旺': '福耀玻璃创始人',
  '钟睒睒': '农夫山泉创始人',
  '王兴': '美团创始人',
  '丁磊': '网易创始人',
  '周鸿祎': '三六零创始人',
  '李书福': '吉利控股创始人',
  '俞敏洪': '新东方创始人',
  '梁稳根': '三一集团创始人',
  '张瑞敏': '海尔集团创始人',
  '李东生': 'TCL 创始人',
  '方洪波': '美的集团董事长',
  '何小鹏': '小鹏汽车创始人',
  '李斌': '蔚来创始人',
  '李想': '理想汽车创始人',
  '黄峥': '拼多多创始人',
  '张朝阳': '搜狐公司创始人',
  '陈睿': '哔哩哔哩董事长兼 CEO',
  '程维': '滴滴出行创始人',
  '汪滔': '大疆创新创始人',
  '刘庆峰': '科大讯飞创始人',
  '李革': '药明康德创始人',
  '李西廷': '迈瑞医疗创始人',
  '孙飘扬': '恒瑞医药创始人',
  '秦英林': '牧原股份创始人',
  '刘永好': '新希望集团董事长',
  '王卫': '顺丰控股创始人',
  '梁建章': '携程集团联合创始人',
  '丁世忠': '安踏集团董事局主席',
  '李宁': '李宁公司创始人',
  '魏建军': '长城汽车董事长',
  '郁亮': '万科集团董事会主席',
  '马明哲': '中国平安创始人',
  '沈南鹏': '红杉中国创始合伙人',
  '张磊': '高瓴集团创始人',
  '王长田': '光线传媒创始人',
  '于冬': '博纳影业创始人',
  '王来春': '立讯精密创始人',
  '宗庆后': '娃哈哈集团创始人',
  '潘刚': '伊利集团董事长',
  '庞康': '海天味业董事长'
};

// 大企业名单：曾在此类公司任职、或现任职于此类公司（含被查公司本身）→ 计"大厂履历"标记
// 覆盖互联网/科技/新能源/消费/医药/金融/制造等各行业公认龙头
const BIG_COMPANIES = /(阿里巴巴|阿里|蚂蚁集团|腾讯|字节跳动|抖音|百度|华为|小米|美团|京东|拼多多|网易|滴滴|快手|携程|宁德时代|比亚迪|京东方|中芯国际|大疆|顺丰|隆基绿能|隆基|光伏龙头|贵州茅台|五粮液|泸州老窖|农夫山泉|伊利|蒙牛|海天|格力|美的|海尔|三一重工|福耀玻璃|恒瑞医药|药明康德|迈瑞医疗|中国平安|招商银行|工商银行|建设银行|中信证券|微软|谷歌|Google|Apple|苹果|亚马逊|Meta|Facebook|OpenAI|英伟达|特斯拉|高通|台积电|三星|宝马|奔驰|丰田)/;

// 履历词：新闻标题中出现「人名 + 履历词 + 大厂」结构
const CAREER_RE = /(曾就职|曾任职|前|出身|加入过|供职|来自于|来自|创始人|联合创始人|董事长|CEO|首席|总裁|总经理|合伙人|投资人|董事|高管|资深|专家|工程师|总监)/;

// 赚钱项目词：股东/投资方入股过的成功项目信号
const PROFIT_PROJECT_RE = /(独角兽|估值.*亿|上市|IPO|回报|翻了|倍增|领投|跟投|入股|投资了|投出|明星项目|爆款|市值)/;
const INVESTOR_RE = /(股东|投资方|投资人|资本|基金|领投|跟投|入股)/;

const TITLE_RE = /(创始人|董事长|CEO|首席执行官|首席科学家|总工程师|总经理|实控人|实际控制人|院士|合伙人|投资人|董事|总裁|资深专家|行业专家)/;

// 常见中文姓氏首字表（提高人名提取准确度）
const SURNAME = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林罗高郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤';

// 从报道标题集合中提取高频人名（2-4 字中文名，出现 >=2 次）
function extractKeyPeople(news, company, maxPeople) {
  const freq = {};
  const sample = {};
  const companyClean = String(company || '').replace(/（[^）]*）|\([^)]*\)|有限|股份|责任|公司|集团/g, '');

  for (const it of (news || [])) {
    const t = it.title || '';
    // 人名启发式：姓氏开头 + 2-4 字 + 后面紧跟动作/头衔边界词
    const re = new RegExp('[' + SURNAME + '][' + SURNAME + '\\u4e00-\\u9fa5]{1,2}(?=(的|曾|将|已|是|在|与|和|接受|表示|认为|带领|创立|创办|宣布|出任|担任|离职|加盟|介绍|：|:|，|,|。|$))', 'g');
    let m;
    while ((m = re.exec(t)) !== null) {
      const name = m[0];
      if (name.length < 2 || name.length > 3) continue;
      if (companyClean && (name.includes(companyClean.slice(0, 2)) || companyClean.includes(name))) continue;
      if (/(中国|北京|上海|深圳|广州|杭州|今日|未来|市场|行业|公司|企业|产品|服务|技术|平台|用户|消费者|投资|资本|任职|记者|媒体|网友|大家|我们|他们|自己|公司|团队)/.test(name)) continue;
      freq[name] = (freq[name] || 0) + 1;
      if (!sample[name]) sample[name] = [];
      if (sample[name].length < 3) sample[name].push(t);
    }
  }
  // 排序取出现最多的 N 个人名
  return Object.keys(freq)
    .sort(function (a, b) { return freq[b] - freq[a]; })
    .slice(0, maxPeople || 5)
    .map(function (name) {
      return { name, count: freq[name], samples: sample[name] };
    });
}

// 单人双标记判定（v3）：
//   标记1 大厂履历：该人相关报道中「人名 + 履历词 + 大厂」共现、其专属检索（dossier）命中，
//                   或其现任职公司本身即大企业（现任大企业 = 大厂，同一标记）
//   标记2 专业提及：该人在公开网络中有专业领域提及（技术/专利/行业/专访/获奖等），
//                   或在本次抓取报道中独立出现 ≥2 次（媒体存在感）
// 集齐两标 → 该人记为"精英人物"；公司有 ≥1 名精英人物 → 公司有精英背景
function judgePersonMarkers(name, news, dossier, currentCompany) {
  const hitNews = (news || []).filter(function (it) { return (it.title || '').includes(name); });
  const dTitles = (dossier && dossier.titles) || [];
  const markers = [];

  // 标记1：大厂履历（含"现任职公司即大企业"通道）
  let m1 = { hit: false, reason: '未检索到「' + name + '」与大厂任职相关的公开记录' };
  // 通道 A：现任公司本身是大企业 → 任职者直接视作有"大厂"属性
  const cur = String(currentCompany || '').trim();
  if (cur && BIG_COMPANIES.test(cur)) {
    m1 = { hit: true, reason: '「' + name + '」现任职于' + (cur.match(BIG_COMPANIES) || [''])[0] + '（现任企业属大企业，直接计为大厂履历）' };
  }
  // 通道 B：报道/检索中出现「人名 + 履历词 + 大厂」
  if (!m1.hit) {
    for (const t of hitNews.concat(dTitles.map(function (x) { return { title: x }; }))) {
      const title = t.title || t;
      if (BIG_COMPANIES.test(title) && CAREER_RE.test(title)) {
        m1 = { hit: true, reason: '「' + name + '」有' + (title.match(BIG_COMPANIES) || [''])[0] + '相关任职/履历报道（' + title.slice(0, 40) + '…）' };
        break;
      }
    }
  }
  markers.push({ id: 'big_tech', label: '大厂履历', hit: m1.hit, reason: m1.reason });

  // 标记2：专业提及
  const PRO_RE = /(专利|技术|研发|论文|专家|行业|标准|专访|演讲|获奖|荣誉|获评|获选|出席|发表| author|评测|测评)/;
  const distinctSources = {};
  for (const it of hitNews) { distinctSources[it.url || it.title] = true; }
  let m2 = { hit: false, reason: '公开网络中未检索到「' + name + '」的专业领域提及' };
  // 专业提及：dossier 检索以人名为 query 锚定，其标题无需再次 includes(name)；
  // company news 主表中的标题仍要求含人名（避免把别人的专业报道算进来）
  const proTitle = hitNews.map(function (it) { return it.title; }).find(function (t) {
    return t.includes(name) && PRO_RE.test(t);
  }) || dTitles.find(function (t) { return PRO_RE.test(t); });
  if (proTitle) {
    m2 = { hit: true, reason: '「' + name + '」有专业领域公开提及（' + proTitle.slice(0, 40) + '…）' };
  } else if (Object.keys(distinctSources).length >= 2) {
    m2 = { hit: true, reason: '「' + name + '」在 ' + Object.keys(distinctSources).length + ' 个独立公开报道中被提及（媒体存在感达标）' };
  }
  markers.push({ id: 'pro_mention', label: '专业提及', hit: m2.hit, reason: m2.reason });

  const both = markers.every(function (m) { return m.hit; });
  // 每个标记标注来源渠道（用户 2026-10-02 指定：判定前提是数据来自互联网搜索 /
  // 企查查/天眼查/爱企查/腾讯自选股/水滴信用等线上渠道，或 Agent 内置数据库兜底）
  const sources = [];
  if (hitNews.length > 0) sources.push('互联网新闻检索（必应/百度/搜狗）');
  if (dTitles.length > 0) sources.push('人物专属联网检索');
  return { markers, isElite: both, onlineHit: sources.length > 0, onlineSources: sources };
}

// 主入口：checkElite v4（角色制 + 内置库兜底）
// 候选池（用户 2026-10-02 指定）：董事长 / 法定代表人 / 大股东 / 核心成员 / 实际控制人 / 报道高频人物
// roleMap: { 人名: [角色...] }，由 analyze 层从工商数据（天眼查/企查查/爱企查 MCP + 东财F10 + 公开索引）构建
// 网上查无数据时：回退内置精英知识库（KNOWN_ELITES 24 人 + 大厂名单启发式）做最后判定
function checkElite({ legalPerson, company, news, seed, dossiers, coreMembers, roleMap, shareholders, actualController }) {
  const lp = String(legalPerson || '').trim();
  const rolesOf = function (n) { return (roleMap && roleMap[n]) || []; };
  const dossierOf = function (n) { return (dossiers && dossiers[n]) || null; };

  // 快路径：演示库（仅降级模式）
  if (seed && seed.elite) {
    return {
      isElite: !!seed.elite.isElite,
      source: '演示数据',
      reason: seed.elite.reason,
      people: [],
      keyPeople: []
    };
  }

  // 主路径：核心成员 ∪ 大股东 ∪ 实控人 ∪ 报道高频人名 ∪ 法人 → 逐人判定
  const NOISE_RE = /(蜂窝|百科|官网|旅游|攻略|省|市|县|银行|大学|集团$|基金|证券|日报|晚报|都市报|协会|学会)/;
  const coreList = Array.isArray(coreMembers) ? coreMembers : [];
  const keyPeople = extractKeyPeople(news, company, 3).filter(function (p) { return !NOISE_RE.test(p.name); });
  const candidates = [];
  const seen = {};
  // 角色优先序：董事长 > 实控人 > 法定代表人 > 大股东 > 核心成员 > 报道高频人物
  for (const cm of coreList) {
    if (!seen[cm.name]) {
      seen[cm.name] = true;
      candidates.push({ name: cm.name, count: 0, samples: cm.titles || [], role: (rolesOf(cm.name)[0] || ((cm.titles && cm.titles[0]) ? cm.titles[0].split('@')[0] : '核心成员')) });
    }
  }
  // 大股东（自然人，含持股比例）——analyze 层已过滤为纯人名
  for (const s of (shareholders || [])) {
    if (!seen[s.name]) {
      seen[s.name] = true;
      candidates.push({ name: s.name, count: 0, samples: [], role: '大股东' + (s.ratio != null ? '（持股 ' + s.ratio + '%）' : '') });
    }
  }
  // 实际控制人
  if (actualController && !seen[actualController]) {
    seen[actualController] = true;
    candidates.push({ name: actualController, count: 0, samples: [], role: '实际控制人' });
  }
  for (const p of keyPeople) {
    if (!seen[p.name]) {
      seen[p.name] = true;
      candidates.push({ name: p.name, count: p.count, samples: p.samples, role: '报道高频人物' });
    }
  }
  if (lp && !seen[lp]) {
    candidates.push({ name: lp, count: 0, samples: [], role: '法定代表人（工商核验）' });
  }

  const judged = [];
  let kbFallbackUsed = false;
  for (const p of candidates) {
    const dos = dossierOf(p.name);
    const isInternal = p.role !== '报道高频人物';
    const currentCompany = isInternal ? company : '';
    const jm = judgePersonMarkers(p.name, news, dos, currentCompany);
    const roles = rolesOf(p.name);

    // 前提规则（用户 2026-10-02 指定）：
    // 精英判定的双标记必须来自 ①互联网搜索/企查查/天眼查/爱企查/腾讯自选股/水滴信用等线上渠道，
    // 或 ②线上完全查无资料时回退 Agent 内置数据库。两者必居其一，缺一不判精英。
    let agentDbFallback = false;
    if (!jm.onlineHit) {
      // 线上全无数据 → Agent 内置数据库寻找
      if (KNOWN_ELITES[p.name]) {
        agentDbFallback = true;
        jm.markers = [
          { id: 'big_tech', label: '大厂履历', hit: true, reason: '互联网/工商渠道未查到「' + p.name + '」资料，回退 Agent 内置数据库：「' + p.name + '」为' + KNOWN_ELITES[p.name] },
          { id: 'pro_mention', label: '专业提及', hit: true, reason: 'Agent 内置数据库收录（公开常识级人物）' }
        ];
        jm.isElite = true;
      } else {
        // 内置库也无此人 → 保持未集齐，明确标注判定前提
        jm.markers = jm.markers.map(function (m) {
          return Object.assign({}, m, {
            reason: '互联网及各工商数据渠道均未检索到该人资料，Agent 内置数据库亦无记录——按规则不判定为精英（不排除信息未公开）'
          });
        });
        jm.isElite = false;
      }
    }
    if (agentDbFallback) kbFallbackUsed = true;

    judged.push({
      name: p.name,
      role: roles.length > 0 ? roles.join(' / ') : (p.role || ''),
      count: p.count,
      samples: p.samples,
      markers: jm.markers,
      isElite: jm.isElite,
      onlineHit: jm.onlineHit,
      onlineSources: jm.onlineSources || [],
      agentDbFallback,
      type: jm.isElite ? (agentDbFallback ? '精英人物（线上查无资料·Agent内置库判定）' : '精英人物（双标记齐全·线上渠道）') : (jm.onlineHit ? '未集齐双标记' : '线上与内置库均无资料'),
      reason: jm.markers.map(function (m) { return m.label + (m.hit ? '✔' : '✘') + '：' + m.reason; }).join('；'),
      dossierQueried: !!dos
    });
  }

  const anyElite = judged.some(function (p) { return p.isElite; });
  const eliteOnes = judged.filter(function (p) { return p.isElite; });

  return {
    isElite: anyElite,
    source: anyElite
      ? (kbFallbackUsed ? '工商角色逐人比对 + Agent内置库兜底' : '公开报道逐人双标记比对（含现任大企业通道）')
      : '双标记未命中',
    reason: anyElite
      ? '以下人员集齐「大厂履历 + 专业提及」双标记：' + eliteOnes.map(function (p) { return p.name + '（' + p.role + '）'; }).join('、')
      : '董事长/法人/大股东/核心成员均未集齐「大厂履历 + 专业提及」双标记（判定前提：资料须来自互联网搜索/企查查/天眼查/爱企查/腾讯自选股/水滴信用等线上渠道，或 Agent 内置数据库兜底；未检索到不等于不存在）',
    people: judged,
    keyPeople
  };
}

module.exports = { checkElite, judgePersonMarkers, KNOWN_ELITES, extractKeyPeople, BIG_COMPANIES, PROFIT_PROJECT_RE, INVESTOR_RE };
