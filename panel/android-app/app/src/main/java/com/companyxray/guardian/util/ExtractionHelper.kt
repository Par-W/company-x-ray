package com.companyxray.guardian.util

import android.view.accessibility.AccessibilityNodeInfo
import com.companyxray.guardian.data.PageScene
import com.companyxray.guardian.data.PaymentInfo

/**
 * 页面内容提取助手
 * 从 AccessibilityNodeInfo 树中提取文本、金额、商家名称等关键信息
 */
object ExtractionHelper {

    // ==================== 金额识别正则 ====================

    /**
     * 金额格式正则
     * 支持格式：¥12,800.00、￥100.00、12800元、100.00元、¥ 1,234.56 等
     */
    private val AMOUNT_PATTERNS = listOf(
        // ¥/￥ 符号开头，带千分位
        Regex("[¥￥]\\s*[\\d,]+(\\.\\d{1,2})?"),
        // 数字 + 元/块
        Regex("[\\d,]+(\\.\\d{1,2})?\\s*(元|块|圆)"),
        // 纯数字金额（需结合上下文判断，这里仅作为候选）
        Regex("(?<=金额|付款|支付|转账|收款)[:：\\s]*[\\d,]+(\\.\\d{1,2})?")
    )

    // ==================== 商家/收款方识别关键词 ====================

    /** 收款方名称关键词前缀 */
    private val PAYEE_KEYWORDS = listOf(
        "收款方", "收款人", "付款给", "支付给", "转账给",
        "商户名称", "商户名", "商家名称", "商家",
        "对方", "对方账户", "对方昵称",
        "收款账户", "收款单位", "收款商家",
        "向", "给"
    )

    /** 支付场景关键词 */
    private val PAYMENT_SCENE_KEYWORDS = listOf(
        "付款", "支付", "转账", "收款", "确认支付",
        "立即支付", "立即付款", "确认付款",
        "微信支付", "支付宝", "银联支付",
        "订单金额", "支付金额", "付款金额", "转账金额",
        "收钱", "扫码付款", "付款码", "收款码"
    )

    /** 聊天场景关键词 */
    private val CHAT_SCENE_KEYWORDS = listOf(
        "发送", "发消息", "语音", "视频通话",
        "朋友圈", "聊天", "消息", "会话"
    )

    /** 落地页/网页场景关键词 */
    private val LANDING_PAGE_KEYWORDS = listOf(
        "地址栏", "网页", "浏览器", "http", "https",
        "下载", "安装", "点击领取", "立即抢购",
        "限时优惠", "马上参与"
    )

    // ==================== 高风险关键词 ====================

    /** 高风险话术关键词（诈骗常见诱导词汇） */
    private val HIGH_RISK_KEYWORDS = listOf(
        // 投资理财类
        "加盟", "投资", "荐股", "理财", "贷款",
        "保本", "高收益", "稳赚不赔", "零风险",
        "内幕消息", "老师带单", "涨停", "原始股",
        "虚拟货币", "区块链", "数字货币",

        // 冒充类
        "公安局", "检察院", "法院", "国家安全局",
        "银监会", "证监会", "医保局", "社保局",
        "通缉令", "逮捕令", "资金清查", "账户冻结",
        "安全账户", "验资账户",

        // 虚假中奖类
        "中奖", "恭喜您", "特等奖", "一等奖",
        "免费领取", "限时领取", "仅此一天",

        // 刷单类
        "刷单", "刷信誉", "佣金", "任务", "做单",
        "返现", "返利"
    )

    // ==================== 支付类App包名 ====================

