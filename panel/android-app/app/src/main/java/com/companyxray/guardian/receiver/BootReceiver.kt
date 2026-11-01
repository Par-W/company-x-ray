package com.companyxray.guardian.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.companyxray.guardian.R
import com.companyxray.guardian.service.AccessibilityMonitorService
import com.companyxray.guardian.util.PermissionUtil
import com.companyxray.guardian.util.PreferenceManager

/**
 * 开机自启广播接收器
 *
 * 功能：
 * - 接收 BOOT_COMPLETED 和 LOCKED_BOOT_COMPLETED 广播
 * - 如果用户已授权且守护开关开启，重新启动无障碍监控
 * - 显示通知告知用户保护已恢复
 *
 * 注意：
 * - Android 8+ 广播接收器的限制：静态注册的广播在应用首次启动前不会接收
 * - Android 10+ 后台启动限制：需要使用前台服务
 * - 部分厂商ROM（小米、华为等）需要用户手动开启自启动权限
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootReceiver"

        /** 开机自启通知ID */
        private const val BOOT_NOTIFICATION_ID = 3001

        /** 通知渠道ID */
        private const val CHANNEL_BOOT = "channel_boot"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED -> {
                handleBootCompleted(context)
            }
        }
    }

    /**
     * 处理开机完成事件
     */
    private fun handleBootCompleted(context: Context) {
        val prefs = PreferenceManager.getInstance(context)

        // 检查守护开关是否开启
        if (!prefs.isGuardEnabled()) {
            return
        }

        // 检查是否同意了隐私协议（未初始化的设备不启动）
        if (!prefs.isPrivacyAgreed()) {
            return
        }

        // 检查无障碍服务是否已启用
        val accessibilityEnabled = PermissionUtil.isAccessibilityEnabled(context)

        if (accessibilityEnabled) {
            // 无障碍服务已启用，服务会自动运行
            // 显示通知告知用户保护已恢复
            showBootNotification(context, true)
        } else {
            // 无障碍服务未启用，无法自动启动监控
            // 显示提醒通知，引导用户开启
            showBootNotification(context, false)
        }

        // 上报设备状态（开机事件）
        reportDeviceBoot(context)
    }

    /**
     * 显示开机自启通知
     *
     * @param context 上下文
     * @param protectionActive 保护是否已激活
     */
    private fun showBootNotification(context: Context, protectionActive: Boolean) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
            as NotificationManager

        // 创建通知渠道（Android 8.0+）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_BOOT,
                context.getString(R.string.notification_channel_service),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "开机自启状态通知"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }

        val title: String
        val content: String

        if (protectionActive) {
            title = context.getString(R.string.boot_started)
            content = "X光守护已启动，正在保护您的支付安全"
        } else {
            title = "保护服务需要您的授权"
            content = "请开启无障碍服务以恢复完整保护"
        }

        // 构建通知
        val builder = NotificationCompat.Builder(context, CHANNEL_BOOT)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(android.app.Notification.CATEGORY_SERVICE)
            .setAutoCancel(true)

        // 如果保护未激活，添加点击跳转到设置的 Intent
        if (!protectionActive) {
            val settingsIntent = PermissionUtil.getAccessibilitySettingsIntent()
            val pendingIntent = PendingIntent.getActivity(
                context,
                0,
                settingsIntent,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                } else {
                    PendingIntent.FLAG_UPDATE_CURRENT
                }
            )
            builder.setContentIntent(pendingIntent)
        }

        try {
            notificationManager.notify(BOOT_NOTIFICATION_ID, builder.build())
        } catch (e: SecurityException) {
            // Android 13+ 通知权限未授予，静默失败
        }
    }

    /**
     * 上报设备开机事件
     */
    private fun reportDeviceBoot(context: Context) {
        // 使用 WorkManager 或直接启动服务上报
        // 这里简单处理：在后台线程上报
        Thread {
            try {
                val prefs = PreferenceManager.getInstance(context)
                val apiClient = com.companyxray.guardian.network.ApiClient.getInstance(context)

                val accessibilityEnabled = PermissionUtil.isAccessibilityEnabled(context)

                // 获取电量
                val batteryLevel = getBatteryLevel(context)

                apiClient.reportDeviceStatus(
                    guardEnabled = prefs.isGuardEnabled(),
                    accessibilityEnabled = accessibilityEnabled,
                    batteryLevel = batteryLevel
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }.start()
    }

    /**
     * 获取当前电量
     */
    private fun getBatteryLevel(context: Context): Int {
        return try {
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE)
                as android.os.BatteryManager
            batteryManager.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } catch (e: Exception) {
            -1
        }
    }
}
