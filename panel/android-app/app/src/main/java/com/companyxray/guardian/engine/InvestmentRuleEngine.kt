package com.companyxray.guardian.engine

import com.companyxray.guardian.data.AnchorResult
import com.companyxray.guardian.data.ExtractedFields
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.data.Verdict

/**
 * 投资场景规则引擎
 *
 * 针对投资理财类场景的专项风险检测。
 * 与普通加盟/消费场景不同，投资场景的核心验证锚点为：
 * 1. 证监会证券投资咨询机构名录
 * 2. 中基协私募管理人登记
 *
 * 识别关键词：
 * - 荐股、炒股课、股票推荐
 * - 原始股、份额投资、股权投资
 * - 私募基金、理财课程
 * - 稳赚不赔、内幕消息等
 *
 * 风险逻辑：
 * - 无合法资质本身即风险信号
 * - 任何承诺"保本""高收益"的投资都值得警惕
 * - 面向公众募集资金的行为需要相应金融牌照
 *
 * 注意：本引擎仅提供信息核实提示，不构成投资建议。
 * 所有表述均为事实陈述，不使用"诈骗""非法集资"等定性词汇。
 */
object InvestmentRuleEngine {

    /**
     * 投资场景锚点名称列表
     * 用证监会/中基协资质代替特许经营备案
     */
    private val investmentAnchorNames = listOf(
        "工商登记",
        "证监会投顾资质",
        "中基协私募登记",
        "ICP备案",
        "收款账户",
        "宣传合规性"
    )

    /**
     * 投资类关键词列表
     * 用于识别投资场景
     */
    private val investmentKeywords = listOf(
        "荐股", "炒股课", "股票推荐", "牛股",
        "原始股", "份额投资", "股权投资", "股权认购",
        "私募基金", "私募产品", "基金份额",
        "理财课程", "财商课", "投资课",
        "稳赚不赔", "保本保息", "高收益", "无风险",
        "内幕消息", "庄家", "拉升", "涨停",
        "数字货币", "虚拟货币", "区块链投资"
    )

    /**
     * 高风险投资关键词（出现即高度警惕）
     */
    private val highRiskKeywords = listOf(
        "原始股", "稳赚不赔", "保本保息",
        "内幕消息", "庄家拉升", "数字货币"
    )

    /**
     * 执行投资场景风险验证
     *
     * @param extracted 从页面提取的字段信息
     * @param eventId 事件 ID
     * @param queryTime 查询时间戳
     * @return 风险判定结论
     */
    fun verify(
        extracted: ExtractedFields,
        eventId: String,
        queryTime: Long
    ): Verdict {
        val merchantName = extracted.displayMerchantName()
        val entityName = extracted.counterpartEntity ?: extracted.claimedBrand ?: ""

        // 检测高风险关键词
        val hasHighRiskKeyword = hasHighRiskKeyword(extracted)

        // 构建投资场景六锚点结果
        val anchors = buildInvestmentAnchors(entityName, extracted, queryTime)

        // 统计不通过的锚点数量
        val failCount = anchors.count { it.pass == false }
        val greyCount = anchors.count { it.pass == null }

        // 投资场景风险判定规则：
        // - 有高风险关键词，或 4 项以上不符 → 硬红
        // - 2-3 项不符，或关键资质（证监会/中基协）查无记录 → 黄
        // - 1 项或全一致 → 绿
        val level = calculateInvestmentRiskLevel(failCount, hasHighRiskKeyword, anchors)

        // 计算透明度
        val transparency = if (anchors.isNotEmpty()) {
            ((anchors.size - greyCount) * 100) / anchors.size
        } else {
            0
        }

        // 计算风险评分
        val score = calculateInvestmentScore(failCount, greyCount, anchors.size, hasHighRiskKeyword)

        // 投资场景默认通知家人（涉及资金风险较高）
        val familyNotify = level == RiskLevel.RED_HARD || level == RiskLevel.RED_SOFT

        // 生成投资场景的建议话术
        val advicePhrase = buildInvestmentAdvice(level, merchantName)

        return Verdict(
            eventId = eventId,
            level = level,
            score = score,
            anchors = anchors,
            familyNotify = familyNotify,
            advicePhrase = advicePhrase,
            transparency = transparency,
            queryTime = queryTime,
            merchantName = merchantName,
            amount = extracted.amount,
            claimedBrand = extracted.claimedBrand
        )
    }

