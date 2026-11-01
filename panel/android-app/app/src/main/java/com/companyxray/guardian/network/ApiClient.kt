package com.companyxray.guardian.network

import android.content.Context
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * 网络客户端
 *
 * 封装 OkHttp + Gson，提供后端 API 调用能力。
 * 严格对齐 docs/protocol.md 中的 5 个接口契约：
 * 1. POST /api/v1/verdict    - 提交事件，返回风险判定
 * 2. GET  /api/v1/brand/{name} - 查询品牌锚点表
 * 3. POST /api/v1/alerts     - 写入一条告警
 * 4. GET  /api/v1/group/{id}/alerts - 家人端告警列表
 * 5. POST /api/v1/whitelist  - 企业自证进白名单
 *
 * 单例模式，通过 getInstance(context) 获取实例。
 * 所有网络请求在 Dispatchers.IO 协程中执行，异常时返回 null 或 false，不崩溃。
 */
class ApiClient private constructor(private val context: Context) {

    /** JSON 序列化工具 */
    private val gson = Gson()

    /** 后端基础地址，默认指向 Android 模拟器访问本机的地址 */
    var baseUrl: String = DEFAULT_BASE_URL
        private set

    /** OkHttp 客户端 */
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    companion object {
        /** 默认基础地址：Android 模拟器访问本地电脑的地址 */
        private const val DEFAULT_BASE_URL = "http://10.0.2.2:8000"

        /** JSON 媒体类型 */
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

        @Volatile
        private var instance: ApiClient? = null

        /**
         * 获取单例实例
         *
         * @param context 上下文（内部自动使用 applicationContext）
         */
        fun getInstance(context: Context): ApiClient {
            return instance ?: synchronized(this) {
                instance ?: ApiClient(context.applicationContext).also { instance = it }
            }
        }
    }

    // ==================== 公共方法 ====================

    /**
     * 动态设置后端基础地址
     *
     * @param url 新的基础地址，如 "http://192.168.1.100:8000"
     */
    fun setBaseUrl(url: String) {
        baseUrl = url.trimEnd('/')
    }

    // ==================== 请求/响应数据模型 ====================
    // 以下数据类严格对应 protocol.md 中的字段定义，使用 @SerializedName 映射 snake_case

    // ---------- 事件相关 ----------

    /**
     * 感知事件请求体（POST /api/v1/verdict）
     * 对应协议第 1 节 Event 结构
     */
    data class EventRequest(
        /** 事件唯一标识 */
        @SerializedName("event_id") val eventId: String,
        /** 事件发生时间，ISO 8601 格式 */
        @SerializedName("ts") val ts: String,
        /** 设备 ID */
        @SerializedName("device_id") val deviceId: String,
        /** 来源应用包名 */
        @SerializedName("source_pkg") val sourcePkg: String,
        /** 窗口类型：webview | chat | payment | contract | sms */
        @SerializedName("window_type") val windowType: String,
        /** 窗口明文文本 */
        @SerializedName("text") val text: String,
        /** 提取字段 */
        @SerializedName("extracted") val extracted: ExtractedFieldsRequest,
        /** 场景：payment | chat | landing_page | install */
        @SerializedName("scenario") val scenario: String
    )

    /**
     * 事件提取字段（EventRequest 的子对象）
     */
    data class ExtractedFieldsRequest(
        /** 声称的品牌名称 */
        @SerializedName("claimed_brand") val claimedBrand: String?,
        /** 对方主体名称（公司名等） */
        @SerializedName("counterpart_entity") val counterpartEntity: String?,
        /** 收款账号（对公/微信/商户码，可空） */
        @SerializedName("account") val account: String?,
        /** 账号类型：personal | corporate | unknown（可空，缺省 unknown） */
        @SerializedName("account_type") val accountType: String? = "unknown",
        /** 交易金额，单位元 */
        @SerializedName("amount") val amount: Double?,
        /** 落地域名 */
        @SerializedName("landing_domain") val landingDomain: String?
    )

