package com.companyxray.guardian.ui.settings

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.companyxray.guardian.R
import com.companyxray.guardian.databinding.ActivitySettingsBinding
import com.companyxray.guardian.ui.onboarding.OnboardingActivity
import com.companyxray.guardian.util.PermissionUtil
import com.companyxray.guardian.util.PreferenceManager

/**
 * 设置页面
 *
 * - 守护开关
 * - 权限管理（跳转到各权限设置）
 * - 振动提醒开关
 * - 宠物形象开关
 * - 撤销授权 / 解绑（删除所有数据）
 * - 关于（版本号、隐私政策入口）
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var prefManager: PreferenceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefManager = PreferenceManager.getInstance(this)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupSwitches()
        setupPermissionItems()
        setupAboutItems()
        setupDangerousActions()
        refreshUI()
    }

    override fun onResume() {
        super.onResume()
        refreshPermissionStatus()
    }

    private fun setupToolbar() {
        binding.toolbar.title = getString(R.string.settings_title)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupSwitches() {
        // 守护开关
        binding.switchGuard.setOnCheckedChangeListener { _, isChecked ->
            prefManager.setGuardEnabled(isChecked)
            updateGuardStatusText(isChecked)
        }

        // 震动提醒
        binding.switchVibrate.setOnCheckedChangeListener { _, isChecked ->
            prefManager.setVibrateEnabled(isChecked)
        }

        // 宠物形象
        binding.switchPet.setOnCheckedChangeListener { _, isChecked ->
            prefManager.setPetEnabled(isChecked)
        }
    }

    private fun setupPermissionItems() {
        // 无障碍权限
        binding.itemAccessibility.setOnClickListener {
            startActivity(PermissionUtil.getAccessibilitySettingsIntent())
        }

        // 悬浮窗权限
        binding.itemOverlay.setOnClickListener {
            startActivity(PermissionUtil.getOverlaySettingsIntent(this))
        }

        // 通知权限
        binding.itemNotification.setOnClickListener {
            startActivity(PermissionUtil.getNotificationSettingsIntent(this))
        }

        // 重新走引导
        binding.itemReOnboarding.setOnClickListener {
            startActivity(Intent(this, OnboardingActivity::class.java))
        }
    }

    private fun setupAboutItems() {
        // 隐私政策
        binding.itemPrivacy.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.settings_privacy)
                .setMessage(
                    "隐私政策摘要：\n" +
                        "• 所有检测在本地完成\n" +
                        "• 原始内容不上传服务器\n" +
                        "• 仅上传匿名风险特征\n" +
                        "• 可随时撤销授权\n" +
                        "• 可一键删除所有数据"
                )
                .setPositiveButton(R.string.ok, null)
                .show()
        }

        // 用户协议
        binding.itemAgreement.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.settings_agreement)
                .setMessage("用户协议内容…")
                .setPositiveButton(R.string.ok, null)
                .show()
        }

        // 使用帮助
        binding.itemHelp.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.settings_help)
                .setMessage(
                    "使用帮助：\n\n" +
                        "1. 开启无障碍权限\n" +
                        "2. 开启悬浮窗权限\n" +
                        "3. 正常使用手机付款\n" +
                        "4. 遇到风险时会自动提醒\n" +
                        "5. 可一键通知家人求助"
                )
                .setPositiveButton(R.string.ok, null)
                .show()
        }
    }

    private fun setupDangerousActions() {
        // 撤销授权 / 解绑
        binding.itemRevoke.setOnClickListener {
            showRevokeConfirmDialog()
        }
    }

    private fun refreshUI() {
        // 守护开关
        val guardEnabled = prefManager.isGuardEnabled()
        binding.switchGuard.isChecked = guardEnabled
        updateGuardStatusText(guardEnabled)

        // 震动提醒
        binding.switchVibrate.isChecked = prefManager.isVibrateEnabled()

        // 宠物形象
        binding.switchPet.isChecked = prefManager.isPetEnabled()

        // 版本号
        binding.tvVersion.text = getVersionName()

        // 权限状态
        refreshPermissionStatus()
    }

    private fun updateGuardStatusText(enabled: Boolean) {
        if (enabled) {
            binding.tvGuardStatus.text = "保护中"
            binding.tvGuardStatus.setTextColor(getColor(R.color.risk_low))
        } else {
            binding.tvGuardStatus.text = "已暂停"
            binding.tvGuardStatus.setTextColor(getColor(R.color.risk_medium))
        }
    }

    private fun refreshPermissionStatus() {
        // 无障碍
        val accessibilityOk = PermissionUtil.isAccessibilityEnabled(this)
        binding.tvAccessibilityStatus.text = if (accessibilityOk) "已开启" else "未开启"
        binding.tvAccessibilityStatus.setTextColor(
            if (accessibilityOk) getColor(R.color.risk_low) else getColor(R.color.risk_high)
        )

        // 悬浮窗
        val overlayOk = PermissionUtil.canDrawOverlays(this)
        binding.tvOverlayStatus.text = if (overlayOk) "已开启" else "未开启"
        binding.tvOverlayStatus.setTextColor(
            if (overlayOk) getColor(R.color.risk_low) else getColor(R.color.risk_high)
        )

        // 通知
        val notificationOk = PermissionUtil.areNotificationsEnabled(this)
        binding.tvNotificationStatus.text = if (notificationOk) "已开启" else "未开启"
        binding.tvNotificationStatus.setTextColor(
            if (notificationOk) getColor(R.color.risk_low) else getColor(R.color.risk_high)
        )
    }

    /**
     * 撤销授权确认对话框
     */
    private fun showRevokeConfirmDialog() {
        AlertDialog.Builder(this)
            .setTitle("撤销授权并清除数据")
            .setMessage(
                "确定要撤销所有授权并删除数据吗？\n\n" +
                    "• 将关闭守护服务\n" +
                    "• 将清除所有本地数据\n" +
                    "• 将解除所有家人绑定\n" +
                    "• 此操作不可撤销"
            )
            .setPositiveButton("确认撤销") { _, _ ->
                revokeAllPermissions()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    /**
     * 撤销所有授权，清除所有数据
     */
    private fun revokeAllPermissions() {
        // 关闭守护开关
        prefManager.setGuardEnabled(false)

        // 清除所有用户数据（包含家人绑定信息、告警记录等）
        prefManager.clearAllUserData()

        // 显示提示
        Toast.makeText(this, "已撤销所有授权", Toast.LENGTH_SHORT).show()

        // 跳转到应用设置页，让用户手动关闭权限
        startActivity(PermissionUtil.getAppDetailsSettingsIntent(this))

        // 退出应用
        finishAffinity()
    }

    /**
     * 获取版本号
     */
    private fun getVersionName(): String {
        return try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            packageInfo.versionName
        } catch (e: Exception) {
            "1.0"
        }
    }
}
