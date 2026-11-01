package com.companyxray.guardian.util

import android.content.Context
import com.companyxray.guardian.data.AlertRecord
import com.companyxray.guardian.data.AlertStatus
import com.companyxray.guardian.data.FamilyMember
import com.companyxray.guardian.network.ApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * 家人绑定管理器
 *
 * 单例类，封装家人绑定、解绑、告警通知等核心业务逻辑。
 * 协调本地存储（PreferenceManager）与网络接口（ApiClient），
 * 即使后端暂未实现也能在本地正常工作（离线优先策略）。
 *
 * 使用方式：
 * ```
 * FamilyManager.getInstance(context).bindMember(inviteCode, name, relation)
 * ```
 */
class FamilyManager private constructor(private val context: Context) {

    /** 本地存储管理 */
    private val prefs = PreferenceManager.getInstance(context)

    /** 网络客户端 */
    private val apiClient = ApiClient.getInstance(context)

    /** 最近一次发送告警失败的原因（用于调试和界面提示） */
    var lastSendError: String? = null
        private set

    companion object {
        @Volatile
        private var instance: FamilyManager? = null

        /**
         * 获取单例实例
         *
         * @param context 上下文（内部自动使用 applicationContext）
         */
        fun getInstance(context: Context): FamilyManager {
            return instance ?: synchronized(this) {
                instance ?: FamilyManager(context.applicationContext).also { instance = it }
            }
        }
    }

    // ==================== 家人绑定 ====================

    /**
     * 绑定家人
     *
     * 通过邀请码添加一位家人到家庭组。
     * 流程：
     * 1. 生成 FamilyMember 对象并保存到本地
     * 2. 尝试调用后端绑定接口（失败不影响本地绑定，仅记录状态）
     *
     * @param inviteCode 邀请码（6 位数字，GX 开头）
     * @param name 家人姓名
     * @param relation 与本人的关系（如：父亲、母亲、儿子等）
     * @return 是否绑定成功（本地保存成功即为成功）
     */
    suspend fun bindMember(
        inviteCode: String,
        name: String,
        relation: String
    ): Boolean = withContext(Dispatchers.IO) {
        // 1. 生成家庭成员对象，ID 本地生成
        val member = FamilyMember(
            id = UUID.randomUUID().toString(),
            name = name,
            phone = "", // 绑定流程中可选填手机号，此处留空
            deviceId = null, // 对方设备 ID 需后端同步
            relation = relation,
            isGuardian = true, // 默认绑定的是守护人（晚辈）
            inviteCode = inviteCode,
            bindTime = System.currentTimeMillis()
        )

        // 2. 保存到本地
        prefs.addFamilyMember(member)

        // 3. 尝试调用后端绑定接口（失败不影响本地）
        try {
            val result = apiClient.bindFamily(inviteCode, name, relation)
            if (result != null && result.ok) {
                // 后端绑定成功，可更新成员 ID 等信息
                // 暂不处理，后续后端接入后完善
            }
        } catch (e: Exception) {
            // 后端调用失败，不影响本地绑定
            // 可在此处记录日志
        }

        true
    }

    /**
     * 解绑家人
     *
     * 移除指定 ID 的家人，解除守护关系。
     * 同样采用离线优先策略：本地先移除，再尝试同步后端。
     *
     * @param memberId 成员 ID
     * @return 是否解绑成功（本地移除成功即为成功）
     */
    suspend fun unbindMember(memberId: String): Boolean = withContext(Dispatchers.IO) {
        // 1. 从本地移除
        prefs.removeFamilyMember(memberId)

        // 2. 尝试调用后端解绑接口
        try {
            apiClient.unbindFamily(memberId)
        } catch (e: Exception) {
            // 后端调用失败，不影响本地操作
        }

        true
    }

    /**
     * 获取家人列表
     *
     * @return 已绑定的家人列表
     */
    fun getMembers(): List<FamilyMember> {
        return prefs.getFamilyMembers()
    }

    /**
     * 是否有绑定的家人
     */
    fun hasMembers(): Boolean {
        return prefs.hasFamilyMembers()
    }

    // ==================== 邀请码 ====================

    /**
     * 生成本地邀请码
     *
     * 格式："GX" + 6 位随机数字
     * 邀请码用于让对方扫描或输入以加入家庭组。
     *
     * @return 邀请码字符串，如 "GX123456"
     */
    fun generateInviteCode(): String {
        val random = java.util.Random()
        val digits = (0 until 6).joinToString("") {
            random.nextInt(10).toString()
        }
        return "GX$digits"
    }

    // ==================== 告警通知 ====================

