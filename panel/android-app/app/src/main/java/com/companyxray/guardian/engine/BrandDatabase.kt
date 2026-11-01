package com.companyxray.guardian.engine

import com.companyxray.guardian.data.RiskLevel
import org.json.JSONArray
import org.json.JSONObject

/**
 * 本地品牌数据库
 *
 * 使用 JSON 字符串内嵌品牌数据，包含品牌的六锚点官方信息。
 * 风险引擎通过比对提取信息与数据库记录，判断信息是否一致。
 *
 * 数据来源说明：
 * - 商标信息：国家知识产权局商标局
 * - 特许经营备案：商务部商业特许经营信息管理系统
 * - ICP 备案：工信部 ICP/IP 地址/域名信息备案管理系统
 * - 蓝V认证：抖音/微博等平台官方认证
 *
 * 注意：本数据库仅用于演示和本地验证，实际使用时应接入
 * 官方查询接口获取最新数据。
 */
object BrandDatabase {

    /**
     * 内嵌的品牌数据库 JSON
     *
     * 每个品牌包含：
     * - brandName: 品牌名称
     * - officialEntity: 官方主体（公司全称）
     * - riskLevel: 预置风险等级（green/yellow/red_hard）
     * - anchors: 六锚点数据
     *   - trademark: 商标信息
     *   - franchise: 特许经营备案信息
     *   - icp: ICP 备案信息
     *   - blueV: 蓝V认证信息
     *   - contract: 签约主体信息
     *   - payment: 收款账户信息
     * - sourceUrls: 各锚点官方查询链接
     * - remark: 备注说明
     */
    private const val BRAND_DATABASE_JSON = """
    {
      "brands": [
        {
          "brandName": "蜜雪冰城",
          "officialEntity": "蜜雪冰城股份有限公司",
          "riskLevel": "green",
          "anchors": {
            "trademark": {
              "status": "registered",
              "registrant": "蜜雪冰城股份有限公司",
              "regNumber": "第8972348号",
              "category": "第43类-餐饮住宿"
            },
            "franchise": {
              "status": "filed",
              "filingEntity": "蜜雪冰城股份有限公司",
              "filingNumber": "0410000700900001",
              "firstFilingDate": "2012-05-18"
            },
            "icp": {
              "status": "filed",
              "domain": "mxbc.com",
              "filingEntity": "蜜雪冰城股份有限公司",
              "icpNumber": "豫ICP备16031583号-1"
            },
            "blueV": {
              "status": "verified",
              "platform": "抖音",
              "accountName": "蜜雪冰城",
              "verifyInfo": "蜜雪冰城股份有限公司"
            },
            "contract": {
              "status": "consistent",
              "signatoryEntity": "蜜雪冰城股份有限公司",
              "contractType": "特许经营合同"
            },
            "payment": {
              "status": "consistent",
              "payeeEntity": "蜜雪冰城股份有限公司",
              "bank": "中国工商银行郑州行政区支行"
            }
          },
          "sourceUrls": {
            "trademark": "https://sbj.cnipa.gov.cn/sbcx/",
            "franchise": "https://txjy.syggs.mofcom.gov.cn/",
            "icp": "https://beian.miit.gov.cn/",
            "blueV": "https://www.douyin.com/",
            "contract": "https://txjy.syggs.mofcom.gov.cn/",
            "payment": "https://www.mxbc.com/"
          },
          "remark": "国内知名连锁茶饮品牌，各项资质齐全，信息可在官方渠道核实。"
        },
        {
          "brandName": "雪王冻品",
          "officialEntity": "河南雪王冻品优选餐饮管理有限公司",
          "riskLevel": "red_hard",
          "anchors": {
            "trademark": {
              "status": "mismatch",
              "claimedBrand": "雪王冻品",
              "actualRegistrant": "河南雪王冻品优选餐饮管理有限公司",
              "note": "与蜜雪冰城旗下'雪王'商标无关联，易产生混淆"
            },
            "franchise": {
              "status": "not_found",
              "searchedEntity": "河南雪王冻品优选餐饮管理有限公司",
              "note": "商务部特许经营备案系统中查无此公司备案记录"
            },
            "icp": {
              "status": "not_found",
              "searchedDomain": "xuewangdongpin.com",
              "note": "未查询到对应域名的 ICP 备案信息"
            },
            "blueV": {
              "status": "not_found",
              "searchedAccount": "雪王冻品",
              "note": "未查询到官方蓝V认证账号"
            },
            "contract": {
              "status": "mismatch",
              "claimedRelation": "蜜雪冰城旗下品牌",
              "actualEntity": "河南雪王冻品优选餐饮管理有限公司",
              "note": "签约主体与声称的品牌关联方不一致"
            },
            "payment": {
              "status": "mismatch",
              "payeeAccount": "个人账户",
              "note": "收款账户为个人账户，非公司对公账户"
            }
          },
          "sourceUrls": {
            "trademark": "https://sbj.cnipa.gov.cn/sbcx/",
            "franchise": "https://txjy.syggs.mofcom.gov.cn/",
            "icp": "https://beian.miit.gov.cn/",
            "blueV": "https://www.douyin.com/",
            "contract": "https://txjy.syggs.mofcom.gov.cn/",
            "payment": "https://www.mxbc.com/"
          },
          "remark": "公司名称含'雪王'字样，易与蜜雪冰城'雪王'IP产生混淆。多项资质查无记录，与声称的知名品牌背景不符。"
        },
        {
          "brandName": "鹿角湾",
          "officialEntity": "上海鹿角湾餐饮管理有限公司",
          "riskLevel": "yellow",
          "anchors": {
            "trademark": {
              "status": "registered",
              "registrant": "上海鹿角湾餐饮管理有限公司",
              "regNumber": "第39678221号",
              "category": "第43类-餐饮住宿"
            },
            "franchise": {
              "status": "time_lag",
              "filingEntity": "上海鹿角湾餐饮管理有限公司",
              "note": "商标注册已满一年，但特许经营备案可能存在时滞，建议核实后再签约"
            },
            "icp": {
              "status": "filed",
              "domain": "lujiaowan.com",
              "filingEntity": "上海鹿角湾餐饮管理有限公司",
              "icpNumber": "沪ICP备2021087654号-1"
            },
            "blueV": {
              "status": "verified",
              "platform": "抖音",
              "accountName": "鹿角湾茶饮",
              "verifyInfo": "上海鹿角湾餐饮管理有限公司"
            },
            "contract": {
              "status": "consistent",
              "signatoryEntity": "上海鹿角湾餐饮管理有限公司",
              "contractType": "特许经营合同"
            },
            "payment": {
              "status": "consistent",
              "payeeEntity": "上海鹿角湾餐饮管理有限公司",
              "bank": "中国建设银行上海静安支行"
            }
          },
          "sourceUrls": {
            "trademark": "https://sbj.cnipa.gov.cn/sbcx/",
            "franchise": "https://txjy.syggs.mofcom.gov.cn/",
            "icp": "https://beian.miit.gov.cn/",
            "blueV": "https://www.douyin.com/",
            "contract": "https://txjy.syggs.mofcom.gov.cn/",
            "payment": "https://www.lujiaowan.com/"
          },
          "remark": "新品牌，商标和ICP可查，但特许经营备案可能因时间差尚未更新。属于正常备案时滞情况，建议签约前再次核实。"
        }
      ]
    }
    """.trimIndent()

