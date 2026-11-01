package com.companyxray.guardian.engine

import android.content.Context
import com.companyxray.guardian.data.AnchorResult
import com.companyxray.guardian.data.PageScene
import com.companyxray.guardian.data.PaymentInfo
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.data.Verdict
import com.companyxray.guardian.network.ApiClient
import com.companyxray.guardian.util.ExtractionHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 风险引擎
 *
 * 基于六锚点模型对支付场景进行风险评估。
 *
 * 六锚点：
 * 1. 收款方身份核验 - 收款方是企业还是个人，名称是否合理
 * 2. 金额合理性 - 金额是否超出正常消费范围，是否为特殊数字
 * 3. 支付场景核验 - 支付场景是否合理，是否在正规支付渠道
 * 4. 宣传合规性 - 页面是否包含高风险关键词、违规承诺
 * 5. 品牌身份核验 - 商家名称是否为已知品牌，有无仿冒嫌疑
 * 6. 行为连贯性 - 操作行为是否符合正常模式
 *
 * 合规原则：
 * - 所有表述均为事实陈述，不使用"诈骗""骗子"等定性词汇
 * - 建议话术温和引导，建议核实而非直接下结论
 * - 不使用"放心付款""绝对安全"等绝对化表述
 */
class RiskEngine private constructor(private val context: Context) {

    private val apiClient = ApiClient.getInstance(context)

    // 高风险金额阈值（元）
    private val highRiskAmountThreshold = 5000.0
    private val mediumRiskAmountThreshold = 1000.0

    companion object {
        @Volatile
        private var instance: RiskEngine? = null

        fun getInstance(context: Context): RiskEngine {
            return instance ?: synchronized(this) {
                instance ?: RiskEngine(context.applicationContext).also { instance = it }
            }
        }

        /** 六锚点名称列表 */
        private val ANCHOR_NAMES = listOf(
            "收款方身份",
            "金额合理性",
            "支付场景",
            "宣传合规性",
            "品牌身份",
            "行为连贯性"
        )
    }

    /**
     * 核验支付风险
     *
     * @param paymentInfo 提取的支付信息
     * @return 风险核验结果
     */
    suspend fun evaluatePaymentRisk(paymentInfo: PaymentInfo): Verdict = withContext(Dispatchers.Default) {
        val queryTime = System.currentTimeMillis()
        val merchantName = paymentInfo.merchantName ?: "未知商家"
        val eventId = "pay_${queryTime}_${(Math.random() * 10000).toInt()}"

        // 如果无法提取关键字段，返回"关注"状态（信息不足，无法准确评估）
        if (!paymentInfo.isExtracted) {
            val anchors = buildUnavailableAnchors(queryTime, "页面信息不足，暂无法评估风险")
            return@withContext Verdict(
                eventId = eventId,
                level = RiskLevel.YELLOW,
                score = null,
                anchors = anchors,
                familyNotify = false,
                advicePhrase = "当前页面信息不足，暂无法评估风险，请确认是否为正规支付页面。",
                transparency = 0,
                queryTime = queryTime,
                merchantName = merchantName,
                amount = paymentInfo.amount,
                claimedBrand = paymentInfo.merchantName
            )
        }

        // 构建六锚点验证结果（本地初筛）
        val anchors = buildAnchors(paymentInfo, queryTime)

        // 品牌核验（异步调用 API 补充信息）
        val brandResult = if (!paymentInfo.merchantName.isNullOrBlank()) {
            apiClient.getBrandInfo(paymentInfo.merchantName)
        } else {
            null
        }

        // 如果有品牌核验结果，更新品牌锚点
        val finalAnchors = if (brandResult != null) {
            updateBrandAnchor(anchors, brandResult, queryTime)
        } else {
            anchors
        }

        // 统计不通过和灰锚点数量
        val failCount = finalAnchors.count { it.pass == false }
        val grayCount = finalAnchors.count { it.pass == null }
        val totalCount = finalAnchors.size

        // 使用标准分级方法确定风险等级
        val level = RiskLevel.fromFailCount(failCount, totalCount, grayCount)

        // 计算透明度
        val transparency = if (totalCount > 0) {
            ((totalCount - grayCount) * 100) / totalCount
        } else {
            0
        }

        // 计算风险评分（0-100，分数越低风险越高）
        val score = calculateScore(failCount, grayCount, totalCount)

        // 是否需要通知家人
        val familyNotify = level == RiskLevel.RED_HARD || level == RiskLevel.RED_SOFT

        // 生成建议话术
        val advicePhrase = Verdict.buildAdvicePhrase(level, merchantName)

        Verdict(
            eventId = eventId,
            level = level,
            score = score,
            anchors = finalAnchors,
            familyNotify = familyNotify,
            advicePhrase = advicePhrase,
            transparency = transparency,
            queryTime = queryTime,
            merchantName = merchantName,
            amount = paymentInfo.amount,
            claimedBrand = paymentInfo.merchantName
        )
    }

