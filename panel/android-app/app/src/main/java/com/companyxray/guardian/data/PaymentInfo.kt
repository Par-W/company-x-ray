package com.companyxray.guardian.data

/**
 * 支付页面提取的信息
 */
data class PaymentInfo(
    /** 收款方名称 */
    val payeeName: String? = null,
    /** 支付金额（原始字符串） */
    val amountText: String? = null,
    /** 支付金额（数值，单位：元） */
    val amount: Double? = null,
    /** 商家名称 */
    val merchantName: String? = null,
    /** 订单号/交易号 */
    val orderNo: String? = null,
    /** 支付方式（微信/支付宝/银行卡等） */
    val payMethod: String? = null,
    /** 所属应用包名 */
    val packageName: String? = null,
    /** 页面场景 */
    val scene: PageScene = PageScene.UNKNOWN,
    /** 提取到的所有文本（用于后续分析） */
    val allTexts: List<String> = emptyList(),
    /** 是否成功提取到关键字段（收款方 + 金额） */
    val isExtracted: Boolean = false
)