    /**
     * 发送告警给家人
     *
     * 遍历家人列表，调用后端告警接口通知所有家人。
     * 发送成功后更新本地告警状态为 SENT。
     * 网络失败时状态保持 DETECTED，并记录失败原因。
     *
     * 注意：实际后端接口是按群组发送（一条告警 = 群组内所有人可见），
     * 因此只需调用一次 sendAlert，传入 groupId 即可。
     *
     * @param alertRecord 告警记录
     * @return 是否发送成功（至少有一次成功发送视为成功）
     */
    suspend fun sendAlertToFamily(alertRecord: AlertRecord): Boolean =
        withContext(Dispatchers.IO) {
            lastSendError = null

            // 1. 检查是否有绑定的家人
            val members = getMembers()
            if (members.isEmpty()) {
                lastSendError = "暂无绑定的家人"
                return@withContext false
            }

            // 2. 检查网络是否可用
            if (!apiClient.isNetworkAvailable()) {
                lastSendError = "网络不可用，请检查网络连接"
                // 网络失败，状态保持 DETECTED
                return@withContext false
            }

            // 3. 获取家庭组 ID
            val groupId = prefs.getGroupId()

            // 4. 构造告警请求
            val alertRequest = ApiClient.AlertSendRequest(
                eventId = alertRecord.eventId,
                groupId = groupId,
                brand = alertRecord.merchantName,
                counterpartEntity = alertRecord.merchantName,
                amount = alertRecord.amount,
                level = riskLevelToString(alertRecord.level),
                advicePhrase = buildAdvicePhrase(alertRecord)
            )

            // 5. 调用后端接口发送告警
            var sendSuccess = false
            try {
                sendSuccess = apiClient.sendAlert(alertRequest)
                if (sendSuccess) {
                    // 发送成功，更新本地告警状态为 SENT
                    prefs.updateAlertStatus(alertRecord.eventId, AlertStatus.SENT)
                } else {
                    lastSendError = "后端返回发送失败"
                    // 状态保持 DETECTED
                }
            } catch (e: Exception) {
                lastSendError = "网络异常：${e.message}"
                // 状态保持 DETECTED
            }

            sendSuccess
        }

    // ==================== 告警同步 ====================

    /**
     * 从服务器拉取最新告警列表
     *
     * 家人端调用此方法同步群组内的所有告警。
     * 拉取成功后会合并到本地告警记录中。
     *
     * 注意：后端接口为 GET /api/v1/group/{id}/alerts
     * 如果后端未实现，此方法返回空列表并保持本地数据不变。
     *
     * @return 同步到的告警数量，失败时返回 0
     */
    suspend fun syncAlertsFromServer(): Int = withContext(Dispatchers.IO) {
        val groupId = prefs.getGroupId()

        try {
            val response = apiClient.getGroupAlerts(groupId)
            if (response == null) {
                return@withContext 0
            }

            var newCount = 0
            val localRecords = prefs.getAlertRecords().toMutableList()
            val localEventIds = localRecords.map { it.eventId }.toSet()

            // 将服务端告警转换为本地 AlertRecord 并合并
            for (alertItem in response.alerts) {
                // 已存在的告警跳过（避免重复）
                if (alertItem.eventId in localEventIds) continue

                // TODO: 转换逻辑待后端字段完全对齐后完善
                // 当前仅做简单映射
                val record = AlertRecord(
                    eventId = alertItem.eventId,
                    level = com.companyxray.guardian.data.RiskLevel.fromString(alertItem.level),
                    merchantName = alertItem.brand,
                    amount = alertItem.amount,
                    ts = parseIsoTime(alertItem.ts),
                    status = mapServerStatusToLocal(alertItem.status),
                    familyNotified = true,
                    familyViewed = false,
                    familyConfirmed = false,
                    anchorsJson = "[]" // 服务端列表接口暂不返回锚点详情
                )

                localRecords.add(0, record)
                newCount++
            }

            // 按时间排序（最新在前）
            localRecords.sortByDescending { it.ts }

            // 限制最多 200 条
            val trimmed = if (localRecords.size > 200) {
                localRecords.take(200)
            } else {
                localRecords
            }

            prefs.saveAlertRecords(trimmed)
            newCount
        } catch (e: Exception) {
            0
        }
    }

    // ==================== 辅助方法 ====================

    /**
     * 将 RiskLevel 枚举转换为协议字符串
     */
    private fun riskLevelToString(level: com.companyxray.guardian.data.RiskLevel): String {
        return when (level) {
            com.companyxray.guardian.data.RiskLevel.GREEN -> "green"
            com.companyxray.guardian.data.RiskLevel.YELLOW -> "yellow"
            com.companyxray.guardian.data.RiskLevel.RED_SOFT -> "red_soft"
            com.companyxray.guardian.data.RiskLevel.RED_HARD -> "red_hard"
        }
    }

    /**
     * 构建建议话术（简易版，用于告警发送）
     *
     * 实际场景中建议话术由 VerdictResponse 直接提供，
     * 此处作为兜底，从告警记录生成简单提示。
     */
    private fun buildAdvicePhrase(record: AlertRecord): String {
        val amountStr = record.amount?.let { "，涉及金额 %.2f 元".format(it) } ?: ""
        return "检测到${record.merchantName}存在风险$amountStr，请联系家人确认。"
    }

    /**
     * 将服务端状态字符串映射为本地 AlertStatus 枚举
     *
     * 服务端当前仅返回 "new"，未来会扩展完整状态。
     */
    private fun mapServerStatusToLocal(serverStatus: String): AlertStatus {
        return when (serverStatus.lowercase()) {
            "new", "detected" -> AlertStatus.DETECTED
            "sent" -> AlertStatus.SENT
            "delivered" -> AlertStatus.DELIVERED
            "viewed" -> AlertStatus.VIEWED
            "confirmed" -> AlertStatus.CONFIRMED
            "dismissed" -> AlertStatus.DISMISSED
            else -> AlertStatus.DETECTED
        }
    }

    /**
     * 解析 ISO 8601 格式时间字符串为时间戳（毫秒）
     */
    private fun parseIsoTime(isoTime: String): Long {
        return try {
            // 简化处理：尝试多种常见格式
            val formats = listOf(
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.getDefault()),
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault()),
                java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault())
            )
            for (format in formats) {
                try {
                    return format.parse(isoTime)?.time ?: System.currentTimeMillis()
                } catch (_: Exception) {
                    // 尝试下一个格式
                }
            }
            System.currentTimeMillis()
        } catch (e: Exception) {
            System.currentTimeMillis()
        }
    }
}
