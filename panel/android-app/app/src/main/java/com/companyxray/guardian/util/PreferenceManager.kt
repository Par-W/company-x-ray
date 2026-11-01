package com.companyxray.guardian.util

import android.content.Context
import android.content.SharedPreferences
import com.companyxray.guardian.data.AlertRecord
import com.companyxray.guardian.data.AlertStatus
import com.companyxray.guardian.data.FamilyMember
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.util.UUID

/**
 * 本地存储管理
 * 封装 SharedPreferences，统一管理应用内持久化数据
 */
class PreferenceManager private constructor(context: Context) {

    private val prefs: SharedPreferences = context.applicationContext.getSharedPreferences(
        PREFS_NAME,
        Context.MODE_PRIVATE
    )
    private val gson = Gson()

    companion object {
        private const val PREFS_NAME = "guardian_prefs"

        // Key 常量
        private const val KEY_FAMILY_MEMBERS = "family_members"
        private const val KEY_ALERT_RECORDS = "alert_records"
        private const val KEY_GROUP_ID = "group_id"
        private const val KEY_PRIVACY_AGREED = "privacy_agreed"
        private const val KEY_GUARD_ENABLED = "guard_enabled"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_ONBOARDING_DONE = "onboarding_done"
        private const val KEY_VIBRATE_ENABLED = "vibrate_enabled"
        private const val KEY_PET_ENABLED = "pet_enabled"
        private const val KEY_START_DATE = "start_date"
        private const val KEY_TODAY_BLOCKED = "today_blocked"
        private const val KEY_TODAY_DATE = "today_date"

        @Volatile
        private var instance: PreferenceManager? = null

        fun getInstance(context: Context): PreferenceManager {
            return instance ?: synchronized(this) {
                instance ?: PreferenceManager(context).also { instance = it }
            }
        }
    }

    // ==================== 家人绑定信息 ====================

    /**
     * 保存家人列表
     */
    fun saveFamilyMembers(members: List<FamilyMember>) {
        val json = gson.toJson(members)
        prefs.edit().putString(KEY_FAMILY_MEMBERS, json).apply()
    }

