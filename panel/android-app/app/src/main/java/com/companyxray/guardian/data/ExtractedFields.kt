package com.companyxray.guardian.data

/**
 * 从当前页面提取的字段信息
 *
 * 由无障碍服务从界面元素中提取，作为风险引擎的输入。
 * 所有字段均为可空，因为不一定能从每个页面都提取到全部信息。
 */
data class ExtractedFields(
    /** 声称的品牌名称，如"蜜雪冰城""鹿角湾"等 */
    val claimedBrand: String? = null,

    /** 对方主体名称，如公司名、店铺名等 */
    val counterpartEntity: String? = null,

    /** 收款账号/银行卡号/微信号等 */
    val account: String? = null,

    /** 交易金额，单位为元 */
    val amount: Double? = null,

    /** 落地域名，当前页面的网址或小程序原始 ID */
    val landingDomain: String? = null,

    /**
     * 窗口类型，用于识别当前场景
     * 如：payment（支付页）、chat（聊天页）、browser（浏览器页）
     */
    val windowType: String? = null,

    /**
     * 来源应用包名
     * 如：com.tencent.mm（微信）、com.ss.android.ugc.aweme（抖音）
     */
    val sourcePkg: String? = null
) {
    /**
     * 判断是否有足够的信息进行风险检测
     * 至少需要品牌名或主体名称之一
     */
    fun hasEnoughInfo(): Boolean {
        return !claimedBrand.isNullOrBlank() || !counterpartEntity.isNullOrBlank()
    }

    /**
     * 获取用于显示的商家名称
     * 优先使用 claimedBrand，其次使用 counterpartEntity
     */
    fun displayMerchantName(): String {
        return when {
            !claimedBrand.isNullOrBlank() -> claimedBrand
            !counterpartEntity.isNullOrBlank() -> counterpartEntity
            else -> "未知商家"
        }
    }
}
