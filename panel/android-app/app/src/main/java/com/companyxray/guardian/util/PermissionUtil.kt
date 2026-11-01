package com.companyxray.guardian.util

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.view.accessibility.AccessibilityManager

/**
 * 权限工具类
 * 检查和请求各种系统权限
 */
object PermissionUtil {

    // ==================== 无障碍服务 ====================

    /**
     * 检查无障碍服务是否已启用
     *
     * @param context 上下文
     * @param serviceName 无障碍服务完整类名（默认为本应用的无障碍服务）
     * @return 是否已启用
     */
    fun isAccessibilityEnabled(
        context: Context,
        serviceName: String = "${context.packageName}/com.companyxray.guardian.service.AccessibilityMonitorService"
    ): Boolean {
        try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
            if (!am.isEnabled) return false

            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            val colonSplitter = enabledServices.split(':')
            for (enabledService in colonSplitter) {
                if (enabledService.equals(serviceName, ignoreCase = true)) {
                    return true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    /**
     * 获取跳转到无障碍设置页面的 Intent
     */
    fun getAccessibilitySettingsIntent(): Intent {
        return Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    // ==================== 悬浮窗权限 ====================

    /**
     * 检查悬浮窗权限是否已授予
     *
     * @param context 上下文
     * @return 是否已授予
     */
    fun canDrawOverlays(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            // Android 6.0 以下默认授予
            true
        }
    }

    /**
     * 获取跳转到悬浮窗权限设置页面的 Intent
     */
    fun getOverlaySettingsIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        } else {
            // 低版本直接返回应用详情
            getAppDetailsSettingsIntent(context)
        }
    }

    // ==================== 通知权限 ====================

    /**
     * 检查通知权限是否已授予
     * Android 13 (API 33) 以上需要运行时申请
     *
     * @param context 上下文
     * @return 是否已授予
     */
    fun areNotificationsEnabled(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
                as android.app.NotificationManager
            notificationManager.areNotificationsEnabled()
        } else {
            // Android 7.0 以下默认开启
            true
        }
    }

    /**
     * 获取跳转到通知设置页面的 Intent
     */
    fun getNotificationSettingsIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        } else {
            getAppDetailsSettingsIntent(context)
        }
    }

    // ==================== 电池优化白名单 ====================

    /**
     * 检查是否在电池优化白名单中（即忽略电池优化）
     *
     * @param context 上下文
     * @return 是否忽略电池优化
     */
    fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val powerManager = context.getSystemService(Context.POWER_SERVICE)
                    as android.os.PowerManager
                powerManager.isIgnoringBatteryOptimizations(context.packageName)
            } catch (e: Exception) {
                // 某些ROM可能不支持，默认返回 true
                true
            }
        } else {
            true
        }
    }

    /**
     * 获取跳转到电池优化设置页面的 Intent
     */
    fun getBatteryOptimizationIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        } else {
            getAppDetailsSettingsIntent(context)
        }
    }

    // ==================== 应用详情页 ====================

    /**
     * 获取跳转到应用详情设置页的 Intent
     */
    fun getAppDetailsSettingsIntent(context: Context): Intent {
        return Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    // ==================== 自启动权限（厂商ROM） ====================

    /**
     * 获取跳转到厂商自启动管理页面的 Intent
     * 由于各厂商ROM差异较大，这里只提供常见的跳转方案
     * 如果找不到对应页面，会回退到应用详情页
     */
    fun getAutoStartSettingsIntent(context: Context): Intent {
        val packageName = context.packageName

        // 常见厂商的自启动设置 Intent
        val manufacturer = Build.MANUFACTURER.lowercase()
        val intent = when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") -> {
                // 小米/红米
                Intent().apply {
                    setClassName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                // 华为/荣耀
                Intent().apply {
                    setClassName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.optimize.process.ProtectActivity"
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
                // OPPO/真我
                Intent().apply {
                    setClassName(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            manufacturer.contains("vivo") || manufacturer.contains("iqoo") -> {
                // VIVO/iQOO
                Intent().apply {
                    setClassName(
                        "com.iqoo.secure",
                        "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            manufacturer.contains("samsung") -> {
                // 三星
                Intent().apply {
                    setClassName(
                        "com.samsung.android.sm",
                        "com.samsung.android.sm.ui.ram.AutoRunActivity"
                    )
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            }
            else -> null
        }

        // 验证 Intent 是否可用
        if (intent != null) {
            val resolveInfo = context.packageManager.resolveActivity(intent, 0)
            if (resolveInfo != null) {
                return intent
            }
        }

        // 回退到应用详情页
        return getAppDetailsSettingsIntent(context)
    }

    // ==================== 辅助方法 ====================

    /**
     * 检查 UsageStats 权限（可选，用于行为分析）
     */
    fun hasUsageStatsPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
                val mode = appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    context.packageName
                )
                mode == AppOpsManager.MODE_ALLOWED
            } catch (e: Exception) {
                false
            }
        } else {
            true
        }
    }

    /**
     * 获取 UsageStats 设置页面 Intent
     */
    fun getUsageStatsSettingsIntent(context: Context): Intent {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
        } else {
            getAppDetailsSettingsIntent(context)
        }
    }
}