    /**
     * 构建投资场景锚点验证结果
     *
     * 由于投资场景的资质数据需要接入证监会、中基协等官方接口，
     * 本地版本暂以"暂无法核实"为主，同时对明显的高风险信号
     * （如承诺保本、个人账户收款等）给出提示。
     */
    private fun buildInvestmentAnchors(
        entityName: String,
        extracted: ExtractedFields,
        queryTime: Long
    ): List<AnchorResult> {
        val result = mutableListOf<AnchorResult>()

        for (anchorName in investmentAnchorNames) {
            val sourceUrl = getInvestmentSourceUrl(anchorName)

            val anchorResult = when (anchorName) {
                "工商登记" -> {
                    // 工商登记信息：本地无法直接查询
                    if (entityName.isNotBlank()) {
                        AnchorResult(
                            name = anchorName,
                            expected = null,
                            actual = entityName,
                            pass = null,
                            sourceUrl = "https://www.gsxt.gov.cn/",
                            evidence = "可通过国家企业信用信息公示系统自行核实",
                            queryTime = queryTime
                        )
                    } else {
                        AnchorResult.unavailable(anchorName, sourceUrl, queryTime)
                    }
                }

                "证监会投顾资质" -> {
                    // 证监会证券投资咨询机构名录
                    val evidence = "证券投资咨询业务需取得证监会颁发的业务牌照。" +
                            "可通过证监会官网查询合法机构名录。"
                    AnchorResult(
                        name = anchorName,
                        expected = "需取得证监会证券投资咨询业务资格",
                        actual = extracted.counterpartEntity,
                        pass = null,
                        sourceUrl = sourceUrl,
                        evidence = evidence,
                        queryTime = queryTime
                    )
                }

                "中基协私募登记" -> {
                    // 中基协私募管理人登记
                    val evidence = "私募基金管理人需在中国证券投资基金业协会登记。" +
                            "可通过中基协官网查询登记信息。"
                    AnchorResult(
                        name = anchorName,
                        expected = "需在中基协完成私募基金管理人登记",
                        actual = extracted.counterpartEntity,
                        pass = null,
                        sourceUrl = sourceUrl,
                        evidence = evidence,
                        queryTime = queryTime
                    )
                }

                "ICP备案" -> {
                    // ICP 备案
                    if (extracted.landingDomain.isNullOrBlank()) {
                        AnchorResult.unavailable(anchorName, sourceUrl, queryTime)
                    } else {
                        AnchorResult(
                            name = anchorName,
                            expected = null,
                            actual = extracted.landingDomain,
                            pass = null,
                            sourceUrl = sourceUrl,
                            evidence = "可通过工信部备案系统核实域名备案信息",
                            queryTime = queryTime
                        )
                    }
                }

                "收款账户" -> {
                    // 收款账户：个人账户收款是投资类风险的重要信号
                    val account = extracted.account
                    when {
                        account == null -> {
                            AnchorResult.unavailable(anchorName, sourceUrl, queryTime)
                        }
                        isPersonalAccount(account) -> {
                            AnchorResult(
                                name = anchorName,
                                expected = "正规金融机构收款应为对公账户",
                                actual = "个人账户",
                                pass = false,
                                sourceUrl = sourceUrl,
                                evidence = "收款账户为个人账户，正规金融产品通常通过对公账户或第三方托管收款。",
                                queryTime = queryTime
                            )
                        }
                        else -> {
                            AnchorResult(
                                name = anchorName,
                                expected = null,
                                actual = account,
                                pass = null,
                                sourceUrl = sourceUrl,
                                evidence = "请核实收款账户是否为正规金融机构账户",
                                queryTime = queryTime
                            )
                        }
                    }
                }

                "宣传合规性" -> {
                    // 宣传合规性：检查是否有违规宣传用语
                    val text = buildTextForCheck(extracted)
                    val violations = checkPromotionCompliance(text)

                    if (violations.isEmpty()) {
                        AnchorResult(
                            name = anchorName,
                            expected = "不得承诺保本保收益",
                            actual = "未检测到违规宣传用语",
                            pass = true,
                            sourceUrl = sourceUrl,
                            evidence = "未检测到'保本''稳赚'等违规承诺用语",
                            queryTime = queryTime
                        )
                    } else {
                        AnchorResult(
                            name = anchorName,
                            expected = "不得承诺保本保收益、不得使用诱导性表述",
                            actual = violations.joinToString("、"),
                            pass = false,
                            sourceUrl = sourceUrl,
                            evidence = "检测到以下表述：${violations.joinToString("、")}。" +
                                    "根据规定，金融产品不得承诺保本保收益。",
                            queryTime = queryTime
                        )
                    }
                }

                else -> {
                    AnchorResult.unavailable(anchorName, sourceUrl, queryTime)
                }
            }

            result.add(anchorResult)
        }

        return result
    }

