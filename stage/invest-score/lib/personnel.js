'use strict';

// 人员透视聚合层：
// 输入任意公司（科技/食品/娱乐…均可），输出董事长、法定代表人、大股东、核心成员的
// 完整名单 + 每人详细档案（职务、持股、任期、简历摘要、知名人物识别、精英判定）。
// 数据源（三级，全部带降级）：
//   1) 天眼查/企查查/水滴信用 MCP（registry.fetchRegistry）
//   2) 东方财富 F10 股东研究 + 高管名单（含简历）
//   3) 公开新闻检索（人物关键词兜底）
// 网上查无资料时：回退内置知名人物知识库（KNOWN_ELITES 扩展版）

const { fetchRegistry } = require('./registry');
const { searchNews, searchNewsBaidu } = require('./sources');

// 人物专属检索（百度优先：百度对中文人名查询质量最高；必应对人名易漂移到词典噪声）
async function searchPersonNews(personName, company) {
  const queries = company
    ? ['"' + personName + '" ' + company + ' 董事长 简历', '"' + personName + '" ' + company + ' 高管']
    : ['"' + personName + '" 简历 职务'];
  for (const q of queries) {
    try {
      const r = await searchNewsBaidu(q, 7000);
      if (r && r.length > 0) return r.slice(0, 6);
    } catch (e) { /* 换下一个 query */ }
  }
  try {
    return (await searchNews('"' + personName + '" ' + (company || ''), 7000)).slice(0, 6);
  } catch (e) {
    return [];
  }
}