    /**
     * 构建六锚点验证结果（本地初筛）
     *
     * 基于本地规则对每个锚点进行初步判断。
     * 对于无法本地核实的锚点，标记为"暂无法核实"（灰）。
     */
    private fun buildAnchors(paymentInfo: PaymentInfo, queryTime: Long): List<AnchorResult> {
        return ANCHOR_NAMES.map { anchorName ->
            when (anchorName) {
                "收款方身份" -> buildPayeeAnchor(paymentInfo, queryTime)
                "金额合理性" -> buildAmountAnchor(paymentInfo, queryTime)
                "支付场景" -> buildSceneAnchor(paymentInfo, queryTime)
                "宣传合规性" -> buildScriptAnchor(paymentInfo, queryTime)
                "品牌身份" -> buildBrandAnchorLocal(paymentInfo, queryTime)
                "行为连贯性" -> buildBehaviorAnchor(queryTime)
                else -> AnchorResult.unavailable(anchorName, "", queryTime)
            }
        }
    }

    /**
     * 锚点1：收款方身份核验
     * - 收款方名称是否为企业名称
     * - 是否包含可疑称谓
     * - 是否为纯数字等无意义名称
     */
    private fun buildPayeeAnchor(paymentInfo: PaymentInfo, queryTime: Long): AnchorResult {
        val payeeName = paymentInfo.payeeName ?: return AnchorResult.unavailable(
            "收款方身份", "", queryTime
        )

        // 包含个人化特征词（"老师"、"导师"、"客服"等可能是冒充的）
        val suspiciousTitles = listOf("老师", "导师", "客服", "经理", "总监", "顾问", "助理")
        if (suspiciousTitles.any { payeeName.contains(it) }) {
            return AnchorResult(
                name = "收款方身份",
                expected = "正规商家通常使用企业名称收款",
                actual = payeeName,
                pass = false,
                sourceUrl = "",
                evidence = "收款方名称包含个人称谓，正规企业收款通常使用公司或品牌名称。",
                queryTime = queryTime
            )
        }

        // 包含公司、店、超市等实体名称特征，可信度较高
        val businessKeywords = listOf("公司", "店", "超市", "商场", "餐厅", "酒店", "医院", "学校")
        if (businessKeywords.any { payeeName.contains(it) }) {
            return AnchorResult(
                name = "收款方身份",
                expected = null,
                actual = payeeName,
                pass = true,
                sourceUrl = "",
                evidence = "收款方名称包含实体经营特征，信息较为可信。",
                queryTime = queryTime
            )
        }

        // 纯数字或无意义字符的收款方，风险较高
        if (payeeName.matches(Regex("\\d+")) || payeeName.length < 2) {
            return AnchorResult(
                name = "收款方身份",
                expected = "收款方应使用有意义的名称",
                actual = payeeName,
                pass = false,
                sourceUrl = "",
                evidence = "收款方名称为纯数字或过短，不符合正规商家命名习惯。",
                queryTime = queryTime
            )
        }

        // 默认：暂无法核实
        return AnchorResult(
            name = "收款方身份",
            expected = null,
            actual = payeeName,
            pass = null,
            sourceUrl = "",
            evidence = "收款方身份待核实，建议通过官方渠道确认收款方信息。",
            queryTime = queryTime
        )
    }

