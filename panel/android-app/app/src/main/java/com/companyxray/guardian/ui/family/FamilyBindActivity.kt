package com.companyxray.guardian.ui.family

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.companyxray.guardian.R
import com.companyxray.guardian.data.FamilyMember
import com.companyxray.guardian.databinding.ActivityFamilyBindBinding
import com.companyxray.guardian.databinding.DialogAddFamilyBinding
import com.companyxray.guardian.databinding.ItemFamilyMemberBinding
import com.companyxray.guardian.util.PreferenceManager
import java.util.UUID

/**
 * 家人绑定管理页面
 *
 * - 添加家人（输入姓名、手机号、关系）
 * - 生成绑定二维码/邀请码
 * - 家人列表（显示守护人/被守护人）
 * - 解绑操作（带确认）
 * - 发送测试告警
 */
class FamilyBindActivity : AppCompatActivity() {

    private lateinit var binding: ActivityFamilyBindBinding
    private lateinit var prefManager: PreferenceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefManager = PreferenceManager.getInstance(this)
        binding = ActivityFamilyBindBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupClicks()
        refreshFamilyList()
    }

    override fun onResume() {
        super.onResume()
        refreshFamilyList()
    }

    private fun setupToolbar() {
        binding.toolbar.title = getString(R.string.family_title)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupClicks() {
        // 添加家人
        binding.btnAddFamily.setOnClickListener {
            showAddFamilyDialog()
        }

        // 生成邀请码（让家人添加我）
        binding.btnGenerateInvite.setOnClickListener {
            showInviteCodeDialog()
        }
    }

    /**
     * 刷新家人列表显示
     */
    private fun refreshFamilyList() {
        val familyList = prefManager.getFamilyMembers()

        binding.layoutFamilyList.removeAllViews()

        if (familyList.isEmpty()) {
            binding.tvEmptyHint.visibility = View.VISIBLE
            binding.layoutFamilyList.visibility = View.GONE
            return
        }

        binding.tvEmptyHint.visibility = View.GONE
        binding.layoutFamilyList.visibility = View.VISIBLE

        for (member in familyList) {
            val itemBinding = ItemFamilyMemberBinding.inflate(
                LayoutInflater.from(this), binding.layoutFamilyList, false
            )

            itemBinding.tvName.text = member.name
            itemBinding.tvRelationship.text = member.relation
            itemBinding.tvPhone.text = member.phone

            // 角色标签
            if (member.isGuardian) {
                itemBinding.tvRole.text = "我守护的人"
                itemBinding.tvRole.setBackgroundResource(R.drawable.bg_alert_green)
            } else {
                itemBinding.tvRole.text = "守护我的人"
                itemBinding.tvRole.setBackgroundResource(R.drawable.bg_alert_yellow)
            }

            // 发送测试告警
            itemBinding.btnTestAlert.setOnClickListener {
                sendTestAlert(member)
            }

            // 呼叫
            itemBinding.btnCall.setOnClickListener {
                callFamily(member)
            }

            // 解绑
            itemBinding.btnUnbind.setOnClickListener {
                showUnbindConfirmDialog(member)
            }

            binding.layoutFamilyList.addView(itemBinding.root)
        }
    }

    /**
     * 显示添加家人对话框
     */
    private fun showAddFamilyDialog() {
        val dialogBinding = DialogAddFamilyBinding.inflate(layoutInflater)
        val dialog = AlertDialog.Builder(this)
            .setView(dialogBinding.root)
            .setCancelable(true)
            .create()

        dialogBinding.btnConfirm.setOnClickListener {
            val name = dialogBinding.etName.text.toString().trim()
            val phone = dialogBinding.etPhone.text.toString().trim()
            val relationship = dialogBinding.etRelationship.text.toString().trim()

            if (name.isEmpty()) {
                Toast.makeText(this, "请输入家人姓名", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (phone.isEmpty()) {
                Toast.makeText(this, "请输入手机号", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // 添加家人（默认我守护对方 isGuardian = true）
            val member = FamilyMember(
                id = UUID.randomUUID().toString(),
                name = name,
                phone = phone,
                deviceId = null,
                relation = relationship.ifEmpty { "家人" },
                isGuardian = true
            )
            prefManager.addFamilyMember(member)
            refreshFamilyList()
            dialog.dismiss()

            Toast.makeText(this, "已添加 $name", Toast.LENGTH_SHORT).show()
        }

        dialogBinding.btnCancel.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    /**
     * 显示邀请码对话框
     */
    private fun showInviteCodeDialog() {
        val inviteCode = generateInviteCode()

        AlertDialog.Builder(this)
            .setTitle("我的邀请码")
            .setMessage("让家人在 App 中输入此邀请码\n即可绑定并守护您\n\n邀请码：$inviteCode")
            .setPositiveButton("分享给家人") { _, _ ->
                shareInviteCode(inviteCode)
            }
            .setNegativeButton("关闭", null)
            .show()
    }

    /**
     * 生成邀请码（6位数字）
     */
    private fun generateInviteCode(): String {
        val chars = "0123456789"
        return (1..6).map { chars.random() }.joinToString("")
    }

    /**
     * 分享邀请码
     */
    private fun shareInviteCode(code: String) {
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            type = "text/plain"
            putExtra(
                Intent.EXTRA_TEXT,
                "我正在使用「X光守护」保护付款安全，快来加入守护我吧！\n邀请码：$code"
            )
        }
        startActivity(Intent.createChooser(sendIntent, "分享邀请码"))
    }

    /**
     * 发送测试告警
     */
    private fun sendTestAlert(member: FamilyMember) {
        AlertDialog.Builder(this)
            .setTitle("发送测试告警")
            .setMessage("确定向 ${member.name} 发送测试告警吗？\n对方会收到一条测试提醒")
            .setPositiveButton("发送") { _, _ ->
                // TODO: 调用发送测试告警接口
                Toast.makeText(
                    this,
                    "已向 ${member.name} 发送测试告警",
                    Toast.LENGTH_SHORT
                ).show()
            }
            .setNegativeButton("取消", null)
            .show()
    }

    /**
     * 拨打电话
     */
    private fun callFamily(member: FamilyMember) {
        val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${member.phone}"))
        startActivity(intent)
    }

    /**
     * 解绑确认
     */
    private fun showUnbindConfirmDialog(member: FamilyMember) {
        AlertDialog.Builder(this)
            .setTitle("确认解绑")
            .setMessage("确定要解除与 ${member.name} 的绑定吗？\n解绑后将不再互相接收告警通知")
            .setPositiveButton("确认解绑") { _, _ ->
                prefManager.removeFamilyMember(member.id)
                refreshFamilyList()
                Toast.makeText(this, "已解绑", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("取消", null)
            .show()
    }
}
