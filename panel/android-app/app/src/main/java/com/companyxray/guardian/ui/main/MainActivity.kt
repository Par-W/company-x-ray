package com.companyxray.guardian.ui.main

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.companyxray.guardian.R
import com.companyxray.guardian.data.AlertRecord
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.databinding.ActivityMainBinding
import com.companyxray.guardian.ui.family.FamilyBindActivity
import com.companyxray.guardian.ui.history.AlertHistoryActivity
import com.companyxray.guardian.ui.onboarding.OnboardingActivity
import com.companyxray.guardian.ui.settings.SettingsActivity
import com.companyxray.guardian.util.PermissionUtil
import com.companyxray.guardian.util.PreferenceManager

/**
 * 主界面
 *
 * - 显示保护状态（保护中/未授权/已暂停）
 * - 大卡片：当前保护状态 + 最近一次检测结果
 * - 功能入口：家人管理、告警历史、设置
 * - 长辈友好布局：大图标大文字
 * - 检查各项权限状态，未授权显示引导
 * - 守护开关（用户可手动暂停/恢复保护）
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefManager: PreferenceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefManager = PreferenceManager.getInstance(this)

        // 如果还没完成引导，先跳引导页
        if (!prefManager.isOnboardingDone()) {
            startActivity(Intent(this, OnboardingActivity::class.java))
            finish()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupClicks()
        updateGuardStatus()
        updateStats()
        updateLatestAlert()
    }

    override fun onResume() {
        super.onResume()
        updateGuardStatus()
        updateStats()
        updateLatestAlert()
    }

    private fun setupClicks() {
        // 守护开关
        binding.switchGuard.setOnCheckedChangeListener { _, isChecked ->
            prefManager.setGuardEnabled(isChecked)
            updateGuardStatus()
        }

        // 权限引导按钮
        binding.btnFixPermission.setOnClickListener {
            startActivity(Intent(this, OnboardingActivity::class.java))
        }

        // 功能入口：家人管理
        binding.cardFamily.setOnClickListener {
            startActivity(Intent(this, FamilyBindActivity::class.java))
        }

        // 功能入口：告警历史
        binding.cardHistory.setOnClickListener {
            startActivity(Intent(this, AlertHistoryActivity::class.java))
        }

        // 功能入口：设置
        binding.cardSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        // 最近告警卡片点击
        binding.cardLatestAlert.setOnClickListener {
            startActivity(Intent(this, AlertHistoryActivity::class.java))
        }
    }

    /**
     * 更新守护状态显示
     */
    private fun updateGuardStatus() {
        val guardEnabled = prefManager.isGuardEnabled()
        val accessibilityOk = PermissionUtil.isAccessibilityEnabled(this)
        val overlayOk = PermissionUtil.canDrawOverlays(this)
        val notificationOk = PermissionUtil.areNotificationsEnabled(this)

        val allPermissionsOk = accessibilityOk && overlayOk && notificationOk

        val isActive = allPermissionsOk && guardEnabled
        val isPaused = allPermissionsOk && !guardEnabled
        val isUnauthorized = !allPermissionsOk

        // 更新状态卡片
        when {
            isActive -> {
                binding.tvStatusTitle.text = "保护中"
                binding.tvStatusTitle.setTextColor(getColor(R.color.risk_low))
                binding.tvStatusDesc.text = "X光守护正在保护您的付款安全"
                binding.ivStatusIcon.setImageResource(R.drawable.ic_shield)
                binding.layoutStatusBg.setBackgroundResource(R.drawable.bg_alert_green)
                binding.switchGuard.isChecked = true
            }
            isPaused -> {
                binding.tvStatusTitle.text = "已暂停"
                binding.tvStatusTitle.setTextColor(getColor(R.color.risk_medium))
                binding.tvStatusDesc.text = "守护已暂停，点击开关恢复保护"
                binding.ivStatusIcon.setImageResource(R.drawable.ic_shield)
                binding.layoutStatusBg.setBackgroundResource(R.drawable.bg_alert_yellow)
                binding.switchGuard.isChecked = false
            }
            isUnauthorized -> {
                binding.tvStatusTitle.text = "未授权"
                binding.tvStatusTitle.setTextColor(getColor(R.color.risk_high))
                binding.tvStatusDesc.text = "请开启必要权限以启动保护"
                binding.ivStatusIcon.setImageResource(R.drawable.ic_shield)
                binding.layoutStatusBg.setBackgroundResource(R.drawable.bg_alert_red)
                binding.switchGuard.isChecked = false
            }
        }

        // 权限状态区域
        updatePermissionIndicators(accessibilityOk, overlayOk, notificationOk)

        // 未授权时显示修复按钮
        binding.btnFixPermission.visibility = if (isUnauthorized) {
            View.VISIBLE
        } else {
            View.GONE
        }
    }

    private fun updatePermissionIndicators(
        accessibilityOk: Boolean,
        overlayOk: Boolean,
        notificationOk: Boolean
    ) {
        // 无障碍
        binding.tvAccessibilityStatus.text = if (accessibilityOk) "✓ 无障碍" else "✗ 无障碍"
        binding.tvAccessibilityStatus.setTextColor(
            if (accessibilityOk) getColor(R.color.risk_low) else getColor(R.color.risk_high)
        )

        // 悬浮窗
        binding.tvOverlayStatus.text = if (overlayOk) "✓ 悬浮窗" else "✗ 悬浮窗"
        binding.tvOverlayStatus.setTextColor(
            if (overlayOk) getColor(R.color.risk_low) else getColor(R.color.risk_high)
        )

        // 通知
        binding.tvNotificationStatus.text = if (notificationOk) "✓ 通知" else "✗ 通知"
        binding.tvNotificationStatus.setTextColor(
            if (notificationOk) getColor(R.color.risk_low) else getColor(R.color.risk_high)
        )
    }

    /**
     * 更新统计数据
     */
    private fun updateStats() {
        val todayBlocked = prefManager.getTodayBlocked()
        val guardDays = prefManager.getGuardDays()

        binding.tvTodayBlocked.text = todayBlocked.toString()
        binding.tvGuardDays.text = guardDays.toString()
    }

    /**
     * 更新最近一条告警
     */
    private fun updateLatestAlert() {
        val records = prefManager.getAlertRecords()
        if (records.isEmpty()) {
            binding.cardLatestAlert.visibility = View.GONE
            return
        }

        val latest = records.first()
        binding.cardLatestAlert.visibility = View.VISIBLE

        binding.tvLatestMerchant.text = latest.merchantName
        binding.tvLatestAmount.text = latest.amount?.let { "¥%.2f".format(it) } ?: "—"
        binding.tvLatestTime.text = formatTime(latest.ts)

        // 风险等级颜色
        when (latest.level) {
            RiskLevel.RED_HARD -> {
                binding.tvLatestRisk.text = "高危"
                binding.tvLatestRisk.setTextColor(getColor(R.color.risk_high))
            }
            RiskLevel.RED_SOFT -> {
                binding.tvLatestRisk.text = "可疑"
                binding.tvLatestRisk.setTextColor(getColor(R.color.risk_medium))
            }
            RiskLevel.YELLOW -> {
                binding.tvLatestRisk.text = "关注"
                binding.tvLatestRisk.setTextColor(getColor(R.color.risk_medium))
            }
            RiskLevel.GREEN -> {
                binding.tvLatestRisk.text = "正常"
                binding.tvLatestRisk.setTextColor(getColor(R.color.risk_low))
            }
        }
    }

    private fun formatTime(timestamp: Long): String {
        val now = System.currentTimeMillis()
        val diff = now - timestamp
        val minutes = diff / (60 * 1000)
        val hours = diff / (60 * 60 * 1000)

        return when {
            minutes < 1 -> "刚刚"
            minutes < 60 -> "${minutes}分钟前"
            hours < 24 -> "${hours}小时前"
            else -> {
                val sdf = java.text.SimpleDateFormat("MM-dd HH:mm", java.util.Locale.getDefault())
                sdf.format(java.util.Date(timestamp))
            }
        }
    }
}