// 内置知名人物知识库（Agent 自有数据库）：覆盖科技/互联网/消费/食品/新能源/医药/娱乐/传媒/地产/金融/农牧/物流
// 说明：本库即用户所说的"Agent 自己的数据库"——由 AI 的公开知识沉淀而成，线上渠道查无资料时作为最后判定依据
const KNOWN_PEOPLE_DB = {
  // 科技/互联网
  '雷军': { title: '小米集团创始人兼董事长', background: '武汉大学校友，金山软件前董事长，天使投资人，顺为资本创始人' },
  '马云': { title: '阿里巴巴集团创始人', background: '前英语教师，1999 年创立阿里巴巴，曾长期担任中国首富' },
  '马化腾': { title: '腾讯公司创始人兼董事会主席', background: '深圳大学计算机专业，1998 年创立腾讯，QQ 与微信缔造者' },
  '刘强东': { title: '京东集团创始人兼董事长', background: '中国人民大学，1998 年中关村起家，自建物流体系' },
  '张一鸣': { title: '字节跳动创始人', background: '南开大学，先后创办酷讯、九九房，2012 年创立字节跳动（抖音/今日头条）' },
  '王兴': { title: '美团创始人兼董事长', background: '清华大学，校内网/饭否/美团连续创业者' },
  '李彦宏': { title: '百度创始人兼董事长', background: '北京大学，美国布法罗纽约州立大学硕士，搜索引擎专家' },
  '丁磊': { title: '网易公司创始人兼 CEO', background: '电子科技大学，1997 年创立网易，邮箱与游戏业务奠基人' },
  '周鸿祎': { title: '三六零公司创始人兼董事长', background: '西安交通大学，3721/奇虎 360 创始人，网络安全领域代表人物' },
  '黄峥': { title: '拼多多创始人', background: '浙江大学，Google 前员工，2015 年创立拼多多' },
  '张朝阳': { title: '搜狐公司创始人兼董事局主席', background: '清华大学本科，美国麻省理工学院博士，中国互联网早期代表人物' },
  '王小川': { title: '搜狗前 CEO，百川智能创始人', background: '清华大学计算机系，搜狗输入法/搜索引擎缔造者，大模型创业者' },
  '陈睿': { title: '哔哩哔哩董事长兼 CEO', background: '成都信息工程大学，猎豹移动联合创始人，2009 年投资并后掌舵 B 站' },
  '宿华': { title: '快手科技联合创始人（曾任 CEO）', background: '清华大学博士退学创业，前 Google 工程师，短视频普惠推动者' },
  '程一笑': { title: '快手科技董事长兼 CEO', background: '东北大学，GIF 快手原作者，快手技术奠基人' },
  '周源': { title: '知乎创始人兼 CEO', background: '东南大学硕士，前 IT 记者创业，中文问答社区缔造者' },
  '齐向东': { title: '奇安信科技集团董事长', background: '前 360 总裁，政企网络安全领军人物' },
  '求伯君': { title: '金山软件创始人', background: '国防科技大学，WPS 文字处理系统之父，被誉为中国第一程序员' },
  '沈亚': { title: '唯品会创始人兼 CEO', background: '上海铁道学院，连续创业，特卖电商模式开创者' },
  // 新能源车/电池
  '王传福': { title: '比亚迪创始人兼董事长', background: '中南大学冶金专业，北京有色金属研究总院硕士，电池专家出身' },
  '曾毓群': { title: '宁德时代创始人兼董事长', background: '上海交通大学，中科院物理所博士，动力电池 CATL 缔造者' },
  '何小鹏': { title: '小鹏汽车董事长兼 CEO', background: '华南理工大学，UC 浏览器创始人，后转型造车' },
  '李斌': { title: '蔚来创始人兼董事长', background: '北京大学，易车网/蔚来汽车/摩拜单车连续创业者' },
  '李想': { title: '理想汽车创始人兼 CEO', background: '高中毕业直接创业，泡泡网/汽车之家/理想汽车三度创业' },
  '程维': { title: '滴滴出行创始人兼 CEO', background: '北京化工大学，前阿里巴巴 B2B 区域经理，2012 年创立滴滴' },
  // 半导体/智能硬件
  '汪滔': { title: '大疆创新创始人兼 CEO', background: '香港科技大学，全球消费级无人机霸主缔造者' },
  '王来春': { title: '立讯精密创始人兼董事长', background: '富士康流水线女工出身创业，苹果产业链代工女王' },
  '虞仁荣': { title: '韦尔股份创始人兼董事长', background: '清华大学电子工程系，半导体分销与 CIS 芯片龙头缔造者' },
  '姜滨': { title: '歌尔股份创始人兼董事长', background: '北京航空航天大学，声学器件与 VR 代工龙头创始人' },
  // AI/软件
  '刘庆峰': { title: '科大讯飞创始人兼董事长', background: '中国科学技术大学博士，语音识别技术产业化第一人' },
  '印奇': { title: '旷视科技创始人兼 CEO', background: '清华大学姚班，计算机视觉独角兽创始者' },
  // 光伏/制造
  '钟宝申': { title: '隆基绿能董事长', background: '兰州大学，隆基单晶硅技术路线掌舵人' },
  '刘汉元': { title: '通威集团董事局主席', background: '渔业饲料起家，跨界高纯晶硅与太阳能电池龙头' },
  '高纪凡': { title: '天合光能创始人兼董事长', background: '南京大学，光伏组件全球出货头部企业缔造者' },
  // 汽车
  '李书福': { title: '吉利控股集团董事长', background: '冰箱/摩托车/汽车连续创业，收购沃尔沃的中国车企第一人' },
  '魏建军': { title: '长城汽车董事长', background: '1990 年接手长城工业，SUV 销量之王缔造者' },
  // 消费/食品/乳业
  '钟睒睒': { title: '农夫山泉创始人兼董事长', background: '记者出身，1996 年创立农夫山泉，养生堂系掌门人' },
  '宗庆后': { title: '娃哈哈集团创始人', background: '42 岁蹬三轮起家，饮料行业传奇' },
  '董明珠': { title: '珠海格力电器董事长', background: '1990 年加入格力，从业务员成长为格力铁娘子' },
  '方洪波': { title: '美的集团董事长兼总裁', background: '华东师范大学历史系，1992 年加入美的，职业经理人典范' },
  '曹德旺': { title: '福耀玻璃创始人兼董事长', background: '汽车玻璃全球第一，慈善捐股第一人' },
  '张瑞敏': { title: '海尔集团创始人', background: '中国海洋大学，1984 年接手青岛电冰箱总厂，砸冰箱质量传奇' },
  '庞康': { title: '海天味业董事长兼总裁', background: '1982 年加入海天（前身佛山酱油厂），调味品行业第一股掌舵人' },
  '潘刚': { title: '伊利集团董事长兼总裁', background: '内蒙古农业大学，1992 年加入伊利，液态奶业务奠基人' },
  '卢敏放': { title: '蒙牛集团董事长', background: '乳业职业经理人代表，达能/蒙牛高层管理经历' },
  '冷友斌': { title: '中国飞鹤董事长', background: '乳制品行业深耕三十余年，国产奶粉高端化领军者' },
  // 医药/医疗
  '孙飘扬': { title: '恒瑞医药创始人', background: '中国药科大学，从药厂车间技术员成长为创新药一哥掌门' },
  '李革': { title: '药明康德创始人兼董事长', background: '北京大学化学系，美国哥伦比亚大学博士，医药外包 CXO 产业开创者' },
  '李西廷': { title: '迈瑞医疗创始人兼董事长', background: '中国科学技术大学，医疗器械国产替代领军者' },
  // 农牧
  '刘永好': { title: '新希望集团董事长', background: '四川工程学院，四兄弟创业，中国民营农牧龙头缔造者' },
  '秦英林': { title: '牧原股份创始人兼董事长', background: '河南农业大学，从 22 头猪养起的中国猪王' },
  // 物流/出行/旅游
  '王卫': { title: '顺丰控股创始人兼董事长', background: '1993 年创立顺丰，高端快递直营模式开创者' },
  '赖梅松': { title: '中通快递创始人兼董事长', background: '桐庐帮快递代表人物，电商件快递规模第一缔造者' },
  '梁建章': { title: '携程集团联合创始人兼董事局主席', background: '复旦大学少年班，美国斯坦福大学博士，人口经济学研究者' },
  // 服饰/餐饮连锁
  '丁世忠': { title: '安踏集团董事局主席', background: '晋江鞋匠家庭出身，17 岁北上卖鞋，多品牌体育用品集团缔造者' },
  '李宁': { title: '李宁公司创始人', background: '体操王子，奥运多金得主，退役后创立国产运动第一品牌' },
  '贾国龙': { title: '西贝餐饮集团董事长', background: '1988 年起步餐饮，西北菜连锁品牌缔造者' },
  // 地产/金融/投资
  '郁亮': { title: '万科集团董事会主席', background: '北京大学国际经济专业，1990 年加入万科，职业经理人代表' },
  '吴亚军': { title: '龙湖集团创始人', background: '西北工业大学记者出身创业，民营地产 A+W 双平台架构设计者' },
  '杨惠妍': { title: '碧桂园董事会主席', background: '杨国强之女，曾长期位居中国女首富' },
  '马明哲': { title: '中国平安创始人兼董事长', background: '1988 年创立平安保险，综合金融集团缔造者' },
  '沈南鹏': { title: '红杉中国创始合伙人', background: '上海交通大学/耶鲁大学，携程/如家联合创始人，中国最顶级风险投资人' },
  '张磊': { title: '高瓴集团创始人', background: '中国人民大学/耶鲁大学，价值投资长期主义倡导者，重仓中国消费与科技' },
  // 娱乐/传媒
  '王长田': { title: '光线传媒创始人兼董事长', background: '复旦大学新闻系，中国民营影视传媒龙头缔造者' },
  '于冬': { title: '博纳影业创始人兼董事长', background: '北京电影学院，民营发行公司第一人' },
  '王中军': { title: '华谊兄弟创始人', background: '1994 年创立华谊兄弟，中国影视第一股缔造者' }
};

