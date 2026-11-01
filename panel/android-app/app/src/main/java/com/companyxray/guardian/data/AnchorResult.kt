package com.companyxray.guardian.data

/**
 * 单个锚点验证结果
 *
 * 每个锚点代表一项可查证的信息维度，如商标、备案、ICP 等。
 * 验证结果有三种状态：
 * - pass = true：查证通过，信息一致
 * - pass = false：查证不通过，信息不一致或查无记录
 * - pass = null：暂无法核实（灰），因数据来源不可用或信息不足
 *
 * 注意：evidence 字段使用事实表述，如"查无记录""主体不一致"，
 * 不使用"诈骗""伪造"等定性词汇。
 */
data class AnchorResult(
    /** 锚点名称，如"商标注册""特许经营备案"等 */
    val name: String,

    /** 官方预期值，即数据库中记录的正确信息；null 表示无预期数据 */
    val expected: String?,

    /** 实际提取到的信息，从页面或对话中获取；null 表示未提取到 */
    val actual: String?,

    /**
     * 验证结果：
     * - true：通过，信息一致
     * - false：不通过，信息不一致
     * - null：暂无法核实（灰色状态）
     */
    val pass: Boolean?,

    /** 查证来源链接，便于用户自行核对 */
    val sourceUrl: String,

    /**
     * 证据说明，用长辈易懂的语言描述查证结果
     * 示例：
     * - "商标局官网可查，注册人为蜜雪冰城股份有限公司"
     * - "商务部特许经营备案系统查无此品牌记录"
     * - "暂无法核实"
     */
    val evidence: String,

    /** 查询时间戳（毫秒），用于记录验证时机 */
    val queryTime: Long
) {
    companion object {
        /** 无法核实时的默认证据文字 */
        const val UNAVAILABLE_EVIDENCE = "暂无法核实"

        /**
         * 创建一个"暂无法核实"的锚点结果
         */
        fun unavailable(name: String, sourceUrl: String, queryTime: Long): AnchorResult {
            return AnchorResult(
                name = name,
                expected = null,
                actual = null,
                pass = null,
                sourceUrl = sourceUrl,
                evidence = UNAVAILABLE_EVIDENCE,
                queryTime = queryTime
            )
        }
    }
}