    /**
     * 锚点2：金额合理性
     * - 金额是否超出正常日常消费范围
     * - 是否为特殊数字（如 666、888、9999 等）
     */
    private fun buildAmountAnchor(paymentInfo: PaymentInfo, queryTime: Long): AnchorResult {
        val amount = paymentInfo.amount ?: return AnchorResult.unavailable(
            "金额合理性", "", queryTime
        )

        val amountText = "¥%.2f".format(amount)

        return when {
            amount >= highRiskAmountThreshold -> AnchorResult(
                name = "金额合理性",
                expected = "日常消费通常在合理范围内",
                actual = amountText,
                pass = false,
                sourceUrl = "",
                evidence = "金额较高，已超出日常消费常见范围，请核实交易用途。",
                queryTime = queryTime
            )
            amount >= mediumRiskAmountThreshold -> AnchorResult(
                name = "金额合理性",
                expected = null,
                actual = amountText,
                pass = null,
                sourceUrl = "",
                evidence = "金额中等偏大，请确认商品或服务价格是否合理。",
                queryTime = queryTime
            )
            else -> AnchorResult(
                name = "金额合理性",
                expected = null,
                actual = amountText,
                pass = true,
                sourceUrl = "",
                evidence = "金额在日常消费常见范围内。",
                queryTime = queryTime
            )
        }
    }

    /**
     * 锚点3：支付场景核验
     * - 支付场景是否合理
     * - 是否在正确的 App 中进行支付
     */
    private fun buildSceneAnchor(paymentInfo: PaymentInfo, queryTime: Long): AnchorResult {
        return when (paymentInfo.scene) {
            PageScene.PAYMENT -> {
                if (ExtractionHelper.isPaymentApp(paymentInfo.packageName)) {
                    AnchorResult(
                        name = "支付场景",
                        expected = null,
                        actual = "正规支付应用",
                        pass = true,
                        sourceUrl = "",
                        evidence = "在正规支付应用中进行支付，场景正常。",
                        queryTime = queryTime
                    )
                } else {
                    AnchorResult(
                        name = "支付场景",
                        expected = "建议通过正规支付渠道付款",
                        actual = "非支付类应用",
                        pass = false,
                        sourceUrl = "",
                        evidence = "在非支付类应用中出现支付页面，请确认支付渠道是否正规。",
                        queryTime = queryTime
                    )
                }
            }
            PageScene.CHAT -> AnchorResult(
                name = "支付场景",
                expected = "建议通过正规支付渠道付款",
                actual = "聊天场景转账",
                pass = false,
                sourceUrl = "",
                evidence = "在聊天场景中进行转账操作，请核实对方身份后再操作。",
                queryTime = queryTime
            )
            PageScene.LANDING_PAGE -> AnchorResult(
                name = "支付场景",
                expected = "建议通过正规支付渠道付款",
                actual = "网页/落地页支付",
                pass = false,
                sourceUrl = "",
                evidence = "在网页或落地页中直接支付，请确认网站是否为官方渠道。",
                queryTime = queryTime
            )
            PageScene.UNKNOWN -> AnchorResult.unavailable(
                "支付场景", "", queryTime
            )
        }
    }

    /**
     * 锚点4：宣传合规性
     * - 页面中是否包含高风险关键词
     */
    private fun buildScriptAnchor(paymentInfo: PaymentInfo, queryTime: Long): AnchorResult {
        val riskScore = ExtractionHelper.calculateKeywordRiskScore(paymentInfo.allTexts)

        return if (riskScore >= 60) {
            AnchorResult(
                name = "宣传合规性",
                expected = "正规商家宣传通常客观真实",
                actual = "检测到高风险表述",
                pass = false,
                sourceUrl = "",
                evidence = "页面中包含较多高风险关键词，请谨慎对待宣传内容。",
                queryTime = queryTime
            )
        } else if (riskScore >= 30) {
            AnchorResult(
                name = "宣传合规性",
                expected = null,
                actual = "检测到部分风险表述",
                pass = null,
                sourceUrl = "",
                evidence = "页面中有一些需要关注的表述，建议核实后再决定。",
                queryTime = queryTime
            )
        } else {
            AnchorResult(
                name = "宣传合规性",
                expected = null,
                actual = "未检测到明显风险表述",
                pass = true,
                sourceUrl = "",
                evidence = "页面宣传内容未发现明显的高风险表述。",
                queryTime = queryTime
            )
        }
    }