    // ---------- 判定结果相关 ----------

    /**
     * 风险判定响应体（POST /api/v1/verdict 返回）
     * 对应协议第 2 节 Verdict 结构
     */
    data class VerdictResponse(
        /** 事件唯一标识，与请求对应 */
        @SerializedName("event_id") val eventId: String,
        /** 风险等级：red_hard | red_soft | yellow | green */
        @SerializedName("level") val level: String,
        /** 健康分（0-100，可选），仅供展示，不参与判级 */
        @SerializedName("score") val score: Int?,
        /** 六锚点验证结果列表 */
        @SerializedName("anchors") val anchors: List<AnchorResultResponse>,
        /** 是否需要通知家人 */
        @SerializedName("family_notify") val familyNotify: Boolean,
        /** 建议话术，长辈友好的提醒文字 */
        @SerializedName("advice_phrase") val advicePhrase: String,
        /** 透明度评分（0-100，可选） */
        @SerializedName("transparency") val transparency: Int?
    )

    /**
     * 单个锚点验证结果（VerdictResponse 的子对象）
     */
    data class AnchorResultResponse(
        /** 锚点名称，如"特许经营备案" */
        @SerializedName("name") val name: String,
        /** 官方预期值（数据库中记录的正确信息） */
        @SerializedName("expected") val expected: String?,
        /** 实际提取到的信息 */
        @SerializedName("actual") val actual: String?,
        /** 验证结果：true=通过 false=不通过 null=无法核实 */
        @SerializedName("pass") val pass: Boolean?,
        /** 查证来源链接，可独立复核 */
        @SerializedName("source_url") val sourceUrl: String,
        /** 证据说明，事实表述（查无记录/主体不一致等） */
        @SerializedName("evidence") val evidence: String
    )

    // ---------- 品牌查询相关 ----------

    /**
     * 品牌信息响应体（GET /api/v1/brand/{name} 返回）
     */
    data class BrandInfoResponse(
        /** 品牌名称 */
        @SerializedName("brand") val brand: String,
        /** 风险等级：green | yellow | red_soft | red_hard */
        @SerializedName("level") val level: String,
        /** 健康分（0-100） */
        @SerializedName("score") val score: Int,
        /** 透明度评分（0-100） */
        @SerializedName("transparency") val transparency: Int,
        /** 复核状态 */
        @SerializedName("review_status") val reviewStatus: String,
        /** 六锚点验证结果列表 */
        @SerializedName("anchors") val anchors: List<AnchorResultResponse>
    )

    // ---------- 告警相关 ----------

    /**
     * 告警写入请求体（POST /api/v1/alerts）
     * 付款页"一键通知家人"触发
     */
    data class AlertSendRequest(
        /** 事件 ID */
        @SerializedName("event_id") val eventId: String,
        /** 群组 ID（家庭组） */
        @SerializedName("group_id") val groupId: String,
        /** 品牌（宣称） */
        @SerializedName("brand") val brand: String,
        /** 对方主体名称 */
        @SerializedName("counterpart_entity") val counterpartEntity: String,
        /** 交易金额，单位元 */
        @SerializedName("amount") val amount: Double?,
        /** 风险等级：red_hard | red_soft | yellow | green */
        @SerializedName("level") val level: String,
        /** 建议话术 */
        @SerializedName("advice_phrase") val advicePhrase: String
    )

    /**
     * 告警写入响应体
     */
    data class AlertSendResponse(
        /** 是否成功 */
        @SerializedName("ok") val ok: Boolean,
        /** 告警 ID（成功时返回） */
        @SerializedName("alert_id") val alertId: Int?
    )

    /**
     * 家人端告警列表响应体（GET /api/v1/group/{id}/alerts 返回）
     */
    data class GroupAlertsResponse(
        /** 群组 ID */
        @SerializedName("group_id") val groupId: String,
        /** 告警列表 */
        @SerializedName("alerts") val alerts: List<AlertItemResponse>
    )

