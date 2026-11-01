package com.companyxray.guardian.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.companyxray.guardian.R
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.data.Verdict
import com.companyxray.guardian.network.ApiClient
import com.companyxray.guardian.util.PermissionUtil
import com.companyxray.guardian.util.PreferenceManager
import kotlin.math.abs

/**
 * 悬浮窗提醒服务
 *
 * 功能：
 * - 全屏风险提醒（半透明覆盖）
 * - 桌面宠物形象（边缘小图标，点击展开）
 * - 振动提醒
 * - 防误触：关闭按钮需要长按确认
 *
 * 注意：需要 SYSTEM_ALERT_WINDOW 权限（Android 6.0+ 需用户手动授权）
 */
class FloatingAlertService : Service() {

    companion object {
        private const val TAG = "FloatingAlertService"

        /** 前台服务通知ID */
        private const val FOREGROUND_NOTIFICATION_ID = 1002

        /** 悬浮窗服务通知渠道ID */
        private const val CHANNEL_FLOATING = "channel_floating"

        // Action 常量
        const val ACTION_SHOW_ALERT = "com.companyxray.guardian.action.SHOW_ALERT"
        const val ACTION_SHOW_PET = "com.companyxray.guardian.action.SHOW_PET"
        const val ACTION_HIDE_ALERT = "com.companyxray.guardian.action.HIDE_ALERT"
        const val ACTION_HIDE_ALL = "com.companyxray.guardian.action.HIDE_ALL"

        // Extra 常量
        const val EXTRA_VERDICT = "extra_verdict"

        /** 长按关闭按钮所需时间（毫秒） */
        private const val LONG_PRESS_CLOSE_DURATION = 2000L

        /** 宠物图标大小（dp） */
        private const val PET_SIZE_DP = 56

        /** 宠物初始位置距离边缘（dp） */
        private const val PET_MARGIN_DP = 16
    }

    private lateinit var windowManager: WindowManager
    private lateinit var vibrator: Vibrator
    private lateinit var prefs: PreferenceManager
    private lateinit var apiClient: ApiClient

    private val mainHandler = Handler(Looper.getMainLooper())

    /** 全屏提醒悬浮窗 View */
    private var alertView: View? = null

    /** 桌面宠物悬浮窗 View */
    private var petView: View? = null

    /** 当前显示的风险核验结果 */
    private var currentVerdict: Verdict? = null

    /** 关闭按钮长按计时 */
    private var closePressStartTime: Long = 0
    private var closePressRunnable: Runnable? = null

    /** 宠物位置 */
    private var petX: Int = 0
    private var petY: Int = 0
    private var petTouchStartX: Float = 0f
    private var petTouchStartY: Float = 0f
    private var isPetDragging: Boolean = false

    // ==================== 服务生命周期 ====================

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        prefs = PreferenceManager.getInstance(this)
        apiClient = ApiClient.getInstance(this)

