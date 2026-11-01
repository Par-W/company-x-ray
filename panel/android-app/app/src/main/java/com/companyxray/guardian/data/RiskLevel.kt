package com.companyxray.guardian.data

/**
 * 风险等级枚举
 *
 * 与 protocol.md 协议一致的四级风险定义：
 * - GREEN（绿/正常）：各项信息都能在官方渠道查到，未发现异常
 * - YELLOW（黄/关注）：部分信息暂时查不到官方记录，可能是新品牌，需留心
 * - RED_SOFT（软红/可疑）：有几项信息对不上，可能存在风险，建议核实
 * - RED_HARD（硬红/高危）：多项官方信息查不到或对不上，建议先别付款
 */
enum class RiskLevel(
    val value: Int,
    val label: String,
    val description: String
) {
    /** 绿/正常 - 各项信息一致，未发现异常 */
    GREEN(0, "正常", "目前查到的各项信息都一致，没有发现异常。"),

    /** 黄/关注 - 部分信息暂未核实 */
    YELLOW(1, "关注", "部分公开信息暂时查不到，可能是新品牌或者信息不全，请多留意。"),

    /** 软红/可疑 - 有几项信息对不上，建议核实 */
    RED_SOFT(2, "可疑", "有几项信息对不上，可能存在风险，建议让家人帮您核实一下。"),

    /** 硬红/高危 - 多项信息不符，建议暂缓付款 */
    RED_HARD(3, "高危", "多项官方信息查不到或对不上，建议您先别付款，和家人商量一下。");

    companion object {
        /**
         * 根据数值获取风险等级
         */
        fun fromValue(value: Int): RiskLevel = values().firstOrNull { it.value == value } ?: GREEN

        /**
         * 从协议字符串转换（对应 protocol.md 中的 level 字段）
         * 支持："green", "yellow", "red_soft", "red_hard"
         */
        fun fromString(levelStr: String?): RiskLevel {
            return when (levelStr?.lowercase()?.trim()) {
                "green" -> GREEN
                "yellow" -> YELLOW
                "red_soft" -> RED_SOFT
                "red_hard" -> RED_HARD
                else -> GREEN
            }
        }

        /**
         * 根据不通过锚点数量和灰锚点数量计算风险等级
         *
         * 分级规则：
         * - failCount >= 4 → RED_HARD（4项以上不符=硬红）
         * - failCount >= 2 → RED_SOFT（2-3项不符=软红）
         * - failCount == 1 && grayCount < 3 → YELLOW（1项不符且灰锚点较少=黄）
         * - 否则 → GREEN
         *
         * @param failCount 不通过（验证失败）的锚点数量
         * @param totalCount 锚点总数量（预留参数，当前规则未使用）
         * @param grayCount 暂无法核实（灰色状态）的锚点数量
         * @return 对应的风险等级
         */
        fun fromFailCount(failCount: Int, totalCount: Int, grayCount: Int): RiskLevel {
            return when {
                failCount >= 4 -> RED_HARD
                failCount >= 2 -> RED_SOFT
                failCount == 1 && grayCount < 3 -> YELLOW
                else -> GREEN
            }
        }
    }
}
