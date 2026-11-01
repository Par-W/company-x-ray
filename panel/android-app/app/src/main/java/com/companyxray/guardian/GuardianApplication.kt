package com.companyxray.guardian

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.companyxray.guardian.util.PreferenceManager

/**
 * 全局 Application 类
 *
 * 负责应用级初始化工作：
 * - 初始化 PreferenceManager
 * - 生成并持久化设备 ID
 * - 创建通知渠道（Android 8.0+）
 * - 初始化守护日期等统计数据
 */
class GuardianApplication : Application() {

    companion object {
        @Volatile
        private var instance: GuardianApplication? = null

        /**
         * 获取 Application 单例
         */
        fun getInstance(): GuardianApplication {
            return instance ?: throw IllegalStateException("Application not initialized")
        }

        // 通知渠道 ID
        const val CHANNEL_ID_RISK = "channel_risk"
        const val CHANNEL_ID_SERVICE = "channel_service"
        const val CHANNEL_ID_FLOATING = "channel_floating"
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        // 初始化 PreferenceManager
        val prefManager = PreferenceManager.getInstance(this)

        // 生成设备 ID（如果还没有）
        prefManager.getDeviceId()

        // 初始化开始守护日期
        prefManager.initStartDateIfNeeded()

        // 创建通知渠道
        createNotificationChannels()
    }

    /**
     * 创建通知渠道（Android 8.0+ 要求）
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // 风险提醒渠道（高重要性，弹出提醒）
            val riskChannel = NotificationChannel(
                CHANNEL_ID_RISK,
                getString(R.string.notification_channel_risk),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.notification_channel_risk_desc)
                enableVibration(true)
                enableLights(true)
            }
            notificationManager.createNotificationChannel(riskChannel)

            // 守护服务渠道（低重要性，常驻通知）
            val serviceChannel = NotificationChannel(
                CHANNEL_ID_SERVICE,
                getString(R.string.notification_channel_service),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_service_desc)
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(serviceChannel)

            // 悬浮窗服务渠道（低重要性，常驻通知）
            val floatingChannel = NotificationChannel(
                CHANNEL_ID_FLOATING,
                getString(R.string.floating_service_subtype),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.floating_service_subtype)
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(floatingChannel)
        }
    }
}
