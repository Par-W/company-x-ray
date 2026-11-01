package com.companyxray.guardian.data

/**
 * 风险判定结论
 *
 * 风险引擎对一次检测的完整输出，包含风险等级、各锚点验证结果、
 * 建议话术等信息。用于在弹窗中展示给用户，或推送给家人。
 *
 * 遵循长辈友好原则：
 * - 表述客观，只用事实陈述
 * - 不使用"诈骗""骗子"等定性词汇
 * - 建议话术温和，引导核实而非直接下结论
 */
data class Verdict(
    /** 事件唯一标识，用于关联告警记录 */
    val eventId: String,

    /** 综合风险等级 */
    val level: RiskLevel,

    /**
     * 风险评分（0-100），可选
     * 分数越低风险越高，仅供参考，主要以 level 为准
     */
    val score: Int?,

    /** 六锚点验证结果列表 */
    val anchors: List<AnchorResult>,

    /** 是否需要通知家人 */
    val familyNotify: Boolean,

    /**
     * 建议话术，用长辈易懂的语言给出提醒
     * 示例：
     * - "这个品牌的官方信息我们查到多处不一致，建议您先和子女确认后再付款。"
     * - "这是一家正规品牌，各项信息都能查到，您可以放心。"
     */
    val advicePhrase: String,

    /**
     * 透明度评分（0-100），可选
     * 表示有多少锚点能够实际查证（而非无法核实）
     */
    val transparency: Int?,

    /** 查询时间戳（毫秒） */
    val queryTime: Long,

    /** 商家名称，从页面提取 */
    val merchantName: String,

    /** 交易金额，从页面提取；null 表示未检测到金额 */
    val amount: Double?,

    /**
     * 声称的品牌名称，从页面提取
     * 用户可能声称自己是某品牌，但实际主体可能不符
     */
    val claimedBrand: String?
) {
    companion object {
        /**
         * 构建建议话术
         * 根据风险等级生成长辈友好的提醒文字
         *
         * 合规原则：
         * - 用事实表述，不使用"诈骗""骗子"等定性词汇
         * - 温和引导，建议核实而非下结论
         * - 不使用"放心付款""绝对安全"等绝对化表述
         */
        fun buildAdvicePhrase(level: RiskLevel, merchantName: String): String {
            return when (level) {
                RiskLevel.RED_HARD ->
                    "该商家的多项官方信息查不到或对不上，建议您先别付款，和家人商量一下。"
                RiskLevel.RED_SOFT ->
                    "该商家有几项信息对不上，可能存在风险，建议让家人帮您核实一下。"
                RiskLevel.YELLOW ->
                    "该商家部分公开信息暂时查不到，可能是新品牌或者信息不全，请多留意。"
                RiskLevel.GREEN ->
                    "目前查到的各项信息都一致，没有发现异常。"
            }
        }

        /**
         * 从 API 响应转换为 Verdict 对象
         *
         * 将服务端返回的 VerdictResponse 转换为本地业务模型 Verdict，
         * 同时补充页面提取的商家名称、金额、声称品牌等信息。
         *
         * @param response API 返回的判定响应
         * @param merchantName 商家名称（从页面提取）
         * @param amount 交易金额（从页面提取，可选）
         * @param claimedBrand 声称的品牌名称（从页面提取，可选）
         * @return 转换后的 Verdict 对象
         */
        fun fromApiResponse(
            response: com.companyxray.guardian.network.ApiClient.VerdictResponse,
            merchantName: String,
            amount: Double?,
            claimedBrand: String?
        ): Verdict {
            val level = RiskLevel.fromString(response.level)
            val queryTime = System.currentTimeMillis()

            // 将 API 的锚点结果转换为本地 AnchorResult 模型
            val anchors = response.anchors.map { anchorResp ->
                AnchorResult(
                    name = anchorResp.name,
                    expected = anchorResp.expected,
                    actual = anchorResp.actual,
                    pass = anchorResp.pass,
                    sourceUrl = anchorResp.sourceUrl,
                    evidence = anchorResp.evidence,
                    queryTime = queryTime
                )
            }

            return Verdict(
                eventId = response.eventId,
                level = level,
                score = response.score,
                anchors = anchors,
                familyNotify = response.familyNotify,
                advicePhrase = response.advicePhrase,
                transparency = response.transparency,
                queryTime = queryTime,
                merchantName = merchantName,
                amount = amount,
                claimedBrand = claimedBrand
            )
        }

        /**
         * 从 JSON 反序列化
         */
        fun fromJson(json: String): Verdict? {
            return try {
                com.google.gson.Gson().fromJson(json, Verdict::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }

    /**
     * 序列化为 JSON
     */
    fun toJson(): String {
        return com.google.gson.Gson().toJson(this)
    }
}