    /** 解析后的品牌数据列表 */
    private val brandList: List<BrandInfo> by lazy {
        parseBrandDatabase()
    }

    /**
     * 根据品牌名称查找品牌信息
     *
     * @param brandName 品牌名称
     * @return 品牌信息，未找到返回 null
     */
    fun findBrand(brandName: String?): BrandInfo? {
        if (brandName.isNullOrBlank()) return null
        // 模糊匹配：包含品牌名即可
        return brandList.firstOrNull {
            brandName.contains(it.brandName, ignoreCase = true) ||
                    it.brandName.contains(brandName, ignoreCase = true)
        }
    }

    /**
     * 根据公司主体名称查找品牌信息
     *
     * @param entity 公司主体名称
     * @return 品牌信息，未找到返回 null
     */
    fun findByEntity(entity: String?): BrandInfo? {
        if (entity.isNullOrBlank()) return null
        return brandList.firstOrNull {
            entity.contains(it.officialEntity, ignoreCase = true) ||
                    it.officialEntity.contains(entity, ignoreCase = true)
        }
    }

    /**
     * 获取所有品牌列表
     */
    fun getAllBrands(): List<BrandInfo> = brandList

    /**
     * 解析 JSON 数据库
     */
    private fun parseBrandDatabase(): List<BrandInfo> {
        val jsonObject = JSONObject(BRAND_DATABASE_JSON)
        val brandsArray = jsonObject.getJSONArray("brands")
        val result = mutableListOf<BrandInfo>()

        for (i in 0 until brandsArray.length()) {
            val brandJson = brandsArray.getJSONObject(i)
            result.add(BrandInfo.fromJson(brandJson))
        }

        return result
    }

