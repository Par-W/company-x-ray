'use strict';

// 内置演示数据：仅在实时联网数据源不可用时作为降级使用。
// 页面会显著标注"演示模式"。上市公司条目不含法定代表人（工商信息以实时查询为准），
// 未上市公司为虚构演示主体，用于展示三档判定路径。

const LISTED = {
  '贵州茅台': {
    industry: '白酒 / 高端消费',
    dims: { finance: 96, product: 95, industry: 72, tech: 62, cost: 93, customers: 86, team: 82, brand: 98, litigation: 92, management: 92 },
    signals: {
      finance: ['演示设定：历史财报资产负债率长期低于 25%，账上现金充裕'],
      brand: ['演示设定：A 股市值长期居于前列，终端产品具备强定价权'],
      product: ['演示设定：核心产品长期供不应求，批价坚挺']
    }
  },
  '宁德时代': {
    industry: '动力电池 / 储能（新能源）',
    dims: { finance: 82, product: 85, industry: 88, tech: 85, cost: 78, customers: 90, team: 80, brand: 88, litigation: 88, management: 80 },
    signals: {
      customers: ['演示设定：绑定全球头部整车厂客户'],
      industry: ['演示设定：新能源赛道景气度高'],
      tech: ['演示设定：研发投入与专利储备居行业前列']
    }
  },
  '比亚迪': {
    industry: '新能源汽车 / 电子',
    dims: { finance: 75, product: 84, industry: 85, tech: 82, cost: 72, customers: 80, team: 85, brand: 85, litigation: 85, management: 78 },
    signals: {
      team: ['演示设定：创始人技术背景深厚，垂直整合执行力强'],
      product: ['演示设定：销量居新能源车企第一梯队']
    }
  },
  '隆基绿能': {
    industry: '光伏（新能源，处于产能过剩调整期）',
    dims: { finance: 45, product: 62, industry: 48, tech: 62, cost: 50, customers: 55, team: 62, brand: 72, litigation: 85, management: 50 },
    signals: {
      industry: ['演示设定：光伏行业阶段性供给过剩，产业链价格承压'],
      finance: ['演示设定：行业下行期盈利与现金流承压']
    }
  },
  '三六零': {
    industry: '互联网安全（软件）',
    dims: { finance: 62, product: 45, industry: 50, tech: 48, cost: 50, customers: 45, team: 50, brand: 55, litigation: 70, management: 40 },
    signals: {
      product: ['演示设定：主业增长乏力，商业化能力偏弱'],
      management: ['演示设定：近年净利润波动较大']
    }
  }
};

const UNLISTED = {
  '曦和光子科技有限公司': {
    legalPerson: '沈亦舟',
    industry: '光子芯片 / 激光雷达（硬科技）',
    elite: { isElite: true, source: '演示数据', reason: '演示设定：创始人为行业资深专家，核心团队来自头部光电企业' },
    dims: { product: 62, industry: 75, customers: 60, tech: 68, team: 60, finance: 48, cost: 45, brand: 40, litigation: 85, management: 55 },
    signals: {
      tech: ['演示设定：多项核心专利在手，技术路线自主'],
      finance: ['演示设定：研发投入大，账面现金偏紧'],
      industry: ['演示设定：所处赛道为政策与资本重点关注方向']
    }
  },
  '星澜动力（深圳）有限公司': {
    legalPerson: '陈志远',
    industry: '储能设备（新能源）',
    elite: { isElite: true, source: '演示数据', reason: '演示设定：核心团队出自行业头部企业，法人为行业资深工程师' },
    dims: { product: 55, industry: 70, customers: 48, tech: 58, team: 62, finance: 40, cost: 40, brand: 30, litigation: 80, management: 45 },
    signals: {
      finance: ['演示设定：融资节奏偏慢，现金流紧张'],
      brand: ['演示设定：品牌影响力局限于区域市场'],
      industry: ['演示设定：储能赛道景气，但竞争者众多']
    }
  },
  '蓝湾智能零售有限公司': {
    legalPerson: '高翔',
    industry: '智能零售（传统零售改造）',
    elite: { isElite: false, source: '演示数据', reason: '演示设定：无突出的行业背景记录' },
    dims: { product: 42, industry: 35, customers: 30, tech: 25, team: 30, finance: 38, cost: 35, brand: 20, litigation: 55, management: 28 },
    signals: {
      industry: ['演示设定：传统零售改造赛道天花板低'],
      litigation: ['演示设定：存在合同纠纷记录']
    }
  }
};

function normalizeName(name) {
  return String(name || '').trim();
}

function findSeed(company, type) {
  const table = type === 'listed' ? LISTED : UNLISTED;
  const input = normalizeName(company);
  for (const key of Object.keys(table)) {
    if (input === key || input.includes(key) || key.includes(input)) {
      return Object.assign({ name: key, type }, table[key]);
    }
  }
  return null;
}

module.exports = { findSeed, LISTED, UNLISTED };