// 人名 → 知名人物档案查询（Agent 自有数据库）
function lookupKnownPerson(name) {
  if (!name) return null;
  if (KNOWN_PEOPLE_DB[name]) {
    return { hit: true, title: KNOWN_PEOPLE_DB[name].title, background: KNOWN_PEOPLE_DB[name].background, source: 'Agent内置人物知识库' };
  }
  return null;
}

// 判断股东名是否为自然人（非机构）
function isNaturalPerson(name) {
  if (!name) return false;
  if (!/^[\u4e00-\u9fa5]{2,4}$/.test(String(name).trim())) return false;
  return !/(公司|企业|中心|基金|资本|投资|证券|银行|保险|信托|合伙|集团|控股|管理|咨询|工作室|研究所|大学|学院|产品|账户|计划|组合|结算|信托)/.test(name);
}

// 从简历文本中提取亮点句（含大厂/资历词的句子）
function resumeHighlights(resume, maxLen) {
  if (!resume) return [];
  const segs = String(resume).split(/(。|；|;|\n)/).map(function (s) { return s.trim(); }).filter(Boolean);
  const KEY = /(曾任|曾任职|历任|现任|董事长|创始人|CEO|首席|总裁|总经理|博士|硕士|教授|高级工程师|院士|获奖|荣誉|专家|资深)/;
  return segs.filter(function (s) { return KEY.test(s); }).slice(0, 3).map(function (s) { return s.slice(0, (maxLen || 120)); });
}

