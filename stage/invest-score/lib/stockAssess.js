'use strict';

// 上市公司股票投资评估（知识规则引擎）
// 输入：quote（腾讯行情扩展字段）、finance（财报实数）、financeScored（财务维度分）
// 输出：valuationEstimate 估值判断 + risks 风险清单 + positives 加分项 + verdict 建议标签
// 规则基于通用价值投资常识（低估值+好财务=可投；高估值+劣财务=回避），全部为可解释的显式规则。

function assessStock({ quote, finance, financeScored, stock }) {
  const out = {
    applicable: !!(quote && quote.price),
    market: stock ? stock.market : null,
    code: stock ? stock.code : null,
    positives: [],
    risks: [],
    valuation: null,       // 'low' | 'fair' | 'high' | null
    valuationScore: null,  // 0-100，估值维度的知识分
    qualityScore: null,    // 0-100，财务质量知识分（复用 financeScored.finance）
    stockScore: null,      // 0-100 综合股票判断
    reasons: []
  };
  if (!out.applicable) return out;

  const pe = isFinite(quote.pe) ? quote.pe : null;
  const pb = isFinite(quote.pb) ? quote.pb : null;
  const mv = isFinite(quote.totalMv) ? quote.totalMv : null;
  const price = parseFloat(quote.price);
  const high = isFinite(quote.high52w) ? quote.high52w : null;
  const low = isFinite(quote.low52w) ? quote.low52w : null;

  // ---- 1) 估值判断（PE 为主，PB 辅助；亏损/负PE 单独处理） ----
  let vs = 50;
  if (pe !== null && pe < 0) {
    out.valuation = 'high';
    out.valuationScore = 20;
    out.risks.push('当前市盈率为负（TTM 亏损），按知识规则估值维度记低分');
  } else if (pe !== null) {
    if (pe <= 15) { vs += 30; out.valuation = 'low'; out.positives.push('市盈率 TTM ' + pe + ' 倍 ≤15 倍，估值处于低位区间'); }
    else if (pe <= 25) { vs += 15; out.valuation = 'fair'; out.positives.push('市盈率 TTM ' + pe + ' 倍，处于 15-25 倍合理区间'); }
    else if (pe <= 40) { vs -= 5; out.valuation = 'high'; out.risks.push('市盈率 TTM ' + pe + ' 倍 >25 倍，估值偏高，需业绩增速支撑'); }
    else { vs -= 20; out.valuation = 'high'; out.risks.push('市盈率 TTM ' + pe + ' 倍 >40 倍，估值显著偏高，警惕回撤风险'); }
    if (pb !== null) {
      if (pb <= 1.5) { vs += 10; out.positives.push('市净率 ' + pb + ' 倍 ≤1.5 倍，破净/低 PB 安全垫较厚'); }
      else if (pb > 8) { vs -= 10; out.risks.push('市净率 ' + pb + ' 倍 >8 倍，资产估值溢价极高'); }
    }
  } else {
    out.valuation = null;
    out.valuationScore = 50;
    out.reasons.push('行情接口未返回市盈率，估值维度按中性 50 处理');
  }
  out.valuationScore = Math.max(5, Math.min(98, vs));

  // ---- 2) 股价位置（52周区间内所处位置：越接近低点越具安全边际） ----
  if (price && high && low && high > low) {
    const pos = (price - low) / (high - low); // 0=52周低点 1=52周高点
    if (pos <= 0.25) out.positives.push('现价处于 52 周区间低位（位于低点上方 ' + Math.round(pos * 100) + '% 位置），安全边际相对较好');
    else if (pos >= 0.8) out.risks.push('现价处于 52 周区间高位（位于低点上方 ' + Math.round(pos * 100) + '% 位置），追高风险需关注');
  }

  // ---- 3) 财务质量（复用已算出的财务安全分，并补充现金流观察） ----
  if (financeScored && isFinite(financeScored.finance)) {
    out.qualityScore = financeScored.finance;
    if (financeScored.finance >= 75) out.positives.push('财务安全维度得分 ' + financeScored.finance + '（负债/现金/应收结构健康）');
    else if (financeScored.finance <= 40) out.risks.push('财务安全维度得分仅 ' + financeScored.finance + '（负债或应收结构存在压力）');
  }
  if (finance && isFinite(finance.opCashflow) && isFinite(finance.netProfit)) {
    if (finance.opCashflow > 0 && finance.netProfit > 0) {
      const ratio = finance.opCashflow / finance.netProfit;
      if (ratio >= 1) out.positives.push('经营现金流 ≥ 净利润（现金含量 ' + Math.round(ratio * 100) + '%），利润质量扎实');
      else if (ratio < 0.5) out.risks.push('经营现金流仅为净利润的 ' + Math.round(ratio * 100) + '%，利润现金含量偏低，警惕应收/存货占款');
    } else if (finance.opCashflow < 0) {
      out.risks.push('经营现金流为负，主业失血，按知识规则视为显著风险');
    }
  }

  // ---- 4) 综合股票判断：估值 40% + 财务质量 60%（好公司还要买得便宜） ----
  if (out.valuationScore !== null) {
    const q = out.qualityScore !== null ? out.qualityScore : 50;
    out.stockScore = Math.round(out.valuationScore * 0.4 + q * 0.6);
    if (out.stockScore >= 65) {
      out.verdict = { level: 'stock_invest', label: '股票当前具备投资价值', color: 'green' };
      out.reasons.unshift('估值分 ' + out.valuationScore + '（40%）+ 财务质量分 ' + q + '（60%）→ 综合股票判断 ' + out.stockScore + ' 分 ≥65 分线');
    } else if (out.stockScore >= 50) {
      out.verdict = { level: 'stock_watch', label: '股票可关注，建议等待更好价格', color: 'amber' };
      out.reasons.unshift('估值分 ' + out.valuationScore + '（40%）+ 财务质量分 ' + q + '（60%）→ 综合股票判断 ' + out.stockScore + ' 分，处于 50-65 分观察区间');
    } else {
      out.verdict = { level: 'stock_avoid', label: '股票当前不适合买入', color: 'red' };
      out.reasons.unshift('估值分 ' + out.valuationScore + '（40%）+ 财务质量分 ' + q + '（60%）→ 综合股票判断 ' + out.stockScore + ' 分 <50 分线');
    }
  }

  return out;
}

module.exports = { assessStock };