    /**
     * 判断是否为个人账户（简化判断）
     * 真实场景应接入银行账户验证接口
     */
    private fun isPersonalAccount(account: String): Boolean {
        // 简化判断：如果账号看起来像手机号或微信号，视为个人账户
        val cleaned = account.replace(Regex("[\\s-]"), "")
        return when {
            // 11 位手机号
            cleaned.matches(Regex("^1[3-9]\\d{9}$")) -> true
            // 微信号格式（字母开头，6-20 位）
            cleaned.matches(Regex("^[a-zA-Z][a-zA-Z0-9_-]{5,19}$")) -> true
            // 支付宝账号（手机号或邮箱）
            cleaned.contains("@") -> true
            else -> false
        }
    }

    /**
     * 检查宣传合规性，返回检测到的违规表述列表
     */
    private fun checkPromotionCompliance(text: String): List<String> {
        if (text.isBlank()) return emptyList()

        val violationPatterns = mapOf(
            "稳赚不赔" to listOf("稳赚不赔", "稳赚", "包赚"),
            "保本保息" to listOf("保本", "保息", "保本保收益", "零风险"),
            "高收益承诺" to listOf("高收益", "高额回报", "收益翻倍", "百倍收益"),
            "内幕消息" to listOf("内幕", "内部消息", "小道消息"),
            "庄家操作" to listOf("庄家", "拉升", "操盘", "带你飞"),
            "原始股" to listOf("原始股", "内部股权", "优先认购")
        )

        val violations = mutableListOf<String>()
        for ((label, patterns) in violationPatterns) {
            if (patterns.any { pattern -> text.contains(pattern, ignoreCase = true) }) {
                violations.add(label)
            }
        }

        return violations
    }

    /**
     * 检测是否包含高风险关键词
     */
    private fun hasHighRiskKeyword(extracted: ExtractedFields): Boolean {
        val text = buildTextForCheck(extracted)
        if (text.isBlank()) return false
        return highRiskKeywords.any { keyword ->
            text.contains(keyword, ignoreCase = true)
        }
    }

    /**
     * 构建用于关键词检测的文本
     */
    private fun buildTextForCheck(extracted: ExtractedFields): String {
        return buildString {
            extracted.claimedBrand?.let { append(it).append(" ") }
            extracted.counterpartEntity?.let { append(it).append(" ") }
        }
    }

