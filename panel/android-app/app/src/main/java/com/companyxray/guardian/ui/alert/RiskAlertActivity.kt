package com.companyxray.guardian.ui.alert

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.companyxray.guardian.R
import com.companyxray.guardian.data.AnchorResult
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.data.Verdict
import com.companyxray.guardian.databinding.ActivityRiskAlertBinding
import com.companyxray.guardian.databinding.ItemAnchorEvidenceBinding
import com.companyxray.guardian.util.PreferenceManager

/**
 * 全屏风险提醒 Activity
 *
 * 作为悬浮窗的备用方案（当悬浮窗权限不足时使用）
 * 全屏显示，根据风险等级设置背景色（红/黄/绿）
 *
 * 接收 Intent 中的 Verdict 数据（Gson 序列化）
 * 通过 Intent.putExtra(EXTRA_VERDICT_JSON, verdictJson) 传入
 */
class RiskAlertActivity : AppCompatActivity() {

    private lateinit var binding: ActivityRiskAlertBinding
    private lateinit var prefManager: PreferenceManager
    private var verdict: Verdict? = null

    companion object {
        const val EXTRA_VERDICT_JSON = "extra_verdict_json"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefManager = PreferenceManager.getInstance(this)

        // 全屏显示 + 锁屏显示 + 点亮屏幕
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_FULLSCREEN
        )

        binding = ActivityRiskAlertBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // 解析传入的 Verdict 数据
        val verdictJson = intent.getStringExtra(EXTRA_VERDICT_JSON)
        verdict = verdictJson?.let { Verdict.fromJson(it) }

        if (verdict == null) {
            // 如果没有数据，使用测试数据
            verdict = createMockVerdict()
        }