    /**
     * 品牌信息数据类
     */
    data class BrandInfo(
        /** 品牌名称 */
        val brandName: String,
        /** 官方主体（公司全称） */
        val officialEntity: String,
        /** 预置风险等级 */
        val riskLevel: RiskLevel,
        /** 六锚点数据 */
        val anchors: AnchorData,
        /** 各锚点官方查询链接 */
        val sourceUrls: SourceUrls,
        /** 备注说明 */
        val remark: String
    ) {
        companion object {
            fun fromJson(json: JSONObject): BrandInfo {
                val anchorsJson = json.getJSONObject("anchors")
                val sourceUrlsJson = json.getJSONObject("sourceUrls")

                return BrandInfo(
                    brandName = json.getString("brandName"),
                    officialEntity = json.getString("officialEntity"),
                    riskLevel = when (json.getString("riskLevel")) {
                        "green" -> RiskLevel.GREEN
                        "yellow" -> RiskLevel.YELLOW
                        "red_soft" -> RiskLevel.RED_SOFT
                        "red_hard" -> RiskLevel.RED_HARD
                        else -> RiskLevel.GREEN
                    },
                    anchors = AnchorData.fromJson(anchorsJson),
                    sourceUrls = SourceUrls.fromJson(sourceUrlsJson),
                    remark = json.optString("remark", "")
                )
            }
        }
    }

    /**
     * 六锚点数据
     */
    data class AnchorData(
        /** 商标信息 */
        val trademark: AnchorDetail,
        /** 特许经营备案信息 */
        val franchise: AnchorDetail,
        /** ICP 备案信息 */
        val icp: AnchorDetail,
        /** 蓝V认证信息 */
        val blueV: AnchorDetail,
        /** 签约主体信息 */
        val contract: AnchorDetail,
        /** 收款账户信息 */
        val payment: AnchorDetail
    ) {
        companion object {
            fun fromJson(json: JSONObject): AnchorData {
                return AnchorData(
                    trademark = AnchorDetail.fromJson(json.getJSONObject("trademark")),
                    franchise = AnchorDetail.fromJson(json.getJSONObject("franchise")),
                    icp = AnchorDetail.fromJson(json.getJSONObject("icp")),
                    blueV = AnchorDetail.fromJson(json.getJSONObject("blueV")),
                    contract = AnchorDetail.fromJson(json.getJSONObject("contract")),
                    payment = AnchorDetail.fromJson(json.getJSONObject("payment"))
                )
            }
        }

        /**
         * 获取指定名称的锚点详情
         */
        fun getByName(name: String): AnchorDetail? {
            return when (name) {
                "商标注册" -> trademark
                "特许经营备案" -> franchise
                "ICP备案" -> icp
                "蓝V认证" -> blueV
                "签约主体" -> contract
                "收款账户" -> payment
                else -> null
            }
        }
    }