    /**
     * 计算投资场景风险等级
     *
     * 基础规则使用 RiskLevel.fromFailCount：
     * - failCount >= 4 → RED_HARD
     * - failCount >= 2 → RED_SOFT
     * - failCount == 1 && grayCount < 3 → YELLOW
     * - 否则 → GREEN
     *
     * 投资场景特殊调整：
     * - 检测到高风险关键词时，风险等级提升一级
     * - 关键资质（证监会/中基协）无法核实且有1项以上不通过 → 至少黄
     */
    private fun calculateInvestmentRiskLevel(
        failCount: Int,
        hasHighRiskKeyword: Boolean,
        anchors: List<AnchorResult>
    ): RiskLevel {
        val grayCount = anchors.count { it.pass == null }
        val totalCount = anchors.size

        // 基础分级
        var level = RiskLevel.fromFailCount(failCount, totalCount, grayCount)

        // 检测到高风险关键词时，风险等级提升一级
        if (hasHighRiskKeyword) {
            level = when (level) {
                RiskLevel.GREEN -> RiskLevel.YELLOW
                RiskLevel.YELLOW -> RiskLevel.RED_SOFT
                RiskLevel.RED_SOFT -> RiskLevel.RED_HARD
                RiskLevel.RED_HARD -> RiskLevel.RED_HARD
            }
        }

        // 关键资质（证监会/中基协）为灰（无法核实）且有至少1项不通过 → 至少为黄
        val criticalGrey = anchors.count {
            (it.name == "证监会投顾资质" || it.name == "中基协私募登记") && it.pass == null
        }
        if (criticalGrey >= 1 && failCount >= 1 && level == RiskLevel.GREEN) {
            level = RiskLevel.YELLOW
        }

        return level
    }

    /**
     * 计算投资场景风险评分
     */
    private fun calculateInvestmentScore(
        failCount: Int,
        greyCount: Int,
        totalCount: Int,
        hasHighRiskKeyword: Boolean
    ): Int {
        if (totalCount == 0) return 0

        var deduction = failCount * 18 + greyCount * 5
        if (hasHighRiskKeyword) {
            deduction += 20
        }
        return (100 - deduction).coerceIn(0, 100)
    }

    /**
     * 构建投资场景建议话术
     *
     * 合规原则：
     * - 用事实表述："无证券投资咨询资质""无私募基金管理人登记""个人账户收款"
     * - 不使用"非法集资""诈骗"等定性词汇
     * - 建议话术温和引导，如"投资请谨慎""建议通过正规渠道操作"
     */
    private fun buildInvestmentAdvice(level: RiskLevel, merchantName: String): String {
        return when (level) {
            RiskLevel.RED_HARD ->
                "该机构多项资质查无记录，且检测到高风险表述。涉及投资的钱款请先和家人商量，不要急于转账。"
            RiskLevel.RED_SOFT ->
                "该机构有几项资质信息对不上，可能存在风险。投资前建议让家人帮您核实一下对方资质。"
            RiskLevel.YELLOW ->
                "该机构的相关资质需要进一步核实。投资理财有风险，建议通过正规渠道操作。"
            RiskLevel.GREEN ->
                "目前查到的信息暂未发现明显异常。但投资有风险，仍请谨慎决策。"
        }
    }

    /**
     * 获取投资场景各锚点官方查询链接
     */
    private fun getInvestmentSourceUrl(anchorName: String): String {
        return when (anchorName) {
            "工商登记" -> "https://www.gsxt.gov.cn/"
            "证监会投顾资质" -> "http://www.csrc.gov.cn/"
            "中基协私募登记" -> "https://www.amac.org.cn/"
            "ICP备案" -> "https://beian.miit.gov.cn/"
            "收款账户" -> ""
            "宣传合规性" -> "http://www.csrc.gov.cn/"
            else -> ""
        }
    }

    /**
     * 检测文本是否包含投资类关键词
     * 供外部调用判断是否应进入投资场景
     *
     * @param text 待检测文本
     * @return 是否为投资场景
     */
    fun isInvestmentScene(text: String?): Boolean {
        if (text.isNullOrBlank()) return false
        return investmentKeywords.any { keyword ->
            text.contains(keyword, ignoreCase = true)
        }
    }
}
