package com.companyxray.guardian.ui.onboarding

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AppCompatActivity
import androidx.viewpager2.widget.ViewPager2
import com.companyxray.guardian.R
import com.companyxray.guardian.databinding.ActivityOnboardingBinding
import com.companyxray.guardian.databinding.ItemOnboardingStepBinding
import com.companyxray.guardian.ui.main.MainActivity
import com.companyxray.guardian.util.PermissionUtil
import com.companyxray.guardian.util.PreferenceManager

/**
 * 授权引导页 - 多步骤引导
 *
 * Step 1: 产品介绍（守护家人付款安全）
 * Step 2: 隐私说明（本机处理、原始内容不上传、可随时撤销）
 * Step 3: 开启无障碍权限
 * Step 4: 开启悬浮窗权限
 * Step 5: 开启通知权限
 * Step 6: 绑定家人
 */
class OnboardingActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOnboardingBinding
    private lateinit var prefManager: PreferenceManager
    private val totalSteps = 6
    private var currentStep = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefManager = PreferenceManager.getInstance(this)
        binding = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupViewPager()
        setupButtons()
        updateStepIndicator()
    }

    override fun onResume() {
        super.onResume()
        // 权限步骤返回时刷新状态显示
        val adapter = binding.viewPager.adapter as? OnboardingPagerAdapter
        adapter?.notifyItemChanged(currentStep)
        updateButtonState()
    }

    private fun setupViewPager() {
        binding.viewPager.adapter = OnboardingPagerAdapter()
        binding.viewPager.isUserInputEnabled = false // 禁止滑动，必须点按钮
        binding.viewPager.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                currentStep = position
                updateStepIndicator()
                updateButtonState()
            }
        })
    }

    private fun setupButtons() {
        binding.btnNext.setOnClickListener {
            handleNextStep()
        }

        binding.btnBack.setOnClickListener {
            if (currentStep > 0) {
                binding.viewPager.currentItem = currentStep - 1
            }
        }

        binding.btnSkip.setOnClickListener {
            // 跳过直接进入主页（但会提示权限未开启）
            goToMain()
        }
    }

    private fun handleNextStep() {
        when (currentStep) {
            0, 1 -> {
                // 产品介绍、隐私说明：直接下一步
                goToNextStep()
            }
            2 -> {
                // 无障碍权限：跳转设置
                startActivity(PermissionUtil.getAccessibilitySettingsIntent())
            }
            3 -> {
                // 悬浮窗权限：跳转设置
                startActivity(PermissionUtil.getOverlaySettingsIntent(this))
            }
            4 -> {
                // 通知权限：跳转设置
                startActivity(PermissionUtil.getNotificationSettingsIntent(this))
            }
            5 -> {
                // 绑定家人步骤：完成引导
                finishOnboarding()
            }
        }
    }

    private fun goToNextStep() {
        if (currentStep < totalSteps - 1) {
            binding.viewPager.currentItem = currentStep + 1
        }
    }

    private fun updateStepIndicator() {
        binding.tvStepIndicator.text = getString(
            R.string.onboarding_step_format,
            currentStep + 1, totalSteps
        )
        // 更新进度指示器
        val indicators = arrayOf(
            binding.indicator1, binding.indicator2, binding.indicator3,
            binding.indicator4, binding.indicator5, binding.indicator6
        )
        indicators.forEachIndexed { index, view ->
            view.isSelected = index <= currentStep
        }
    }

    private fun updateButtonState() {
        // 返回按钮：第一步不显示
        binding.btnBack.visibility = if (currentStep == 0) View.GONE else View.VISIBLE

        // 跳过按钮：最后几步不显示
        binding.btnSkip.visibility = if (currentStep >= 4) View.GONE else View.VISIBLE

        // 下一步按钮文字
        when (currentStep) {
            0, 1 -> binding.btnNext.text = getString(R.string.next)
            2 -> {
                val enabled = PermissionUtil.isAccessibilityEnabled(this)
                binding.btnNext.text = if (enabled) {
                    getString(R.string.onboarding_permission_done)
                } else {
                    getString(R.string.onboarding_grant_accessibility)
                }
            }
            3 -> {
                val enabled = PermissionUtil.canDrawOverlays(this)
                binding.btnNext.text = if (enabled) {
                    getString(R.string.onboarding_permission_done)
                } else {
                    getString(R.string.onboarding_grant_overlay)
                }
            }
            4 -> {
                val enabled = PermissionUtil.areNotificationsEnabled(this)
                binding.btnNext.text = if (enabled) {
                    getString(R.string.onboarding_permission_done)
                } else {
                    getString(R.string.onboarding_grant_notification)
                }
            }
            5 -> binding.btnNext.text = getString(R.string.onboarding_start)
        }
    }

    private fun finishOnboarding() {
        prefManager.setOnboardingDone(true)
        prefManager.initStartDateIfNeeded()
        goToMain()
    }

    private fun goToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    // ===== ViewPager2 适配器 =====

    private inner class OnboardingPagerAdapter :
        androidx.recyclerview.widget.RecyclerView.Adapter<OnboardingViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OnboardingViewHolder {
            val binding = ItemOnboardingStepBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            return OnboardingViewHolder(binding)
        }

        override fun onBindViewHolder(holder: OnboardingViewHolder, position: Int) {
            holder.bind(position)
        }

        override fun getItemCount(): Int = totalSteps
    }

    private inner class OnboardingViewHolder(
        private val itemBinding: ItemOnboardingStepBinding
    ) : androidx.recyclerview.widget.RecyclerView.ViewHolder(itemBinding.root) {

        fun bind(position: Int) {
            when (position) {
                0 -> bindWelcomeStep()
                1 -> bindPrivacyStep()
                2 -> bindAccessibilityStep()
                3 -> bindOverlayStep()
                4 -> bindNotificationStep()
                5 -> bindFamilyStep()
            }
        }

        private fun bindWelcomeStep() {
            itemBinding.ivIcon.setImageResource(R.drawable.ic_shield)
            itemBinding.tvTitle.text = getString(R.string.onboarding_title_welcome)
            itemBinding.tvDescription.text = buildString {
                append("守护家人付款安全\n")
                append("智能识别付款风险\n")
                append("让家人安心消费")
            }
            itemBinding.layoutPermissionStatus.visibility = View.GONE
        }

        private fun bindPrivacyStep() {
            itemBinding.ivIcon.setImageResource(R.drawable.ic_shield)
            itemBinding.tvTitle.text = "隐私保护说明"
            itemBinding.tvDescription.text = buildString {
                append("• 我们为什么需要这些权限？\n")
                append("  为了帮您识别付款风险，保护您的钱袋子\n\n")
                append("• 我们收集什么？\n")
                append("  只收集付款页面上的商家名称和金额\n")
                append("  不收集您的密码、验证码、聊天内容\n\n")
                append("• 数据存在哪里？\n")
                append("  大部分检测在您手机本地完成\n")
                append("  只有风险告警会发给您绑定的家人\n\n")
                append("• 您可以随时：\n")
                append("  关闭权限、解绑家人、删除所有数据")
            }
            itemBinding.layoutPermissionStatus.visibility = View.GONE
        }

        private fun bindAccessibilityStep() {
            itemBinding.ivIcon.setImageResource(R.drawable.ic_shield)
            itemBinding.tvTitle.text = "开启无障碍权限"
            itemBinding.tvDescription.text = buildString {
                append("无障碍服务帮助我们：\n")
                append("• 识别付款页面的商家名称和金额\n")
                append("• 实时核验商家资质，发现风险提醒您\n")
                append("• 不读取您的密码、验证码、聊天记录\n")
                append("• 不收集您的个人隐私信息\n\n")
                append("点击下方按钮，在设置中找到\n")
                append("「公司X光守护服务」并开启")
            }
            updatePermissionStatus(
                PermissionUtil.isAccessibilityEnabled(this@OnboardingActivity)
            )
        }

        private fun bindOverlayStep() {
            itemBinding.ivIcon.setImageResource(R.drawable.ic_shield)
            itemBinding.tvTitle.text = "开启悬浮窗权限"
            itemBinding.tvDescription.text = buildString {
                append("悬浮窗权限帮助我们：\n")
                append("• 发现高风险时，在当前页面弹出提醒\n")
                append("• 提醒不会自动消失，防止您误操作错过\n")
                append("• 您随时可以关闭提醒，也可以长按退出\n\n")
                append("点击下方按钮，在设置中开启\n")
                append("「显示在其他应用上层」")
            }
            updatePermissionStatus(
                PermissionUtil.canDrawOverlays(this@OnboardingActivity)
            )
        }

        private fun bindNotificationStep() {
            itemBinding.ivIcon.setImageResource(R.drawable.ic_shield)
            itemBinding.tvTitle.text = "开启通知权限"
            itemBinding.tvDescription.text = buildString {
                append("通知帮助我们：\n")
                append("• 发现风险时立即提醒您\n")
                append("• 守护服务运行状态通知\n")
                append("• 家人求助时及时通知\n\n")
                append("点击下方按钮，在设置中开启\n")
                append("「允许通知」")
            }
            updatePermissionStatus(
                PermissionUtil.areNotificationsEnabled(this@OnboardingActivity)
            )
        }

        private fun bindFamilyStep() {
            itemBinding.ivIcon.setImageResource(R.drawable.ic_shield)
            itemBinding.tvTitle.text = getString(R.string.onboarding_title_family)
            itemBinding.tvDescription.text = buildString {
                append("绑定家人后：\n")
                append("• 遇到风险可一键通知家人\n")
                append("• 家人也可以守护您\n")
                append("• 可在设置中随时管理\n\n")
                append("您可以现在绑定，也可以稍后在\n")
                append("「家人守护」页面添加")
            }
            itemBinding.layoutPermissionStatus.visibility = View.GONE
        }

        private fun updatePermissionStatus(granted: Boolean) {
            itemBinding.layoutPermissionStatus.visibility = View.VISIBLE
            if (granted) {
                itemBinding.tvPermissionStatus.text = "✓ 已开启"
                itemBinding.tvPermissionStatus.setTextColor(
                    resources.getColor(R.color.risk_low, null)
                )
            } else {
                itemBinding.tvPermissionStatus.text = "✗ 未开启"
                itemBinding.tvPermissionStatus.setTextColor(
                    resources.getColor(R.color.risk_high, null)
                )
            }
        }
    }
}
