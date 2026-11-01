package com.companyxray.guardian.data

/**
 * 告警记录
 *
 * 存储在本地数据库中的告警记录，用于历史查询和家人端展示。
 * 锚点详情以 JSON 字符串形式存储，便于序列化和灵活扩展。
 */
data class AlertRecord(
    /** 本地数据库自增 ID，新记录为 null */
    val id: Long? = null,

    /** 事件唯一标识，与 Verdict.eventId 对应 */
    val eventId: String,

    /** 风险等级 */
    val level: RiskLevel,

    /** 商家名称 */
    val merchantName: String,

    /** 交易金额，null 表示未检测到金额 */
    val amount: Double? = null,

    /** 检测时间戳（毫秒） */
    val ts: Long,

    /** 告警状态 */
    val status: AlertStatus,

    /** 是否已通知家人 */
    val familyNotified: Boolean = false,

    /** 家人是否已查看 */
    val familyViewed: Boolean = false,

    /** 家人是否已确认处理 */
    val familyConfirmed: Boolean = false,

    /**
     * 锚点详情的 JSON 字符串
     * 存储 List<AnchorResult> 的序列化结果
     * 便于灵活存储不同数量的锚点数据
     */
    val anchorsJson: String
) {
    /**
     * 获取用于列表展示的简要描述
     */
    fun getSummary(): String {
        val amountStr = amount?.let { "%.2f 元".format(it) } ?: "未检测金额"
        return "$merchantName · $amountStr"
    }

    /**
     * 判断是否为高风险告警（硬红）
     */
    fun isHighRisk(): Boolean = level == RiskLevel.RED_HARD || level == RiskLevel.RED_SOFT
}