    /** 支付类 App 包名列表 */
    val PAYMENT_APP_PACKAGES = setOf(
        // 微信
        "com.tencent.mm",
        // 支付宝
        "com.eg.android.AlipayGphone",
        // 手机银行（常见）
        "com.icbc",                          // 工商银行
        "com.ccb.smartbank",                 // 建设银行
        "com.boc.mobile",                    // 中国银行
        "com.abc.mobilebank",                // 农业银行
        "com.bankcomm.maidanbaoma",          // 交通银行
        "com.cmb.pb",                        // 招商银行
        "com.spdb.mobilebanking",            // 浦发银行
        "com.cmbc.mobilebank",               // 民生银行
        "com.cib.cibmb",                     // 兴业银行
        "com.citiccard.mobilebank",          // 中信银行
        "com.pingan.paces.ccms",             // 平安银行
        "com.gdb.mobile",                    // 广发银行
        "com.hxb.mobilebank",                // 华夏银行
        // 云闪付
        "com.unionpay",
        // QQ
        "com.tencent.mobileqq",
        // 京东
        "com.jingdong.app.mall",
        // 美团
        "com.sankuai.meituan",
        // 拼多多
        "com.xunmeng.pinduoduo",
        // 淘宝
        "com.taobao.taobao",
        // 抖音
        "com.ss.android.ugc.aweme"
    )

    // ==================== 文本提取 ====================

    /**
     * 递归遍历 AccessibilityNodeInfo 树，提取所有可见文本
     *
     * @param root 根节点
     * @return 所有文本内容列表（按出现顺序）
     */
    fun extractAllTexts(root: AccessibilityNodeInfo?): List<String> {
        val texts = mutableListOf<String>()
        if (root == null) return texts

        // 提取当前节点的文本
        val text = root.text
        if (!text.isNullOrBlank()) {
            texts.add(text.toString().trim())
        }

        // 提取 contentDescription
        val contentDesc = root.contentDescription
        if (!contentDesc.isNullOrBlank()) {
            val descStr = contentDesc.toString().trim()
            if (descStr !in texts) {
                texts.add(descStr)
            }
        }

        // 递归遍历子节点
        val childCount = root.childCount
        for (i in 0 until childCount) {
            val child = root.getChild(i)
            if (child != null) {
                texts.addAll(extractAllTexts(child))
            }
        }

        return texts
    }

    /**
     * 提取所有文本为单个字符串（用换行连接）
     */
    fun extractAllTextCombined(root: AccessibilityNodeInfo?): String {
        return extractAllTexts(root).joinToString("\n")
    }

    // ==================== 金额识别 ====================

    /**
     * 从文本列表中识别金额
     *
     * @param texts 文本列表
     * @return 金额文本和对应的数值（单位：元），如果未找到返回 null
     */
    fun extractAmount(texts: List<String>): Pair<String, Double>? {
        // 优先匹配带 ¥/￥ 符号的金额
        for (pattern in AMOUNT_PATTERNS) {
            for (text in texts) {
                val matchResult = pattern.find(text)
                if (matchResult != null) {
                    val amountText = matchResult.value.trim()
                    val amountValue = parseAmountValue(amountText)
                    if (amountValue != null && amountValue > 0) {
                        return Pair(amountText, amountValue)
                    }
                }
            }
        }
        return null
    }

    /**
     * 解析金额字符串为数值
     * 例如："¥12,800.00" -> 12800.00，"100元" -> 100.0
     */
    private fun parseAmountValue(amountText: String): Double? {
        return try {
            // 移除 ¥、￥、元、块、圆、逗号、空格等
            val cleaned = amountText
                .replace("[¥￥元块圆,]".toRegex(), "")
                .replace("\\s".toRegex(), "")
                .trim()
            cleaned.toDoubleOrNull()
        } catch (e: Exception) {
            null
        }
    }

    // ==================== 商家/收款方识别 ====================

    /**
     * 从文本列表中提取收款方/商家名称
     *
     * @param texts 文本列表
     * @return 收款方名称，如果未找到返回 null
     */
    fun extractPayeeName(texts: List<String>): String? {
        for (i in texts.indices) {
            val text = texts[i]
            for (keyword in PAYEE_KEYWORDS) {
                if (text.contains(keyword)) {
                    // 尝试从同一行提取名称
                    val nameFromSameLine = extractNameAfterKeyword(text, keyword)
                    if (nameFromSameLine != null) {
                        return nameFromSameLine
                    }
                    // 否则取下一行作为名称
                    if (i + 1 < texts.size) {
                        val nextText = texts[i + 1].trim()
                        if (nextText.isNotEmpty() && !nextText.contains(keyword)
                            && !nextText.contains("金额") && !nextText.contains("元")) {
                            return nextText
                        }
                    }
                }
            }
        }
        return null
    }