        verdict?.let {
            setupAlertUI(it)
            setupButtons(it)
            setupAnchorList(it.anchors)
            triggerVibration()
            startPetAnimation()
        }
    }

    override fun onBackPressed() {
        // 防误触关闭：返回按钮需要确认
        showExitConfirmDialog()
    }

    /**
     * 设置告警界面
     *
     * 文案合规原则：
     * - 红色场景用"高风险提醒""请先核实"等表述，不使用"一定是诈骗"等定性词汇
     * - 绿色场景用"未发现异常"等表述，不使用"放心付款""绝对安全"等绝对化词汇
     */
    private fun setupAlertUI(v: Verdict) {
        // 根据风险等级设置背景色和徽章
        when (v.level) {
            RiskLevel.RED_HARD -> {
                binding.root.setBackgroundResource(R.drawable.bg_alert_red)
                binding.tvRiskBadge.text = "高风险提醒"
                binding.tvRiskBadge.setBackgroundResource(R.drawable.bg_alert_red)
                binding.tvRiskBadge.setTextColor(getColor(R.color.on_risk_high))
            }
            RiskLevel.RED_SOFT -> {
                binding.root.setBackgroundResource(R.drawable.bg_alert_yellow)
                binding.tvRiskBadge.text = "请核实后再付款"
                binding.tvRiskBadge.setBackgroundResource(R.drawable.bg_alert_yellow)
                binding.tvRiskBadge.setTextColor(getColor(R.color.on_risk_medium))
            }
            RiskLevel.YELLOW -> {
                binding.root.setBackgroundResource(R.drawable.bg_alert_yellow)
                binding.tvRiskBadge.text = "请多留意"
                binding.tvRiskBadge.setBackgroundResource(R.drawable.bg_alert_yellow)
                binding.tvRiskBadge.setTextColor(getColor(R.color.on_risk_medium))
            }
            RiskLevel.GREEN -> {
                binding.root.setBackgroundResource(R.drawable.bg_alert_green)
                binding.tvRiskBadge.text = "未发现异常"
                binding.tvRiskBadge.setBackgroundResource(R.drawable.bg_alert_green)
                binding.tvRiskBadge.setTextColor(getColor(R.color.on_risk_low))
            }
        }

        // 商家名称
        binding.tvMerchantName.text = v.merchantName

        // 金额
        val amountText = v.amount?.let { "¥%.2f".format(it) } ?: "金额未检测"
        binding.tvAmount.text = amountText

        // 透明度分
        val transparencyText = v.transparency?.let { "透明度评分：${it}/100" }
            ?: "透明度评分：—"
        binding.tvTransparencyScore.text = transparencyText

        // 建议文案（事实表述，不定性）
        binding.tvSuggestion.text = v.advicePhrase
    }

    /**
     * 设置操作按钮
     *
     * 按钮文案合规原则：
     * - RED_HARD：最醒目，引导通知家人核实
     * - RED_SOFT/YELLOW：引导家人帮忙看看
     * - GREEN：简洁确认，不说"放心付款"
     */
    private fun setupButtons(v: Verdict) {
        // 根据风险等级设置主按钮文案
        when (v.level) {
            RiskLevel.RED_HARD -> {
                binding.btnNotifyFamily.text = "\uD83D\uDCE2 通知家人帮我核实"
            }
            RiskLevel.RED_SOFT -> {
                binding.btnNotifyFamily.text = "\uD83D\uDCE2 让家人帮我看看"
            }
            RiskLevel.YELLOW -> {
                binding.btnNotifyFamily.text = "⚡ 让家人帮我看看"
            }
            RiskLevel.GREEN -> {
                binding.btnNotifyFamily.text = "知道了"
            }
        }

        // 通知家人（最醒目）
        binding.btnNotifyFamily.setOnClickListener {
            if (v.level == RiskLevel.GREEN) {
                // 绿色场景直接关闭
                finish()
            } else {
                notifyFamily()
            }
        }

        // 查看证据（展开锚点列表区域）
        binding.btnViewEvidence.setOnClickListener {
            if (binding.layoutAnchorList.visibility == View.VISIBLE) {
                binding.layoutAnchorList.visibility = View.GONE
                binding.btnViewEvidence.text = "查看证据详情"
            } else {
                binding.layoutAnchorList.visibility = View.VISIBLE
                binding.btnViewEvidence.text = "收起证据"
            }
        }

        // 返回付款页
        binding.btnBackToPay.setOnClickListener {
            showExitConfirmDialog()
        }

        // 绿色场景：使用"本次核验未发现异常"等非保证性文案
        if (v.level == RiskLevel.GREEN) {
            binding.tvSuggestion.text = "本次核验未发现异常"
        }
    }

    /**
     * 设置六锚点证据列表
     */
    private fun setupAnchorList(anchors: List<AnchorResult>) {
        binding.layoutAnchorList.removeAllViews()

        for (anchor in anchors) {
            val itemBinding = ItemAnchorEvidenceBinding.inflate(
                LayoutInflater.from(this), binding.layoutAnchorList, false
            )

            // 锚点标题
            itemBinding.tvAnchorTitle.text = anchor.name

            // 通过/未通过/无法核实 状态
            when (anchor.pass) {
                true -> {
                    itemBinding.tvAnchorStatus.text = "✓ 核验通过"
                    itemBinding.tvAnchorStatus.setTextColor(getColor(R.color.risk_low))
                }
                false -> {
                    itemBinding.tvAnchorStatus.text = "✗ 存在疑点"
                    itemBinding.tvAnchorStatus.setTextColor(getColor(R.color.risk_high))
                }
                null -> {
                    itemBinding.tvAnchorStatus.text = "○ 暂无法核实"
                    itemBinding.tvAnchorStatus.setTextColor(getColor(R.color.text_hint))
                }
            }

            // 证据详情（默认收起，点击展开）
            itemBinding.tvAnchorDetail.text = anchor.evidence
            itemBinding.tvAnchorDetail.visibility = View.GONE

            // 官方链接
            if (anchor.sourceUrl.isNotEmpty()) {
                itemBinding.tvOfficialLink.visibility = View.VISIBLE
                itemBinding.tvOfficialLink.setOnClickListener {
                    openUrl(anchor.sourceUrl)
                }
            } else {
                itemBinding.tvOfficialLink.visibility = View.GONE
            }

            // 点击展开/收起详情
            itemBinding.root.setOnClickListener {
                if (itemBinding.tvAnchorDetail.visibility == View.VISIBLE) {
                    itemBinding.tvAnchorDetail.visibility = View.GONE
                    itemBinding.ivExpand.rotation = 0f
                } else {
                    itemBinding.tvAnchorDetail.visibility = View.VISIBLE
                    itemBinding.ivExpand.rotation = 180f
                }
            }

            binding.layoutAnchorList.addView(itemBinding.root)
        }
    }

    /**
     * 通知家人
     */
    private fun notifyFamily() {
        // TODO: 调用家人通知逻辑
        AlertDialog.Builder(this)
            .setTitle("已通知家人")
            .setMessage("家人将很快收到提醒，请保持电话畅通")
            .setPositiveButton("好的") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    /**
     * 触发震动提醒
     */
    private fun triggerVibration() {
        if (!prefManager.isVibrateEnabled()) return

        val vibrator = ContextCompat.getSystemService(this, Vibrator::class.java)
        vibrator?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // 震动模式：强震动 + 间隔 + 强震动
                val pattern = longArrayOf(0, 500, 200, 500, 200, 500)
                it.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                it.vibrate(longArrayOf(0, 500, 200, 500, 200, 500), -1)
            }
        }
    }

    /**
     * 桌面宠物入场动画（可选，不延迟主提醒显示）
     */
    private fun startPetAnimation() {
        if (!prefManager.isPetEnabled()) {
            binding.ivPet.visibility = View.GONE
            return
        }

        // 简单的入场动画：从底部滑入
        binding.ivPet.post {
            binding.ivPet.translationY = binding.ivPet.height.toFloat()
            binding.ivPet.animate()
                .translationY(0f)
                .setDuration(500)
                .setStartDelay(300)
                .start()
        }
    }

    /**
     * 退出确认对话框
     */
    private fun showExitConfirmDialog() {
        AlertDialog.Builder(this)
            .setTitle("确认关闭提醒？")
            .setMessage("关闭后将不再显示此风险提醒\n建议您先查看证据详情")
            .setPositiveButton("确认关闭") { _, _ ->
                finish()
            }
            .setNegativeButton("继续查看") { dialog, _ ->
                dialog.dismiss()
            }
            .show()
    }

    /**
     * 打开链接
     */
    private fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            startActivity(intent)
        } catch (e: Exception) {
            // 忽略错误
        }
    }

    /**
     * 创建测试数据
     */
    private fun createMockVerdict(): Verdict {
        val now = System.currentTimeMillis()
        return Verdict(
            eventId = "test_${now}",
            level = RiskLevel.RED_HARD,
            score = 35,
            merchantName = "某优品折扣店",
            amount = 299.0,
            claimedBrand = "某优品",
            transparency = 35,
            familyNotify = true,
            advicePhrase = "\"某优品折扣店\"的多项官方信息查不到或对不上，建议您先别付款，和家人商量一下。",
            queryTime = now,
            anchors = listOf(
                AnchorResult(
                    name = "品牌身份核验",
                    expected = "某优品股份有限公司",
                    actual = "某优品折扣店",
                    pass = false,
                    sourceUrl = "https://www.example.com/verify",
                    evidence = "未查询到该品牌的官方注册信息，商家名称与知名品牌存在一字之差",
                    queryTime = now
                ),
                AnchorResult(
                    name = "价格透明度",
                    expected = "市场价约 199 元",
                    actual = "299 元",
                    pass = false,
                    sourceUrl = "",
                    evidence = "同款商品市场价约为 199 元，该商家价格偏高 50%，且无合理说明",
                    queryTime = now
                ),
                AnchorResult(
                    name = "评价真实性",
                    expected = null,
                    actual = "好评集中在最近 3 天",
                    pass = false,
                    sourceUrl = "",
                    evidence = "好评集中在最近 3 天，评价内容相似度高，疑似刷评",
                    queryTime = now
                ),
                AnchorResult(
                    name = "投诉追踪",
                    expected = null,
                    actual = "近 30 天 12 条投诉",
                    pass = false,
                    sourceUrl = "https://www.example.com/complaints",
                    evidence = "近 30 天内有 12 条投诉记录，主要涉及退款难、货不对版",
                    queryTime = now
                ),
                AnchorResult(
                    name = "资质合规性",
                    expected = null,
                    actual = "未展示营业执照",
                    pass = false,
                    sourceUrl = "",
                    evidence = "未展示营业执照和经营资质，店铺注册信息不完整",
                    queryTime = now
                ),
                AnchorResult(
                    name = "支付安全性",
                    expected = "企业账户收款",
                    actual = "个人账户收款",
                    pass = false,
                    sourceUrl = "",
                    evidence = "收款方为个人账户，非企业账户，无第三方支付平台担保",
                    queryTime = now
                )
            )
        )
    }
}