    /**
     * 获取家人列表
     */
    fun getFamilyMembers(): List<FamilyMember> {
        val json = prefs.getString(KEY_FAMILY_MEMBERS, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<FamilyMember>>() {}.type
            gson.fromJson(json, type)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * 添加单个家人
     */
    fun addFamilyMember(member: FamilyMember) {
        val members = getFamilyMembers().toMutableList()
        // 移除已存在的同ID成员
        members.removeAll { it.id == member.id }
        members.add(member)
        saveFamilyMembers(members)
    }

    /**
     * 移除家人
     */
    fun removeFamilyMember(memberId: String) {
        val members = getFamilyMembers().toMutableList()
        members.removeAll { it.id == memberId }
        saveFamilyMembers(members)
    }

    /**
     * 是否有绑定的家人
     */
    fun hasFamilyMembers(): Boolean {
        return getFamilyMembers().isNotEmpty()
    }

    // ==================== 家庭组 ID ====================

    /**
     * 获取家庭组 ID
     *
     * 如果不存在则自动生成并持久化。
     * 格式为 "g-" + 8 位随机字符（字母和数字组合）。
     *
     * @return 家庭组 ID
     */
    fun getGroupId(): String {
        var groupId = prefs.getString(KEY_GROUP_ID, null)
        if (groupId.isNullOrBlank()) {
            groupId = "g-" + generateRandomString(8)
            prefs.edit().putString(KEY_GROUP_ID, groupId).apply()
        }
        return groupId
    }

    /**
     * 设置家庭组 ID
     *
     * 用于加入已有家庭组时覆盖本地生成的 ID。
     *
     * @param id 新的家庭组 ID
     */
    fun setGroupId(id: String) {
        prefs.edit().putString(KEY_GROUP_ID, id).apply()
    }

    /**
     * 生成指定长度的随机字符串（小写字母 + 数字）
     */
    private fun generateRandomString(length: Int): String {
        val chars = "abcdefghijklmnopqrstuvwxyz0123456789"
        val sb = StringBuilder(length)
        val random = java.util.Random()
        for (i in 0 until length) {
            sb.append(chars[random.nextInt(chars.length)])
        }
        return sb.toString()
    }

    // ==================== 告警历史 ====================

    /**
     * 保存告警记录列表
     */
    fun saveAlertRecords(records: List<AlertRecord>) {
        val json = gson.toJson(records)
        prefs.edit().putString(KEY_ALERT_RECORDS, json).apply()
    }

    /**
     * 获取告警记录列表
     */
    fun getAlertRecords(): List<AlertRecord> {
        val json = prefs.getString(KEY_ALERT_RECORDS, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<AlertRecord>>() {}.type
            gson.fromJson(json, type)
        } catch (e: Exception) {
            emptyList()
        }
    }

    /**
     * 添加一条告警记录
     */
    fun addAlertRecord(record: AlertRecord) {
        val records = getAlertRecords().toMutableList()
        records.add(0, record) // 最新的放在最前面
        // 最多保留 200 条记录
        if (records.size > 200) {
            val trimmed = records.take(200)
            saveAlertRecords(trimmed)
        } else {
            saveAlertRecords(records)
        }
    }

    /**
     * 更新告警状态
     *
     * 根据 eventId 查找告警记录并更新其状态。
     * 用于同步告警生命周期的各个阶段（已发送、已送达、已查看、已确认等）。
     *
     * @param eventId 事件唯一标识
     * @param status 新的告警状态
     */
    fun updateAlertStatus(eventId: String, status: AlertStatus) {
        val records = getAlertRecords().toMutableList()
        val index = records.indexOfFirst { it.eventId == eventId }
        if (index >= 0) {
            records[index] = records[index].copy(status = status)
            saveAlertRecords(records)
        }
    }

    /**
     * 标记告警为已查看
     *
     * 家人端查看告警详情时调用，将状态更新为 VIEWED。
     *
     * @param eventId 事件唯一标识
     */
    fun markAlertViewed(eventId: String) {
        updateAlertStatus(eventId, AlertStatus.VIEWED)
    }

    /**
     * 标记告警为已确认处理
     *
     * 家人确认已联系长辈或确认安全时调用，将状态更新为 CONFIRMED。
     *
     * @param eventId 事件唯一标识
     */
    fun markAlertConfirmed(eventId: String) {
        updateAlertStatus(eventId, AlertStatus.CONFIRMED)
    }

    /**
     * 清空告警记录
     */
    fun clearAlertRecords() {
        prefs.edit().remove(KEY_ALERT_RECORDS).apply()
    }

    /**
     * 获取未读告警数量
     *
     * 统计状态不是 VIEWED 也不是 CONFIRMED 的告警数量，
     * 即仍处于 DETECTED、SENT、DELIVERED、DISMISSED 等未读状态的告警。
     *
     * @return 未读告警数量
     */
    fun getUnreadAlertCount(): Int {
        return getAlertRecords().count {
            it.status != AlertStatus.VIEWED && it.status != AlertStatus.CONFIRMED
        }
    }

    // ==================== 用户授权状态 ====================

    /**
     * 是否已同意隐私协议
     */
    fun isPrivacyAgreed(): Boolean {
        return prefs.getBoolean(KEY_PRIVACY_AGREED, false)
    }

    /**
     * 设置隐私协议同意状态
     */
    fun setPrivacyAgreed(agreed: Boolean) {
        prefs.edit().putBoolean(KEY_PRIVACY_AGREED, agreed).apply()
    }

    // ==================== 守护开关 ====================

    /**
     * 是否启用保护（守护开关）
     */
    fun isGuardEnabled(): Boolean {
        // 默认开启
        return prefs.getBoolean(KEY_GUARD_ENABLED, true)
    }

    /**
     * 设置守护开关
     */
    fun setGuardEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_GUARD_ENABLED, enabled).apply()
    }