    /**
     * 从同一行文本中，关键词后面提取名称
     */
    private fun extractNameAfterKeyword(text: String, keyword: String): String? {
        val index = text.indexOf(keyword)
        if (index < 0) return null

        val afterKeyword = text.substring(index + keyword.length)
            .trim()
            .trimStart(':', '：', ' ')
            .trim()

        if (afterKeyword.isEmpty()) return null

        // 如果剩余内容包含金额关键词，就不是名称
        if (afterKeyword.contains(Regex("[\\d.]+元")) || afterKeyword.contains("¥")) {
            return null
        }

        // 取前 30 个字符作为名称（避免过长）
        return if (afterKeyword.length <= 30) {
            afterKeyword
        } else {
            afterKeyword.take(30)
        }
    }

    // ==================== 场景识别 ====================

    /**
     * 识别页面场景类型
     *
     * @param texts 页面文本列表
     * @param packageName 当前应用包名
     * @return 页面场景
     */
    fun detectScene(texts: List<String>, packageName: String?): PageScene {
        val combinedText = texts.joinToString(" ")

        // 支付场景：包含支付关键词，或在支付类App中且有金额
        val hasPaymentKeyword = PAYMENT_SCENE_KEYWORDS.any { combinedText.contains(it) }
        val hasAmount = extractAmount(texts) != null
        if (hasPaymentKeyword && hasAmount) {
            return PageScene.PAYMENT
        }
        if (packageName in PAYMENT_APP_PACKAGES && hasPaymentKeyword) {
            return PageScene.PAYMENT
        }

        // 聊天场景
        val hasChatKeyword = CHAT_SCENE_KEYWORDS.any { combinedText.contains(it) }
        if (hasChatKeyword && !hasPaymentKeyword) {
            return PageScene.CHAT
        }

        // 落地页/网页场景
        val hasLandingKeyword = LANDING_PAGE_KEYWORDS.any { combinedText.contains(it) }
        if (hasLandingKeyword) {
            return PageScene.LANDING_PAGE
        }

        return PageScene.UNKNOWN
    }

    // ==================== 风险关键词匹配 ====================

    /**
     * 匹配高风险关键词
     *
     * @param texts 文本列表
     * @return 匹配到的风险关键词列表
     */
    fun matchRiskKeywords(texts: List<String>): List<String> {
        val combinedText = texts.joinToString(" ")
        return HIGH_RISK_KEYWORDS.filter { keyword ->
            combinedText.contains(keyword, ignoreCase = true)
        }
    }

    /**
     * 计算风险关键词匹配程度（0-100）
     */
    fun calculateKeywordRiskScore(texts: List<String>): Int {
        val matchedKeywords = matchRiskKeywords(texts)
        if (matchedKeywords.isEmpty()) return 0

        // 根据匹配数量计算分数，最多 100 分
        val score = (matchedKeywords.size * 20).coerceAtMost(100)
        return score
    }

    // ==================== 综合提取 ====================

    /**
     * 综合提取支付页面信息
     *
     * @param rootNode 根节点
     * @param packageName 当前应用包名
     * @return 提取的支付信息
     */
    fun extractPaymentInfo(rootNode: AccessibilityNodeInfo?, packageName: String?): PaymentInfo {
        val allTexts = extractAllTexts(rootNode)

        if (allTexts.isEmpty()) {
            return PaymentInfo(
                packageName = packageName,
                scene = PageScene.UNKNOWN,
                allTexts = emptyList(),
                isExtracted = false
            )
        }

        val amountResult = extractAmount(allTexts)
        val payeeName = extractPayeeName(allTexts)
        val scene = detectScene(allTexts, packageName)

        // 只有在支付场景且提取到金额时才算成功提取
        val isExtracted = scene == PageScene.PAYMENT && amountResult != null

        return PaymentInfo(
            payeeName = payeeName,
            amountText = amountResult?.first,
            amount = amountResult?.second,
            merchantName = payeeName,
            packageName = packageName,
            scene = scene,
            allTexts = allTexts,
            isExtracted = isExtracted
        )
    }

    /**
     * 判断是否为支付类 App
     */
    fun isPaymentApp(packageName: String?): Boolean {
        return packageName in PAYMENT_APP_PACKAGES
    }
}