    /**
     * 单条告警记录（GroupAlertsResponse 的子对象）
     */
    data class AlertItemResponse(
        /** 告警 ID */
        @SerializedName("alert_id") val alertId: Int,
        /** 事件 ID */
        @SerializedName("event_id") val eventId: String,
        /** 告警时间，ISO 8601 格式 */
        @SerializedName("ts") val ts: String,
        /** 品牌（宣称） */
        @SerializedName("brand") val brand: String,
        /** 对方主体名称 */
        @SerializedName("counterpart_entity") val counterpartEntity: String,
        /** 交易金额，单位元 */
        @SerializedName("amount") val amount: Double?,
        /** 风险等级 */
        @SerializedName("level") val level: String,
        /** 建议话术 */
        @SerializedName("advice_phrase") val advicePhrase: String,
        /** 状态：new（仅 new，置灰由前端本机处理） */
        @SerializedName("status") val status: String
    )

    // ---------- 白名单相关 ----------

    /**
     * 企业自证进白名单请求体（POST /api/v1/whitelist）
     */
    data class WhitelistRequest(
        /** 主体名称（公司名） */
        @SerializedName("counterpart_entity") val counterpartEntity: String,
        /** 备案编号（可空） */
        @SerializedName("record_no") val recordNo: String?
    )

    /**
     * 白名单提交响应体
     */
    data class WhitelistResponse(
        /** 是否成功 */
        @SerializedName("ok") val ok: Boolean
    )

    // ==================== API 方法 ====================

