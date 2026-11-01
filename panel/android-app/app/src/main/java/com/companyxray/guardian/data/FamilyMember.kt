package com.companyxray.guardian.data

/**
 * 家庭成员信息
 *
 * 描述家庭守护关系中的一位成员。
 * 家庭守护关系为双向：
 * - 守护人（晚辈）：负责接收告警、确认处理
 * - 被守护人（长辈）：安装守护应用，接受风险提醒
 *
 * isGuardian = true 表示该成员是守护人（晚辈）
 * isGuardian = false 表示该成员是被守护人（长辈）
 */
data class FamilyMember(
    /** 成员唯一 ID */
    val id: String,

    /** 成员姓名 */
    val name: String,

    /** 联系电话 */
    val phone: String,

    /** 设备 ID，用于推送通知 */
    val deviceId: String?,

    /**
     * 与本人的关系
     * 如：父亲、母亲、儿子、女儿、配偶等
     */
    val relation: String,

    /**
     * 是否为守护人
     * - true：守护人（晚辈），负责接收告警、守护长辈
     * - false：被守护人（长辈），接受风险提醒
     */
    val isGuardian: Boolean,

    /** 邀请码（可选），绑定家人时使用 */
    val inviteCode: String? = null,

    /** 绑定时间戳（毫秒，可选），记录家人绑定的时间 */
    val bindTime: Long? = null
) {
    /**
     * 获取显示用的身份描述
     */
    fun getRoleLabel(): String {
        return if (isGuardian) {
            "守护人"
        } else {
            "被守护人"
        }
    }

    /**
     * 获取完整的显示名称
     * 格式：姓名（关系·身份）
     * 示例："张建国（父亲·被守护人）"
     */
    fun getFullDisplayName(): String {
        return "$name（$relation·${getRoleLabel()}）"
    }
}
