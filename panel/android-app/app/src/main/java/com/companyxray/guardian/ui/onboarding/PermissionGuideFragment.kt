package com.companyxray.guardian.ui.onboarding

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.companyxray.guardian.R
import com.companyxray.guardian.databinding.FragmentPermissionGuideBinding
import com.companyxray.guardian.util.PermissionUtil

/**
 * 权限引导 Fragment
 *
 * 用于引导页中展示单个权限的引导说明
 * 可复用于主界面的权限缺失提醒
 */
class PermissionGuideFragment : Fragment() {

    private var _binding: FragmentPermissionGuideBinding? = null
    private val binding get() = _binding!!

    private var permissionType: PermissionType = PermissionType.ACCESSIBILITY
    private var onGrantedListener: (() -> Unit)? = null

    enum class PermissionType {
        ACCESSIBILITY,  // 无障碍权限
        OVERLAY,        // 悬浮窗权限
        NOTIFICATION    // 通知权限
    }

    companion object {
        private const val ARG_PERMISSION_TYPE = "permission_type"

        fun newInstance(type: PermissionType): PermissionGuideFragment {
            val fragment = PermissionGuideFragment()
            val args = Bundle()
            args.putString(ARG_PERMISSION_TYPE, type.name)
            fragment.arguments = args
            return fragment
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            val typeName = it.getString(ARG_PERMISSION_TYPE)
            permissionType = PermissionType.valueOf(
                typeName ?: PermissionType.ACCESSIBILITY.name
            )
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPermissionGuideBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupContent()
        setupButton()
    }

    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun setupContent() {
        when (permissionType) {
            PermissionType.ACCESSIBILITY -> {
                binding.ivIcon.setImageResource(R.drawable.ic_shield)
                binding.tvTitle.text = "开启无障碍权限"
                binding.tvDescription.text = buildString {
                    append("无障碍服务帮助我们：\n")
                    append("• 识别付款页面的商家信息\n")
                    append("• 实时核验风险并提醒\n")
                    append("• 不收集您的密码和验证码\n\n")
                    append("点击下方按钮，在设置中开启\n")
                    append("「X光守护监控服务」")
                }
                binding.btnGrant.text = "去开启无障碍"
            }
            PermissionType.OVERLAY -> {
                binding.ivIcon.setImageResource(R.drawable.ic_shield)
                binding.tvTitle.text = "开启悬浮窗权限"
                binding.tvDescription.text = buildString {
                    append("悬浮窗帮助我们：\n")
                    append("• 在付款页面弹出风险提醒\n")
                    append("• 不打断您的正常操作\n")
                    append("• 随时可以关闭提醒\n\n")
                    append("点击下方按钮，在设置中开启\n")
                    append("「显示在其他应用上层」")
                }
                binding.btnGrant.text = "去开启悬浮窗"
            }
            PermissionType.NOTIFICATION -> {
                binding.ivIcon.setImageResource(R.drawable.ic_shield)
                binding.tvTitle.text = "开启通知权限"
                binding.tvDescription.text = buildString {
                    append("通知帮助我们：\n")
                    append("• 发现风险时立即提醒您\n")
                    append("• 守护服务运行状态通知\n")
                    append("• 家人求助时及时通知\n\n")
                    append("点击下方按钮，在设置中开启\n")
                    append("「允许通知」")
                }
                binding.btnGrant.text = "去开启通知"
            }
        }
    }

    private fun setupButton() {
        binding.btnGrant.setOnClickListener {
            context?.let { ctx ->
                val intent = when (permissionType) {
                    PermissionType.ACCESSIBILITY ->
                        PermissionUtil.getAccessibilitySettingsIntent()
                    PermissionType.OVERLAY ->
                        PermissionUtil.getOverlaySettingsIntent(ctx)
                    PermissionType.NOTIFICATION ->
                        PermissionUtil.getNotificationSettingsIntent(ctx)
                }
                startActivity(intent)
            }
        }
    }

    private fun updatePermissionStatus() {
        val granted = when (permissionType) {
            PermissionType.ACCESSIBILITY -> context?.let {
                PermissionUtil.isAccessibilityEnabled(it)
            } ?: false
            PermissionType.OVERLAY -> context?.let {
                PermissionUtil.canDrawOverlays(it)
            } ?: false
            PermissionType.NOTIFICATION -> context?.let {
                PermissionUtil.areNotificationsEnabled(it)
            } ?: false
        }

        if (granted) {
            binding.tvStatus.text = "✓ 已开启"
            binding.tvStatus.setTextColor(resources.getColor(R.color.risk_low, null))
            binding.btnGrant.text = "已开启"
            binding.btnGrant.isEnabled = false
            onGrantedListener?.invoke()
        } else {
            binding.tvStatus.text = "✗ 未开启"
            binding.tvStatus.setTextColor(resources.getColor(R.color.risk_high, null))
            binding.btnGrant.isEnabled = true
        }
    }

    fun isPermissionGranted(): Boolean {
        return when (permissionType) {
            PermissionType.ACCESSIBILITY -> context?.let {
                PermissionUtil.isAccessibilityEnabled(it)
            } ?: false
            PermissionType.OVERLAY -> context?.let {
                PermissionUtil.canDrawOverlays(it)
            } ?: false
            PermissionType.NOTIFICATION -> context?.let {
                PermissionUtil.areNotificationsEnabled(it)
            } ?: false
        }
    }

    fun setOnGrantedListener(listener: () -> Unit) {
        onGrantedListener = listener
    }
}
