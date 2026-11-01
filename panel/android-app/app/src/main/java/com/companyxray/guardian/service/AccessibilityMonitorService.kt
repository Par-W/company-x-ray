package com.companyxray.guardian.service

import android.accessibilityservice.AccessibilityService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.app.NotificationCompat
import com.companyxray.guardian.R
import com.companyxray.guardian.data.AlertRecord
import com.companyxray.guardian.data.AlertStatus
import com.companyxray.guardian.data.PageScene
import com.companyxray.guardian.data.PaymentInfo
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.data.Verdict
import com.companyxray.guardian.engine.RiskEngine
import com.companyxray.guardian.network.ApiClient
import com.companyxray.guardian.util.ExtractionHelper
import com.companyxray.guardian.util.PreferenceManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * 无障碍监控服务
 * 监控窗口变化和文本内容变化，识别支付类App的付款页面并进行风险核验
 *
 * 配置文件引用：res/xml/accessibility_service_config.xml
 */
class AccessibilityMonitorService : AccessibilityService() {

    companion object {
        private const val TAG = "AccessibilityMonitor"

        /** 前台服务通知ID */
        private const val FOREGROUND_NOTIFICATION_ID = 1001

        /** 守护服务通知渠道ID */
        private const val CHANNEL_SERVICE = "channel_service"

        /** 风险提醒通知渠道ID */
        private const val CHANNEL_RISK = "channel_risk"

        /** 页面变化防抖延迟（毫秒） */
        private const val DEBOUNCE_DELAY_MS = 500L

        /** 最小页面检测间隔（毫秒），避免频繁检测 */
        private const val MIN_DETECT_INTERVAL_MS = 1000L

        /** 服务实例（用于外部判断是否运行） */
        @Volatile
        var isRunning: Boolean = false
            private set
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var prefs: PreferenceManager
    private lateinit var riskEngine: RiskEngine
    private lateinit var apiClient: ApiClient

    /** 当前页面包名 */
    private var currentPackageName: String? = null

    /** 上次检测时间 */
    private var lastDetectTime: Long = 0

    /** 当前正在进行的检测任务 */
    private var currentDetectJob: Job? = null

    /** 上次的核验结果（用于避免重复提醒） */
    private var lastVerdict: Verdict? = null

    /** 上次支付信息的哈希（用于判断页面是否变化） */
    private var lastPaymentHash: Int = 0

    // ==================== 服务生命周期 ====================

    override fun onCreate() {
        super.onCreate()
        prefs = PreferenceManager.getInstance(this)
        riskEngine = RiskEngine.getInstance(this)
        apiClient = ApiClient.getInstance(this)
        isRunning = true

        // 创建通知渠道
        createNotificationChannels()

        // 启动前台服务（Android 8+ 要求）
        startForeground(FOREGROUND_NOTIFICATION_ID, buildServiceNotification())
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        // 服务连接成功
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        currentDetectJob?.cancel()
        serviceScope.cancel()
        mainHandler.removeCallbacksAndMessages(null)
    }

    override fun onInterrupt() {
        // 服务被中断
    }

    // ==================== 无障碍事件处理 ====================

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return

        // 如果守护开关关闭，不进行检测
        if (!prefs.isGuardEnabled()) {
            return
        }

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                // 窗口状态变化（切换页面/应用）
                handleWindowStateChanged(event)
            }
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                // 窗口内容变化（页面内容更新）
                handleWindowContentChanged(event)
            }
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                // 文本变化（输入框内容变化等）
                handleTextChanged(event)
            }
        }
    }

    /**
     * 处理窗口状态变化
     */
    private fun handleWindowStateChanged(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        currentPackageName = packageName

        // 只关注支付类App，减少不必要的检测
        if (!ExtractionHelper.isPaymentApp(packageName)) {
            // 非支付类App，清空上次结果
            lastVerdict = null
            lastPaymentHash = 0
            return
        }

        // 防抖处理
        debounceDetect()
    }

    /**
     * 处理窗口内容变化
     */
    private fun handleWindowContentChanged(event: AccessibilityEvent) {
        val packageName = currentPackageName ?: return

        // 只关注支付类App
        if (!ExtractionHelper.isPaymentApp(packageName)) {
            return
        }

        // 内容变化更频繁，使用更长的防抖
        debounceDetect(800L)
    }

    /**
     * 处理文本变化
     */
    private fun handleTextChanged(event: AccessibilityEvent) {
        val packageName = currentPackageName ?: return

        // 只关注支付类App中的金额输入等
        if (!ExtractionHelper.isPaymentApp(packageName)) {
            return
        }

        // 文本变化使用更长的防抖，等待输入完成
        debounceDetect(1000L)
    }

    /**
     * 防抖检测
     * @param delayMs 延迟时间
     */
    private fun debounceDetect(delayMs: Long = DEBOUNCE_DELAY_MS) {
        mainHandler.removeCallbacks(detectRunnable)
        mainHandler.postDelayed(detectRunnable, delayMs)
    }

    /**
     * 检测任务 Runnable
     */
    private val detectRunnable = Runnable {
        performDetection()
    }

    /**
     * 执行页面检测
     */
    private fun performDetection() {
        // 限制检测频率
        val now = System.currentTimeMillis()
        if (now - lastDetectTime < MIN_DETECT_INTERVAL_MS) {
            return
        }
        lastDetectTime = now

        // 取消之前的检测任务
        currentDetectJob?.cancel()

        currentDetectJob = serviceScope.launch {
            try {
                val rootNode = rootInActiveWindow ?: return@launch

                // 提取支付信息
                val paymentInfo = ExtractionHelper.extractPaymentInfo(
                    rootNode,
                    currentPackageName
                )

                // 计算当前支付信息的哈希，用于判断是否变化
                val currentHash = paymentInfo.hashCode()

                // 如果页面内容没有实质变化，跳过
                if (currentHash == lastPaymentHash && lastVerdict != null) {
                    return@launch
                }
                lastPaymentHash = currentHash

                // 判断是否需要风险评估
                when {
                    // 支付场景且成功提取到信息 -> 进行风险评估
                    paymentInfo.scene == PageScene.PAYMENT && paymentInfo.isExtracted -> {
                        evaluateAndAlert(paymentInfo)
                    }
                    // 支付场景但未成功提取 -> 显示"无法识别"状态
                    paymentInfo.scene == PageScene.PAYMENT && !paymentInfo.isExtracted -> {
                        handleUnrecognizedPage(paymentInfo)
                    }
                    // 其他场景 -> 清空上次结果
                    else -> {
                        lastVerdict = null
                    }
                }

            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    /**
     * 进行风险评估并触发提醒
     */
    private suspend fun evaluateAndAlert(paymentInfo: PaymentInfo) {
        val verdict = riskEngine.evaluatePaymentRisk(paymentInfo)
        lastVerdict = verdict

        // 根据风险等级决定是否提醒
        when (verdict.riskLevel) {
            RiskLevel.RED_HARD -> {
                // 硬红高危：启动悬浮窗提醒 + 发送告警
                showHighRiskAlert(verdict)
                saveAlertRecord(verdict, true)
            }
            RiskLevel.RED_SOFT -> {
                // 软红可疑：发送通知提醒
                showMediumRiskNotification(verdict)
                saveAlertRecord(verdict, false)
            }
            else -> {
                // 黄/绿：不主动提醒，只记录状态
            }
        }
    }

    /**
     * 处理无法识别的页面
     * 明确显示"当前页面无法识别"，不误报安全
     */
    private fun handleUnrecognizedPage(paymentInfo: PaymentInfo) {
        // 创建一个"无法识别"状态的 verdict
        val unrecognizedVerdict = Verdict(
            riskLevel = RiskLevel.YELLOW,
            riskType = "当前页面无法识别",
            description = "无法读取当前页面的支付信息，请谨慎操作",
            suggestion = "请确认收款方身份后再支付",
            paymentInfo = paymentInfo
        )
        lastVerdict = unrecognizedVerdict

        // 可以发送一个低调的提醒（状态栏小图标等）
        // 这里暂时不做额外处理，避免打扰用户
    }

    // ==================== 高风险提醒 ====================

    /**
     * 显示高风险提醒（悬浮窗）
     */
    private fun showHighRiskAlert(verdict: Verdict) {
        // 启动悬浮窗服务
        val intent = Intent(this, FloatingAlertService::class.java).apply {
            action = FloatingAlertService.ACTION_SHOW_ALERT
            putExtra(FloatingAlertService.EXTRA_VERDICT, verdict)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    /**
     * 显示中风险通知提醒
     */
    private fun showMediumRiskNotification(verdict: Verdict) {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        val paymentInfo = verdict.paymentInfo
        val amountText = paymentInfo?.amountText ?: "未知金额"
        val payeeText = paymentInfo?.payeeName ?: "未知收款方"

        val notification = NotificationCompat.Builder(this, CHANNEL_RISK)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle("支付风险提醒")
            .setContentText("向「$payeeText」支付 $amountText，请注意核实")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(verdict.description)
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_ALARM)
            .setAutoCancel(true)
            .build()

        try {
            notificationManager.notify(
                (System.currentTimeMillis() % 10000).toInt(),
                notification
            )
        } catch (e: SecurityException) {
            // Android 13+ 通知权限未授予
        }
    }

    // ==================== 告警记录 ====================

    /**
     * 保存告警记录并通知家人
     */
    private suspend fun saveAlertRecord(verdict: Verdict, notifyFamily: Boolean) {
        val paymentInfo = verdict.paymentInfo

        val record = AlertRecord(
            riskLevel = verdict.riskLevel,
            riskType = verdict.riskType ?: "未知风险",
            description = verdict.description,
            amount = paymentInfo?.amount,
            targetName = paymentInfo?.payeeName,
            packageName = paymentInfo?.packageName,
            familyNotified = false
        )

        prefs.addAlertRecord(record)

        // 通知家人（高风险时）
        if (notifyFamily && prefs.hasFamilyMembers()) {
            serviceScope.launch {
                val success = apiClient.sendAlert(record)
                if (success) {
                    // 更新记录状态为已发送
                    prefs.updateAlertStatus(record.eventId, AlertStatus.SENT)
                }
            }
        }
    }

    // ==================== 前台服务通知 ====================

    /**
     * 创建通知渠道
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

            // 守护服务渠道（低重要性，常驻通知）
            val serviceChannel = NotificationChannel(
                CHANNEL_SERVICE,
                getString(R.string.notification_channel_service),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_service_desc)
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(serviceChannel)

            // 风险提醒渠道（高重要性，弹出提醒）
            val riskChannel = NotificationChannel(
                CHANNEL_RISK,
                getString(R.string.notification_channel_risk),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.notification_channel_risk_desc)
                enableVibration(true)
                enableLights(true)
            }
            notificationManager.createNotificationChannel(riskChannel)
        }
    }

    /**
     * 构建前台服务通知
     */
    private fun buildServiceNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_SERVICE)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("守护服务运行中，正在保护您的支付安全")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    // ==================== 辅助方法 ====================

    /**
     * 获取当前保护状态描述
     */
    fun getCurrentProtectionStatus(): String {
        val verdict = lastVerdict ?: return "监控中"
        return when (verdict.riskLevel) {
            RiskLevel.RED_HARD -> "检测到高危风险"
            RiskLevel.RED_SOFT -> "存在可疑风险"
            RiskLevel.YELLOW -> "关注中，保持警惕"
            RiskLevel.GREEN -> "当前正常"
        }
    }

    /**
     * 获取当前页面是否可识别
     */
    fun isCurrentPageRecognizable(): Boolean {
        val verdict = lastVerdict ?: return false
        return verdict.paymentInfo?.isExtracted == true
    }
}