    /**
     * 1. 提交事件，获取风险判定结果
     *
     * POST /api/v1/verdict
     * 接收 Event，返回 Verdict。
     *
     * @param event 感知事件请求体
     * @return 风险判定结果，失败时返回 null
     */
    suspend fun requestVerdict(event: EventRequest): VerdictResponse? =
        withContext(Dispatchers.IO) {
            try {
                val url = "$baseUrl/api/v1/verdict"
                val json = gson.toJson(event)
                val body = json.toRequestBody(JSON_MEDIA_TYPE)

                val request = Request.Builder()
                    .url(url)
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        gson.fromJson(responseBody, VerdictResponse::class.java)
                    } else {
                        null
                    }
                }
            } catch (e: IOException) {
                // 网络异常
                null
            } catch (e: Exception) {
                // 其他异常，如 JSON 解析失败
                e.printStackTrace()
                null
            }
        }

    /**
     * 2. 查询品牌锚点信息
     *
     * GET /api/v1/brand/{name}
     * 根据品牌名称查询品牌锚点表。
     * 未命中品牌时返回 HTTP 404，本方法返回 null。
     *
     * @param brandName 中文品牌名
     * @return 品牌信息，失败或查无时返回 null
     */
    suspend fun getBrandInfo(brandName: String): BrandInfoResponse? =
        withContext(Dispatchers.IO) {
            try {
                // URL 编码品牌名
                val encodedName = java.net.URLEncoder.encode(brandName, "UTF-8")
                val url = "$baseUrl/api/v1/brand/$encodedName"

                val request = Request.Builder()
                    .url(url)
                    .get()
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        gson.fromJson(responseBody, BrandInfoResponse::class.java)
                    } else {
                        // 404 或其他错误统一返回 null
                        null
                    }
                }
            } catch (e: IOException) {
                null
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }

    /**
     * 3. 写入一条告警
     *
     * POST /api/v1/alerts
     * 付款页"一键通知家人"触发。
     *
     * @param alert 告警请求体
     * @return 是否写入成功
     */
    suspend fun sendAlert(alert: AlertSendRequest): Boolean =
        withContext(Dispatchers.IO) {
            try {
                val url = "$baseUrl/api/v1/alerts"
                val json = gson.toJson(alert)
                val body = json.toRequestBody(JSON_MEDIA_TYPE)

                val request = Request.Builder()
                    .url(url)
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        val result = gson.fromJson(responseBody, AlertSendResponse::class.java)
                        result?.ok == true
                    } else {
                        false
                    }
                }
            } catch (e: IOException) {
                false
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }

    /**
     * 4. 获取家人端告警列表
     *
     * GET /api/v1/group/{id}/alerts
     * 家人端轮询获取告警列表（内存存储，重启清空，仅演示）。
     *
     * @param groupId 群组 ID
     * @return 告警列表响应，失败时返回 null
     */
    suspend fun getGroupAlerts(groupId: String): GroupAlertsResponse? =
        withContext(Dispatchers.IO) {
            try {
                val url = "$baseUrl/api/v1/group/$groupId/alerts"

                val request = Request.Builder()
                    .url(url)
                    .get()
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        gson.fromJson(responseBody, GroupAlertsResponse::class.java)
                    } else {
                        null
                    }
                }
            } catch (e: IOException) {
                null
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }

    /**
     * 5. 企业自证进白名单
     *
     * POST /api/v1/whitelist
     * 家人端"企业自证通道"表单提交。
     * 提交成功后，同主体的 Verdict 将判 green。
     *
     * @param entity 主体名称（公司名）
     * @param recordNo 备案编号（可空）
     * @return 是否提交成功
     */
    suspend fun submitWhitelist(entity: String, recordNo: String? = null): Boolean =
        withContext(Dispatchers.IO) {
            try {
                val requestBody = WhitelistRequest(
                    counterpartEntity = entity,
                    recordNo = recordNo
                )

                val url = "$baseUrl/api/v1/whitelist"
                val json = gson.toJson(requestBody)
                val body = json.toRequestBody(JSON_MEDIA_TYPE)

                val request = Request.Builder()
                    .url(url)
                    .post(body)
                    .addHeader("Content-Type", "application/json")
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val responseBody = response.body?.string()
                        val result = gson.fromJson(responseBody, WhitelistResponse::class.java)
                        result?.ok == true
                    } else {
                        false
                    }
                }
            } catch (e: IOException) {
                false
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }

    // ==================== 家人绑定相关（后端待实现） ====================
    // 以下接口为家人绑定与告警交互的预留位置，后端暂未实现
    // 当前仅作为骨架存在，实际业务逻辑由本地存储（PreferenceManager）承载

    // ---------- 家人绑定相关数据类 ----------

    /**
     * 绑定家人请求体（POST /api/v1/family/bind）
     * 提交邀请码以加入家庭组
     */
    data class FamilyBindRequest(
        /** 邀请码 */
        @SerializedName("invite_code") val inviteCode: String,
        /** 成员姓名 */
        @SerializedName("name") val name: String,
        /** 与本人关系 */
        @SerializedName("relation") val relation: String,
        /** 设备 ID */
        @SerializedName("device_id") val deviceId: String
    )

    /**
     * 绑定家人响应体
     */
    data class FamilyBindResponse(
        /** 是否成功 */
        @SerializedName("ok") val ok: Boolean,
        /** 群组 ID（成功时返回） */
        @SerializedName("group_id") val groupId: String?,
        /** 成员 ID（成功时返回） */
        @SerializedName("member_id") val memberId: String?
    )

    /**
     * 解绑家人请求体（POST /api/v1/family/unbind）
     */
    data class FamilyUnbindRequest(
        /** 成员 ID */
        @SerializedName("member_id") val memberId: String
    )

    /**
     * 解绑家人响应体
     */
    data class FamilyUnbindResponse(
        /** 是否成功 */
        @SerializedName("ok") val ok: Boolean
    )

    /**
     * 家人列表响应体（GET /api/v1/family/members 返回）
     */
    data class FamilyMembersResponse(
        /** 群组 ID */
        @SerializedName("group_id") val groupId: String,
        /** 家人列表 */
        @SerializedName("members") val members: List<FamilyMemberResponse>
    )

    /**
     * 单个家人信息（FamilyMembersResponse 的子对象）
     */
    data class FamilyMemberResponse(
        /** 成员 ID */
        @SerializedName("member_id") val memberId: String,
        /** 姓名 */
        @SerializedName("name") val name: String,
        /** 联系电话 */
        @SerializedName("phone") val phone: String?,
        /** 关系 */
        @SerializedName("relation") val relation: String,
        /** 是否为守护人 */
        @SerializedName("is_guardian") val isGuardian: Boolean,
        /** 绑定时间，ISO 8601 格式 */
        @SerializedName("bind_time") val bindTime: String?
    )

    /**
     * 告警状态更新响应体（查看/确认告警通用）
     */
    data class AlertStatusResponse(
        /** 是否成功 */
        @SerializedName("ok") val ok: Boolean
    )

    // ---------- 家人绑定相关 API 方法 ----------

    /**
     * 6. 绑定家人（提交邀请码）
     *
     * POST /api/v1/family/bind
     * 提交邀请码加入家庭组，建立家人守护关系。
     *
     * 注意：后端待实现，当前仅作为骨架预留。
     * 实际绑定逻辑由 FamilyManager 本地完成，此方法返回 null 表示未接入后端。
     *
     * @param inviteCode 邀请码
     * @param name 成员姓名
     * @param relation 与本人关系
     * @return 绑定结果，后端未实现时返回 null
     */
    suspend fun bindFamily(
        inviteCode: String,
        name: String,
        relation: String
    ): FamilyBindResponse? =
        withContext(Dispatchers.IO) {
            // TODO: 后端待实现，当前仅本地存储
            // 待后端接口就绪后，取消注释以下代码并完善请求体
            null
        }

    /**
     * 7. 解绑家人
     *
     * POST /api/v1/family/unbind
     * 解除与指定家人的守护关系。
     *
     * 注意：后端待实现，当前仅作为骨架预留。
     *
     * @param memberId 成员 ID
     * @return 是否解绑成功，后端未实现时返回 false
     */
    suspend fun unbindFamily(memberId: String): Boolean =
        withContext(Dispatchers.IO) {
            // TODO: 后端待实现，当前仅本地存储
            false
        }

    /**
     * 8. 获取家人列表
     *
     * GET /api/v1/family/members
     * 从服务器拉取当前家庭组的所有成员。
     *
     * 注意：后端待实现，当前仅作为骨架预留。
     *
     * @return 家人列表响应，后端未实现时返回 null
     */
    suspend fun getFamilyMembers(): FamilyMembersResponse? =
        withContext(Dispatchers.IO) {
            // TODO: 后端待实现，当前仅本地存储
            null
        }

    /**
     * 9. 标记告警已查看
     *
     * POST /api/v1/alerts/{id}/view
     * 家人端查看告警详情时调用，同步状态至服务端。
     *
     * 注意：后端待实现，当前仅作为骨架预留。
     *
     * @param alertId 告警 ID（或 eventId，待后端确认）
     * @return 是否成功，后端未实现时返回 false
     */
    suspend fun markAlertViewed(alertId: String): Boolean =
        withContext(Dispatchers.IO) {
            // TODO: 后端待实现，当前仅本地存储
            false
        }

    /**
     * 10. 家人确认告警
     *
     * POST /api/v1/alerts/{id}/confirm
     * 家人确认已联系长辈或确认安全，同步状态至服务端。
     *
     * 注意：后端待实现，当前仅作为骨架预留。
     *
     * @param alertId 告警 ID（或 eventId，待后端确认）
     * @return 是否成功，后端未实现时返回 false
     */
    suspend fun confirmAlert(alertId: String): Boolean =
        withContext(Dispatchers.IO) {
            // TODO: 后端待实现，当前仅本地存储
            false
        }

    // ==================== 网络状态检测 ====================

    /**
     * 检查网络是否可用
     *
     * @return 网络可用返回 true，不可用返回 false
     */
    fun isNetworkAvailable(): Boolean {
        return try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE)
                as android.net.ConnectivityManager
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities != null && (
                capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_WIFI) ||
                    capabilities.hasTransport(android.net.NetworkCapabilities.TRANSPORT_CELLULAR)
                )
        } catch (e: Exception) {
            false
        }
    }
}
