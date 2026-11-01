package com.companyxray.guardian.data

/**
 * 页面场景类型
 */
enum class PageScene {
    /** 支付场景（转账、付款等） */
    PAYMENT,
    /** 聊天场景（微信聊天、QQ聊天等） */
    CHAT,
    /** 落地页/网页（H5页面、浏览器页面等） */
    LANDING_PAGE,
    /** 未知场景 */
    UNKNOWN
}