    /**
     * 锚点5：品牌身份核验（本地初筛）
     * - 商家名称是否为已知品牌
     * - 名称相似度检测（防止仿冒）
     *
     * 注：完整核验需通过 API 查询品牌数据库
     */
    private fun buildBrandAnchorLocal(paymentInfo: PaymentInfo, queryTime: Long): AnchorResult {
        val merchantName = paymentInfo.merchantName ?: return AnchorResult.unavailable(
            "品牌身份", "", queryTime
        )

        // 常见知名品牌（简化版，实际应通过 API 核验）
        val knownBrands = listOf(
            "美团", "饿了么", "淘宝", "天猫", "京东", "拼多多",
            "滴滴", "携程", "12306", "中国移动", "中国联通", "中国电信",
            "微信", "支付宝", "抖音", "快手", "B站"
        )

        if (knownBrands.any { merchantName.contains(it) }) {
            return AnchorResult(
                name = "品牌身份",
                expected = null,
                actual = merchantName,
                pass = true,
                sourceUrl = "",
                evidence = "商家名称包含知名品牌关键词，初步判断较为可信。",
                queryTime = queryTime
            )
        }

        // 名称包含"官方"、"旗舰店"等字样
        if (merchantName.contains("官方") || merchantName.contains("旗舰")) {
            return AnchorResult(
                name = "品牌身份",
                expected = null,
                actual = merchantName,
                pass = null,
                sourceUrl = "",
                evidence = "商家自称官方或旗舰，建议通过品牌官网核实授权信息。",
                queryTime = queryTime
            )
        }

        // 不知名商家，暂无法核实
        return AnchorResult(
            name = "品牌身份",
            expected = null,
            actual = merchantName,
            pass = null,
            sourceUrl = "",
            evidence = "该商家品牌信息待核实，建议通过官方渠道进一步确认。",
            queryTime = queryTime
        )
    }

    /**
     * 锚点6：行为连贯性
     * - 简化版：本地无法全面评估，暂标记为灰
     * - 完整实现需要结合历史支付记录、时间、频率等进行分析
     */
    private fun buildBehaviorAnchor(queryTime: Long): AnchorResult {
        return AnchorResult(
            name = "行为连贯性",
            expected = null,
            actual = "待评估",
            pass = null,
            sourceUrl = "",
            evidence = "行为模式分析需要更多历史数据，暂无法核实。",
            queryTime = queryTime
        )
    }

    /**
     * 根据品牌核验 API 结果更新品牌锚点
     */
    private fun updateBrandAnchor(
        anchors: List<AnchorResult>,
        brandResult: ApiClient.BrandInfoResponse,
        queryTime: Long
    ): List<AnchorResult> {
        val brandLevel = RiskLevel.fromString(brandResult.level)

        val updatedBrandAnchor = AnchorResult(
            name = "品牌身份",
            expected = null,
            actual = brandResult.brand,
            pass = when (brandLevel) {
                RiskLevel.GREEN -> true
                RiskLevel.YELLOW -> null
                RiskLevel.RED_SOFT, RiskLevel.RED_HARD -> false
            },
            sourceUrl = "",
            evidence = when (brandLevel) {
                RiskLevel.GREEN -> "品牌数据库可查，各项备案信息完整。"
                RiskLevel.YELLOW -> "品牌部分信息待核实，透明度评分 ${brandResult.transparency}/100。"
                RiskLevel.RED_SOFT, RiskLevel.RED_HARD ->
                    "品牌核验发现多处信息不符，透明度评分 ${brandResult.transparency}/100，请谨慎核实。"
            },
            queryTime = queryTime
        )

        return anchors.map { anchor ->
            if (anchor.name == "品牌身份") updatedBrandAnchor else anchor
        }
    }

    /**
     * 构建全部为"暂无法核实"的锚点列表（信息不足时使用）
     */
    private fun buildUnavailableAnchors(queryTime: Long, reason: String): List<AnchorResult> {
        return ANCHOR_NAMES.map { name ->
            AnchorResult(
                name = name,
                expected = null,
                actual = null,
                pass = null,
                sourceUrl = "",
                evidence = reason,
                queryTime = queryTime
            )
        }
    }

    /**
     * 计算风险评分（0-100，分数越低风险越高）
     */
    private fun calculateScore(failCount: Int, grayCount: Int, totalCount: Int): Int {
        if (totalCount == 0) return 0
        val deduction = failCount * 20 + grayCount * 8
        return (100 - deduction).coerceIn(0, 100)
    }
}