    /**
     * 单个锚点详情
     */
    data class AnchorDetail(
        /**
         * 状态：
         * - registered/filed/verified/consistent：通过/一致
         * - not_found：查无记录
         * - mismatch：不一致
         * - time_lag：备案时滞
         */
        val status: String,
        /** 详细字段，不同锚点有不同字段 */
        val fields: Map<String, String>,
        /** 说明/备注 */
        val note: String?
    ) {
        companion object {
            fun fromJson(json: JSONObject): AnchorDetail {
                val fields = mutableMapOf<String, String>()
                val keys = json.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    if (key != "status" && key != "note") {
                        fields[key] = json.optString(key, "")
                    }
                }
                return AnchorDetail(
                    status = json.optString("status", "unknown"),
                    fields = fields,
                    note = json.optString("note", null)
                )
            }
        }

        /**
         * 是否为通过状态
         */
        fun isPass(): Boolean {
            return status in setOf("registered", "filed", "verified", "consistent")
        }

        /**
         * 是否为查无记录
         */
        fun isNotFound(): Boolean = status == "not_found"

        /**
         * 是否为不一致
         */
        fun isMismatch(): Boolean = status == "mismatch"

        /**
         * 是否为备案时滞
         */
        fun isTimeLag(): Boolean = status == "time_lag"

        /**
         * 获取用于展示的预期值文字
         */
        fun getExpectedText(): String {
            return when {
                fields.isNotEmpty() -> {
                    fields.entries.joinToString("、") { (k, v) ->
                        "${translateKey(k)}: $v"
                    }
                }
                else -> note ?: ""
            }
        }

        /**
         * 翻译字段名为中文
         */
        private fun translateKey(key: String): String {
            return when (key) {
                "registrant" -> "注册人"
                "regNumber" -> "注册号"
                "category" -> "类别"
                "filingEntity" -> "备案主体"
                "filingNumber" -> "备案号"
                "firstFilingDate" -> "首次备案日期"
                "domain" -> "域名"
                "icpNumber" -> "ICP号"
                "platform" -> "平台"
                "accountName" -> "账号名称"
                "verifyInfo" -> "认证信息"
                "signatoryEntity" -> "签约主体"
                "contractType" -> "合同类型"
                "payeeEntity" -> "收款方"
                "bank" -> "开户银行"
                "searchedEntity" -> "查询主体"
                "searchedDomain" -> "查询域名"
                "searchedAccount" -> "查询账号"
                "claimedBrand" -> "声称品牌"
                "actualRegistrant" -> "实际注册人"
                "claimedRelation" -> "声称关系"
                "actualEntity" -> "实际主体"
                "payeeAccount" -> "收款账户"
                else -> key
            }
        }
    }

    /**
     * 各锚点官方查询链接
     */
    data class SourceUrls(
        val trademark: String,
        val franchise: String,
        val icp: String,
        val blueV: String,
        val contract: String,
        val payment: String
    ) {
        companion object {
            fun fromJson(json: JSONObject): SourceUrls {
                return SourceUrls(
                    trademark = json.optString("trademark", ""),
                    franchise = json.optString("franchise", ""),
                    icp = json.optString("icp", ""),
                    blueV = json.optString("blueV", ""),
                    contract = json.optString("contract", ""),
                    payment = json.optString("payment", "")
                )
            }
        }

        /**
         * 根据锚点名称获取查询链接
         */
        fun getByName(name: String): String {
            return when (name) {
                "商标注册" -> trademark
                "特许经营备案" -> franchise
                "ICP备案" -> icp
                "蓝V认证" -> blueV
                "签约主体" -> contract
                "收款账户" -> payment
                else -> ""
            }
        }
    }
}