    // ==================== 设备 ID ====================

    /**
     * 获取设备ID，如果不存在则生成并持久化
     */
    fun getDeviceId(): String {
        var deviceId = prefs.getString(KEY_DEVICE_ID, null)
        if (deviceId.isNullOrBlank()) {
            deviceId = UUID.randomUUID().toString()
            prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
        }
        return deviceId
    }

    // ==================== 用户 ID ====================

    /**
     * 获取用户ID
     */
    fun getUserId(): String? {
        return prefs.getString(KEY_USER_ID, null)
    }

    /**
     * 保存用户ID
     */
    fun setUserId(userId: String?) {
        prefs.edit().putString(KEY_USER_ID, userId).apply()
    }

    // ==================== 引导页完成状态 ====================

    /**
     * 是否已完成引导页
     */
    fun isOnboardingDone(): Boolean {
        return prefs.getBoolean(KEY_ONBOARDING_DONE, false)
    }

    /**
     * 设置引导页完成状态
     */
    fun setOnboardingDone(done: Boolean) {
        prefs.edit().putBoolean(KEY_ONBOARDING_DONE, done).apply()
    }

    // ==================== 振动提醒开关 ====================

    /**
     * 是否启用振动提醒
     */
    fun isVibrateEnabled(): Boolean {
        return prefs.getBoolean(KEY_VIBRATE_ENABLED, true)
    }

    /**
     * 设置振动提醒开关
     */
    fun setVibrateEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_VIBRATE_ENABLED, enabled).apply()
    }

    // ==================== 宠物形象开关 ====================

    /**
     * 是否启用桌面宠物形象
     */
    fun isPetEnabled(): Boolean {
        return prefs.getBoolean(KEY_PET_ENABLED, true)
    }

    /**
     * 设置宠物形象开关
     */
    fun setPetEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_PET_ENABLED, enabled).apply()
    }

    // ==================== 统计数据 ====================

    /**
     * 获取今日拦截数
     */
    fun getTodayBlocked(): Int {
        val today = java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.getDefault())
            .format(System.currentTimeMillis())
        val savedDate = prefs.getString(KEY_TODAY_DATE, "")
        return if (savedDate == today) {
            prefs.getInt(KEY_TODAY_BLOCKED, 0)
        } else {
            0
        }
    }

    /**
     * 增加今日拦截数
     */
    fun incrementTodayBlocked() {
        val today = java.text.SimpleDateFormat("yyyyMMdd", java.util.Locale.getDefault())
            .format(System.currentTimeMillis())
        val editor = prefs.edit()
        editor.putString(KEY_TODAY_DATE, today)
        editor.putInt(KEY_TODAY_BLOCKED, getTodayBlocked() + 1)
        editor.apply()
    }

    /**
     * 获取守护天数
     */
    fun getGuardDays(): Int {
        val startDate = prefs.getLong(KEY_START_DATE, 0L)
        if (startDate == 0L) return 0
        val diff = System.currentTimeMillis() - startDate
        return (diff / (1000 * 60 * 60 * 24)).toInt() + 1
    }

    /**
     * 初始化开始守护日期（首次启动时调用）
     */
    fun initStartDateIfNeeded() {
        if (prefs.getLong(KEY_START_DATE, 0L) == 0L) {
            prefs.edit().putLong(KEY_START_DATE, System.currentTimeMillis()).apply()
        }
    }

    // ==================== 数据清除 ====================

    /**
     * 删除所有数据（解绑/撤销授权时调用）
     * 注意：保留设备ID以便重新绑定
     */
    fun clearAllUserData() {
        val deviceId = getDeviceId()
        prefs.edit().clear().apply()
        // 重新保存设备ID
        prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
    }

    /**
     * 完全清除所有数据（包括设备ID）
     */
    fun clearEverything() {
        prefs.edit().clear().apply()
    }
}