// 主入口：构建公司人员透视档案
async function buildPersonnelProfile({ company, legalPerson, stock }) {
  const channels = [];
  const notes = [];

  // 1) 三级数据源聚合（MCP → 东财F10 → 公开索引兜底）
  const reg = await fetchRegistry({ company, stock });
  channels.push.apply(channels, reg.channels);
  for (const n of reg.notes) notes.push(n);

  // 2) 结构化四类角色
  const board = [];      // 董事长 / 董事
  const legal = null;    // 法定代表人
  const majors = [];     // 大股东（自然人）
  const coreTeam = [];   // 核心成员（高管）
  const roleSet = {};    // name → 职务集合

  const regLp = (reg.reg && reg.reg.legalPerson) || null;

  for (const p of reg.personnel) {
    if (!p.name) continue;
    const pos = p.position || '主要人员';
    roleSet[p.name] = roleSet[p.name] || [];
    roleSet[p.name].push(pos);
    const entry = {
      name: p.name,
      positions: [pos],
      tenure: p.tenure || '',
      resume: p.resume || '',
      highlights: resumeHighlights(p.resume)
    };
    if (/董事长/.test(pos) && !board.some(function (b) { return b.name === p.name; })) board.push(entry);
    else coreTeam.push(entry);
  }
  // F10 高管简历合并去重
  for (const p of coreTeam.concat(board)) {
    const dup = reg.personnel.find(function (x) { return x.name === p.name && x.resume && !p.resume; });
    if (dup) { p.resume = dup.resume; p.highlights = resumeHighlights(p.resume); }
  }

  // 法定代表人（工商登记优先，其次高管名单标注）
  const legalPersonFinal = regLp || (reg.personnel.find(function (p) { return /法定代表/.test(p.position || ''); }) || {}).name || null;

  // 大股东：前 10 名中的自然人 + 机构分列
  const allShareholders = reg.shareholders || [];
  const natShareholders = allShareholders.filter(function (s) { return isNaturalPerson(s.name); }).slice(0, 8);
  const orgShareholders = allShareholders.filter(function (s) { return !isNaturalPerson(s.name); }).slice(0, 5);
  for (const s of natShareholders) {
    roleSet[s.name] = roleSet[s.name] || [];
    roleSet[s.name].push('大股东' + (s.ratio != null ? '（持股 ' + s.ratio + '%）' : ''));
    if (!board.some(function (b) { return b.name === s.name; }) && !coreTeam.some(function (c) { return c.name === s.name; })) {
      board.push({ name: s.name, positions: ['大股东'], tenure: '', resume: '', highlights: [] });
    }
  }
  if (reg.actualController) {
    notes.push('实际控制人：' + reg.actualController + '。');
  }

  // 3) 汇总全部自然人 → 逐人补档案（知名库 / 新闻检索）
  const allNames = [];
  const push = function (n, role) {
    if (!n || allNames.some(function (x) { return x.name === n; })) return;
    allNames.push({ name: n, role });
  };
  push(legalPersonFinal, '法定代表人');
  for (const b of board) push(b.name, (b.positions || []).join('/'));
  for (const c of coreTeam) push(c.name, (c.positions || []).join('/'));

  // 兜底通道：工商/F10 全空（港股/美股/未上市常见）→ 公司级名单检索
  // 搜"公司名 创始人 董事长 高管 名单"，从标题中提取内置库人名与高频人名
  if (allNames.length === 0) {
    channels.push({ name: '人员名单检索', status: 'ok', note: '工商渠道无数据，启动公开名单检索兜底' });
    try {
      const listNews = await searchNewsBaidu(company + ' 创始人 董事长 法定代表人 高管 核心团队 名单', 8000);
      const titles = listNews.map(function (x) { return x.title; });
      // ① 内置库名字扫描：29 位知名人物在名单报道中出现即收录（公司关联放宽到品牌前 2 字）
      const brand2 = company.replace(/（[^）]*）|\([^)]*\)/g, '').slice(0, 2);
      for (const kn of Object.keys(KNOWN_PEOPLE_DB)) {
        const hit = titles.find(function (t) { return t.includes(kn) && t.includes(brand2); });
        if (hit) push(kn, '公开报道核心人物');
      }
      // ② "头衔+人名"结构提取（创始人/董事长/CEO：张三）——排除头衔词自身被当人名
      const SURNAME = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林罗高郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤';
      const TITLE_RE = new RegExp('(创始人|董事长|法定代表人|CEO|首席执行官|总裁|总经理|首席|副总裁|合伙人)[:：、\\s]*([' + SURNAME + '][' + SURNAME + '\\u4e00-\\u9fa5]{1,2})', 'g');
      const ROLE_WORDS = '创始人董事长法定代表人首席执行官总裁总经理首席副总裁合伙人高管董事';
      for (const t of titles) {
        let m;
        while ((m = TITLE_RE.exec(t)) !== null) {
          const nm = m[2];
          if (nm.length >= 2 && nm.length <= 3 && ROLE_WORDS.indexOf(nm) === -1) push(nm, m[1] + '（公开报道）');
        }
      }
      notes.push('工商渠道未返回人员数据，已通过公开名单报道识别 ' + allNames.length + ' 位人物。');
    } catch (e) {
      notes.push('公开名单检索失败：' + e.message);
    }
  }

  // 网上查无资料的人 → 内置知识库兜底 + 新闻兜底
  const profiles = [];
  for (const item of allNames.slice(0, 20)) {
    const n = item.name;
    const known = lookupKnownPerson(n);
    const boardEntry = board.find(function (b) { return b.name === n; }) || {};
    const coreEntry = coreTeam.find(function (c) { return c.name === n; }) || {};
    const resume = boardEntry.resume || coreEntry.resume || '';
    const highlight = (boardEntry.highlights || []).concat(coreEntry.highlights || []).slice(0, 2);

    let onlineTitles = [];
    let searchHit = false; // 线上搜索是否有结果（区分"网上查不到"）
    if (!known && (!resume || highlight.length === 0)) {
      // 工商/F10 渠道资料不足 → 人物专属检索兜底（百度优先，人名引号精确匹配）
      try {
        const r = await searchPersonNews(n, company);
        onlineTitles = r.slice(0, 4).map(function (x) { return x.title; });
        searchHit = onlineTitles.length > 0;
      } catch (e) { /* 检索失败不致命 */ }
    } else {
      searchHit = true; // 有简历/亮点 = 线上渠道已命中
    }

    // 数据来源标记（用户 2026-10-02 指定）：区分 线上搜索 / Agent内置库 两条通道
    const dataSources = [];
    if (resume) dataSources.push('工商登记简历（企查查/天眼查/爱企查/东财F10）');
    if (highlight.length > 0) dataSources.push('简历亮点提取');
    if (onlineTitles.length > 0) dataSources.push('互联网新闻检索（百度/必应）');
    if (known) dataSources.push('Agent 内置人物知识库');

    profiles.push({
      name: n,
      roles: (roleSet[n] && roleSet[n].length ? roleSet[n] : [item.role]).filter(Boolean),
      isLegalPerson: n === legalPersonFinal,
      isChairman: (roleSet[n] || []).some(function (r) { return /董事长/.test(r); }) || /董事长/.test((known || {}).title || ''),
      shareholding: (natShareholders.find(function (s) { return s.name === n; }) || {}).ratio != null
        ? (natShareholders.find(function (s) { return s.name === n; }).ratio + '%') : null,
      tenure: boardEntry.tenure || coreEntry.tenure || '',
      resume: resume.slice(0, 300),
      highlights: highlight,
      known: known,
      onlineTitles: onlineTitles,
      searchHit,
      dataSources,
      // 网上完全查无资料（searchHit=false）→ 标记"已回退 Agent 内置库寻找"
      fellBackToAgentDB: !searchHit && !!known,
      dataSufficient: !!(known || resume || highlight.length > 0 || onlineTitles.length > 0)
    });
  }

  channels.push({
    name: '内置人物知识库', status: profiles.some(function (p) { return p.known; }) ? 'ok' : 'empty',
    note: profiles.filter(function (p) { return p.known; }).length + ' 人命中 Agent 内置知名人物库（' + Object.keys(KNOWN_PEOPLE_DB).length + ' 人收录）'
  });

  return {
    company,
    legalPerson: legalPersonFinal,
    chairman: board.filter(function (b) { return (b.positions || []).some(function (x) { return /董事长/.test(x); }); }),
    majorShareholders: natShareholders,
    orgShareholders,
    actualController: reg.actualController,
    coreTeam,
    profiles,
    channels,
    notes,
    source: reg.source,
    sourceNote: reg.sourceNote
  };
}

module.exports = { buildPersonnelProfile, lookupKnownPerson, isNaturalPerson, KNOWN_PEOPLE_DB };