        createNotificationChannel()
        startForeground(FOREGROUND_NOTIFICATION_ID, buildServiceNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW_ALERT -> {
                val verdict = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(EXTRA_VERDICT, Verdict::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(EXTRA_VERDICT)
                }
                if (verdict != null) {
                    showAlert(verdict)
                }
            }
            ACTION_SHOW_PET -> {
                showPet()
            }
            ACTION_HIDE_ALERT -> {
                hideAlert()
            }
            ACTION_HIDE_ALL -> {
                hideAll()
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        hideAll()
        mainHandler.removeCallbacksAndMessages(null)
    }

    // ==================== 全屏提醒 ====================

    /**
     * 显示全屏风险提醒
     */
    private fun showAlert(verdict: Verdict) {
        currentVerdict = verdict

        // 检查悬浮窗权限
        if (!PermissionUtil.canDrawOverlays(this)) {
            // 无权限时通过通知提醒
            showFallbackNotification(verdict)
            return
        }

        // 如果已有提醒，先移除
        hideAlertInternal()

        // 振动提醒
        vibrateAlert()

        // 创建并显示提醒 View
        val view = createAlertView(verdict)
        val params = createFullScreenLayoutParams()

        try {
            windowManager.addView(view, params)
            alertView = view
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * 创建全屏提醒 View
     */
    private fun createAlertView(verdict: Verdict): View {
        val context = this
        val riskLevel = verdict.riskLevel
        val paymentInfo = verdict.paymentInfo

        // 根布局
        val rootLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xCC000000.toInt()) // 半透明黑色背景
            gravity = Gravity.CENTER
            setPadding(dpToPx(24), dpToPx(40), dpToPx(24), dpToPx(40))
        }

        // 内容卡片
        val cardLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            val dp16 = dpToPx(16)
            setPadding(dp16, dp16, dp16, dp16)
            background = ContextCompat.getDrawable(context, R.drawable.bg_alert_red)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, dpToPx(20), 0, dpToPx(20))
            }
        }

        // 风险图标 + 标题
        val headerLayout = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dpToPx(12))
        }

        val iconView = ImageView(context).apply {
            setImageResource(R.drawable.ic_shield)
            setColorFilter(Color.WHITE)
            layoutParams = LinearLayout.LayoutParams(dpToPx(40), dpToPx(40)).apply {
                setMargins(0, 0, dpToPx(12), 0)
            }
        }

        val titleText = TextView(context).apply {
            text = when (riskLevel) {
                RiskLevel.RED_HARD -> getString(R.string.alert_high_risk)
                RiskLevel.RED_SOFT -> getString(R.string.alert_medium_risk)
                RiskLevel.YELLOW -> getString(R.string.alert_low_risk)
                RiskLevel.GREEN -> getString(R.string.alert_safe)
            }
            textSize = 24f
            setTextColor(Color.WHITE)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }

        headerLayout.addView(iconView)
        headerLayout.addView(titleText)
        cardLayout.addView(headerLayout)

        // 商家名称
        val merchantText = TextView(context).apply {
            text = paymentInfo?.payeeName?.let { "收款方：$it" } ?: "收款方：未知"
            textSize = 18f
            setTextColor(Color.WHITE)
            setPadding(0, dpToPx(4), 0, dpToPx(4))
        }
        cardLayout.addView(merchantText)

        // 金额
        val amountText = TextView(context).apply {
            text = paymentInfo?.amountText?.let { "金额：$it" } ?: "金额：未知"
            textSize = 22f
            setTextColor(Color.WHITE)
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, dpToPx(4), 0, dpToPx(8))
        }
        cardLayout.addView(amountText)

        // 分割线
        val divider = View(context).apply {
            setBackgroundColor(0x40FFFFFF.toInt())
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dpToPx(1)
            ).apply {
                setMargins(0, dpToPx(8), 0, dpToPx(8))
            }
        }
        cardLayout.addView(divider)

        // 六锚点简要结果
        val summaryLabel = TextView(context).apply {
            text = "风险分析："
            textSize = 16f
            setTextColor(0xCCFFFFFF.toInt())
            setPadding(0, dpToPx(4), 0, dpToPx(2))
        }
        cardLayout.addView(summaryLabel)

        val summaryText = TextView(context).apply {
            text = verdict.anchorScores?.summary ?: "分析中..."
            textSize = 16f
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, dpToPx(4))
        }
        cardLayout.addView(summaryText)

        // 品牌核验结果（如果有）
        verdict.brandVerifyResult?.let { brand ->
            if (brand.riskWarning != null) {
                val brandText = TextView(context).apply {
                    text = "品牌提示：${brand.riskWarning}"
                    textSize = 15f
                    setTextColor(0xFFFFEB3B.toInt()) // 黄色
                    setPadding(0, dpToPx(4), 0, dpToPx(4))
                }
                cardLayout.addView(brandText)
            }
        }

        // 建议操作
        val suggestionText = TextView(context).apply {
            text = verdict.suggestion?.let { "建议：$it" } ?: ""
            textSize = 16f
            setTextColor(Color.WHITE)
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, dpToPx(8), 0, dpToPx(12))
        }
        cardLayout.addView(suggestionText)

        rootLayout.addView(cardLayout)

        // 操作按钮区域
        val buttonLayout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 通知家人按钮
        val notifyFamilyBtn = Button(context).apply {
            text = getString(R.string.alert_call_family)
            textSize = 18f
            setTextColor(Color.WHITE)
            setBackgroundColor(0xFF1565C0.toInt()) // 蓝色
            setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14))
            setOnClickListener {
                onNotifyFamilyClicked()
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, dpToPx(12))
            }
        }
        buttonLayout.addView(notifyFamilyBtn)

        // 查看证据按钮
        val viewEvidenceBtn = Button(context).apply {
            text = "查看详情"
            textSize = 16f
            setTextColor(Color.WHITE)
            setBackgroundColor(0x40FFFFFF.toInt())
            setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12))
            setOnClickListener {
                onViewEvidenceClicked()
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                setMargins(0, 0, 0, dpToPx(12))
            }
        }
        buttonLayout.addView(viewEvidenceBtn)

        // 返回/关闭按钮（需长按确认，防误触）
        val closeBtn = Button(context).apply {
            text = "长按确认关闭"
            textSize = 16f
            setTextColor(Color.WHITE)
            setBackgroundColor(0x20FFFFFF.toInt())
            setPadding(dpToPx(16), dpToPx(12), dpToPx(16), dpToPx(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )

            // 长按关闭逻辑
            setOnTouchListener { _, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        closePressStartTime = System.currentTimeMillis()
                        this.text = "继续长按关闭..."
                        this.setBackgroundColor(0x40FF5252.toInt()) // 红色加深

                        closePressRunnable = Runnable {
                            if (System.currentTimeMillis() - closePressStartTime >= LONG_PRESS_CLOSE_DURATION) {
                                hideAlert()
                            }
                        }
                        mainHandler.postDelayed(closePressRunnable!!, LONG_PRESS_CLOSE_DURATION)
                        true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        closePressRunnable?.let { mainHandler.removeCallbacks(it) }
                        closePressRunnable = null
                        this.text = "长按确认关闭"
                        this.setBackgroundColor(0x20FFFFFF.toInt())
                        true
                    }
                    else -> false
                }
            }
        }
        buttonLayout.addView(closeBtn)

        // 用 ScrollView 包裹，防止内容过多
        val scrollView = ScrollView(context).apply {
            addView(rootLayout)
        }

        return scrollView
    }

    /**
     * 隐藏全屏提醒
     */
    private fun hideAlert() {
        hideAlertInternal()
        // 隐藏后显示桌面宠物
        showPet()
    }

    private fun hideAlertInternal() {
        alertView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            alertView = null
        }
    }

    // ==================== 桌面宠物 ====================

    /**
     * 显示桌面宠物（边缘小图标）
     */
    private fun showPet() {
        // 检查悬浮窗权限
        if (!PermissionUtil.canDrawOverlays(this)) {
            return
        }

        // 如果已有宠物，先移除
        hidePetInternal()

        val view = createPetView()
        val params = createPetLayoutParams()

        try {
            windowManager.addView(view, params)
            petView = view
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * 创建桌面宠物 View
     */
    private fun createPetView(): View {
        val context = this
        val size = dpToPx(PET_SIZE_DP)

        // 宠物容器
        val petContainer = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.TRANSPARENT)
            layoutParams = LinearLayout.LayoutParams(size, size)
        }

        // 宠物图标
        val petIcon = ImageView(context).apply {
            setImageResource(R.drawable.ic_pet_dog)
            setBackgroundColor(0x80FFFFFF.toInt()) // 半透明白色背景
            val padding = dpToPx(8)
            setPadding(padding, padding, padding, padding)
            layoutParams = LinearLayout.LayoutParams(size, size)
            // 圆形背景
            background = ContextCompat.getDrawable(context, R.drawable.bg_alert_green)
        }

        petContainer.addView(petIcon)

        // 点击和拖拽处理
        petContainer.setOnTouchListener { view, event ->
            val params = view.layoutParams as WindowManager.LayoutParams

            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    petTouchStartX = event.rawX
                    petTouchStartY = event.rawY
                    petX = params.x
                    petY = params.y
                    isPetDragging = false
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - petTouchStartX
                    val dy = event.rawY - petTouchStartY

                    if (abs(dx) > 10 || abs(dy) > 10) {
                        isPetDragging = true
                    }

                    if (isPetDragging) {
                        params.x = petX + dx.toInt()
                        params.y = petY + dy.toInt()
                        try {
                            windowManager.updateViewLayout(view, params)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    if (!isPetDragging) {
                        // 点击事件：展开提醒
                        currentVerdict?.let { verdict ->
                            showAlert(verdict)
                            hidePetInternal()
                        }
                    } else {
                        // 拖拽结束，吸附到边缘
                        snapToEdge(view, params)
                    }
                    true
                }
                else -> false
            }
        }

        return petContainer
    }

    /**
     * 宠物吸附到屏幕边缘
     */
    private fun snapToEdge(view: View, params: WindowManager.LayoutParams) {
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels
        val viewWidth = view.width

        val centerX = params.x + viewWidth / 2
        params.x = if (centerX < screenWidth / 2) {
            // 吸附到左边
            dpToPx(PET_MARGIN_DP)
        } else {
            // 吸附到右边
            screenWidth - viewWidth - dpToPx(PET_MARGIN_DP)
        }

        try {
            windowManager.updateViewLayout(view, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun hidePetInternal() {
        petView?.let { view ->
            try {
                windowManager.removeView(view)
            } catch (e: Exception) {
                e.printStackTrace()
            }
            petView = null
        }
    }

    // ==================== 隐藏所有 ====================

    private fun hideAll() {
        hideAlertInternal()
        hidePetInternal()
        currentVerdict = null
    }

    // ==================== 按钮点击事件 ====================

    /**
     * 通知家人按钮点击
     */
    private fun onNotifyFamilyClicked() {
        val verdict = currentVerdict ?: return
        val paymentInfo = verdict.paymentInfo

        // 创建告警记录
        val record = com.companyxray.guardian.data.AlertRecord(
            riskLevel = verdict.riskLevel,
            riskType = verdict.riskType ?: "未知风险",
            description = verdict.description,
            amount = paymentInfo?.amount,
            targetName = paymentInfo?.payeeName,
            packageName = paymentInfo?.packageName,
            familyNotified = true
        )

        // 保存记录
        prefs.addAlertRecord(record)

        // 发送给家人
        kotlinx.coroutines.GlobalScope.launch(kotlinx.coroutines.Dispatchers.IO) {
            apiClient.sendAlert(record)
        }

        // 关闭悬浮窗，显示宠物
        hideAlert()
    }

    /**
     * 查看证据按钮点击
     */
    private fun onViewEvidenceClicked() {
        // 可以跳转到详情页面
        // 这里暂时关闭提醒
        hideAlert()
    }

    // ==================== 振动提醒 ====================

    /**
     * 振动提醒
     */
    private fun vibrateAlert() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val pattern = longArrayOf(0, 500, 200, 500, 200, 500) // 震动3次
                vibrator.vibrate(
                    VibrationEffect.createWaveform(pattern, -1)
                )
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(longArrayOf(0, 500, 200, 500, 200, 500), -1)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    // ==================== 降级方案 ====================

    /**
     * 无悬浮窗权限时的降级方案：使用通知
     */
    private fun showFallbackNotification(verdict: Verdict) {
        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        val paymentInfo = verdict.paymentInfo
        val amountText = paymentInfo?.amountText ?: "未知金额"
        val payeeText = paymentInfo?.payeeName ?: "未知收款方"

        val notification = NotificationCompat.Builder(this, CHANNEL_FLOATING)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle(getString(R.string.floating_alert_title))
            .setContentText("向「$payeeText」支付 $amountText，请谨慎操作")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(verdict.description + "\n" + (verdict.suggestion ?: ""))
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_ALARM)
            .setAutoCancel(true)
            .build()

        try {
            notificationManager.notify(2001, notification)
        } catch (e: SecurityException) {
            // 通知权限未授予
        }
    }

    // ==================== 通知渠道 ====================

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

            val channel = NotificationChannel(
                CHANNEL_FLOATING,
                getString(R.string.notification_channel_risk),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.notification_channel_risk_desc)
                enableVibration(true)
                enableLights(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun buildServiceNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_FLOATING)
            .setSmallIcon(R.drawable.ic_shield)
            .setContentTitle(getString(R.string.app_name))
            .setContentText("悬浮窗提醒服务运行中")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    // ==================== LayoutParams ====================

    /**
     * 创建全屏悬浮窗 LayoutParams
     */
    private fun createFullScreenLayoutParams(): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = 0
        }
    }

    /**
     * 创建宠物悬浮窗 LayoutParams
     */
    private fun createPetLayoutParams(): WindowManager.LayoutParams {
        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val size = dpToPx(PET_SIZE_DP)
        val displayMetrics = resources.displayMetrics

        return WindowManager.LayoutParams(
            size,
            size,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = dpToPx(PET_MARGIN_DP)
            y = displayMetrics.heightPixels / 3 // 初始位置在屏幕右侧1/3处
        }
    }

    // ==================== 工具方法 ====================

    private fun dpToPx(dp: Int): Int {
        val density = resources.displayMetrics.density
        return (dp * density + 0.5f).toInt()
    }
}
