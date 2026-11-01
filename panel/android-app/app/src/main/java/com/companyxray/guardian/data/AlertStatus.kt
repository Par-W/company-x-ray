package com.companyxray.guardian.data

/**
 * 告警状态枚举
 *
 * 描述一条风险告警从产生到最终处理的完整生命周期。
 * 状态流转：
 * DETECTED → SENT → DELIVERED → VIEWED → CONFIRMED / DISMISSED
 */
enum class AlertStatus {

    /** 已检测到风险，尚未发送通知 */
    DETECTED,

    /** 已发送通知给家人（推送已发出） */
    SENT,

    /** 通知已送达家人设备 */
    DELIVERED,

    /** 家人已查看告警详情 */
    VIEWED,

    /** 家人已确认处理（已联系长辈或确认安全） */
    CONFIRMED,

    /** 告警已被忽略/撤销（误报等） */
    DISMISSED;

    /** 中文显示名，用于界面展示 */
    val displayName: String
        get() = when (this) {
            DETECTED -> "已检测"
            SENT -> "已发送"
            DELIVERED -> "已送达"
            VIEWED -> "已查看"
            CONFIRMED -> "已确认"
            DISMISSED -> "已忽略"
        }
}
