package com.companyxray.guardian.ui.history

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.appcompat.app.AppCompatActivity
import com.companyxray.guardian.R
import com.companyxray.guardian.data.AlertRecord
import com.companyxray.guardian.data.AlertStatus
import com.companyxray.guardian.data.RiskLevel
import com.companyxray.guardian.databinding.ActivityAlertHistoryBinding
import com.companyxray.guardian.databinding.ItemAlertHistoryBinding
import com.companyxray.guardian.ui.alert.RiskAlertActivity
import com.companyxray.guardian.util.PreferenceManager
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * 告警历史页面
 *
 * - 列表显示历史告警
 * - 每条显示：商家名称、金额、风险等级、时间、状态
 * - 点击进入详情页（复用锚点证据展示）
 * - 支持按时间筛选
 * - 空状态提示
 */
class AlertHistoryActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAlertHistoryBinding
    private lateinit var prefManager: PreferenceManager
    private var currentFilter = FilterType.ALL

    enum class FilterType {
        ALL,        // 全部
        TODAY,      // 今天
        YESTERDAY,  // 昨天
        WEEK,       // 近7天
        HIGH_RISK   // 仅高危
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefManager = PreferenceManager.getInstance(this)
        binding = ActivityAlertHistoryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupToolbar()
        setupFilter()
        refreshList()
    }

    override fun onResume() {
        super.onResume()
        refreshList()
    }

    private fun setupToolbar() {
        binding.toolbar.title = getString(R.string.history_title)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener {
            finish()
        }
    }

    private fun setupFilter() {
        val filterOptions = arrayOf("全部", "今天", "昨天", "近7天", "仅高危")
        val adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            filterOptions
        )
        binding.spinnerFilter.adapter = adapter
        binding.spinnerFilter.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {
                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {
                    currentFilter = when (position) {
                        0 -> FilterType.ALL
                        1 -> FilterType.TODAY
                        2 -> FilterType.YESTERDAY
                        3 -> FilterType.WEEK
                        4 -> FilterType.HIGH_RISK
                        else -> FilterType.ALL
                    }
                    refreshList()
                }

                override fun onNothingSelected(parent: AdapterView<*>?) {}
            }
    }

    /**
     * 刷新列表
     */
    private fun refreshList() {
        val allRecords = prefManager.getAlertRecords()
        val filteredRecords = mutableListOf<AlertRecord>()

        val now = System.currentTimeMillis()

        for (record in allRecords) {
            val include = when (currentFilter) {
                FilterType.ALL -> true
                FilterType.TODAY -> isSameDay(record.ts, now)
                FilterType.YESTERDAY -> isYesterday(record.ts, now)
                FilterType.WEEK -> now - record.ts <= 7 * 24 * 60 * 60 * 1000L
                FilterType.HIGH_RISK -> record.level == RiskLevel.RED_HARD
            }
            if (include) {
                filteredRecords.add(record)
            }
        }

        // 按时间倒序
        filteredRecords.sortByDescending { it.ts }

        binding.layoutAlertList.removeAllViews()

        if (filteredRecords.isEmpty()) {
            binding.tvEmptyHint.visibility = View.VISIBLE
            binding.layoutAlertList.visibility = View.GONE
            return
        }

        binding.tvEmptyHint.visibility = View.GONE
        binding.layoutAlertList.visibility = View.VISIBLE

        var lastDateStr = ""
        val dateFormat = SimpleDateFormat("yyyy年MM月dd日", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

        for (record in filteredRecords) {
            val dateStr = dateFormat.format(Date(record.ts))
            val timeStr = timeFormat.format(Date(record.ts))

            // 添加日期分组标题
            if (dateStr != lastDateStr) {
                lastDateStr = dateStr
                val dateHeader = layoutInflater.inflate(
                    R.layout.item_history_date_header,
                    binding.layoutAlertList,
                    false
                )
                val tvDate = dateHeader.findViewById<android.widget.TextView>(R.id.tvDate)
                tvDate.text = getRelativeDateStr(record.ts)
                binding.layoutAlertList.addView(dateHeader)
            }

            // 添加告警条目
            val itemBinding = ItemAlertHistoryBinding.inflate(
                LayoutInflater.from(this), binding.layoutAlertList, false
            )

            // 商家名称
            itemBinding.tvMerchantName.text = record.merchantName

            // 金额
            val amountText = record.amount?.let { "¥%.2f".format(it) } ?: "—"
            itemBinding.tvAmount.text = amountText

            // 时间
            itemBinding.tvTime.text = timeStr

            // 风险等级
            when (record.level) {
                RiskLevel.RED_HARD -> {
                    itemBinding.tvRiskLevel.text = "高危"
                    itemBinding.tvRiskLevel.setTextColor(getColor(R.color.risk_high))
                    itemBinding.tvRiskLevel.setBackgroundResource(R.drawable.bg_alert_red)
                }
                RiskLevel.RED_SOFT -> {
                    itemBinding.tvRiskLevel.text = "可疑"
                    itemBinding.tvRiskLevel.setTextColor(getColor(R.color.risk_medium))
                    itemBinding.tvRiskLevel.setBackgroundResource(R.drawable.bg_alert_yellow)
                }
                RiskLevel.YELLOW -> {
                    itemBinding.tvRiskLevel.text = "关注"
                    itemBinding.tvRiskLevel.setTextColor(getColor(R.color.risk_medium))
                    itemBinding.tvRiskLevel.setBackgroundResource(R.drawable.bg_alert_yellow)
                }
                RiskLevel.GREEN -> {
                    itemBinding.tvRiskLevel.text = "正常"
                    itemBinding.tvRiskLevel.setTextColor(getColor(R.color.risk_low))
                    itemBinding.tvRiskLevel.setBackgroundResource(R.drawable.bg_alert_green)
                }
            }

            // 状态
            itemBinding.tvStatus.text = record.status.displayName

            // 点击进入详情
            itemBinding.root.setOnClickListener {
                openAlertDetail(record)
            }

            binding.layoutAlertList.addView(itemBinding.root)
        }
    }

    /**
     * 打开告警详情
     */
    private fun openAlertDetail(record: AlertRecord) {
        // 将 AlertRecord 转换为 Verdict 传递给详情页
        // TODO: 从 anchorsJson 反序列化锚点列表
        val intent = Intent(this, RiskAlertActivity::class.java)
        // 传递 recordId 或直接构造 Verdict 对象
        intent.putExtra("record_id", record.id)
        startActivity(intent)
    }

    /**
     * 判断是否同一天
     */
    private fun isSameDay(time1: Long, time2: Long): Boolean {
        val cal1 = Calendar.getInstance()
        cal1.timeInMillis = time1
        val cal2 = Calendar.getInstance()
        cal2.timeInMillis = time2
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
            cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
    }

    /**
     * 判断是否昨天
     */
    private fun isYesterday(time: Long, now: Long): Boolean {
        val cal = Calendar.getInstance()
        cal.timeInMillis = now
        cal.add(Calendar.DAY_OF_YEAR, -1)
        return isSameDay(time, cal.timeInMillis)
    }

    /**
     * 获取相对日期字符串
     */
    private fun getRelativeDateStr(timestamp: Long): String {
        val now = System.currentTimeMillis()
        return when {
            isSameDay(timestamp, now) -> getString(R.string.history_today)
            isYesterday(timestamp, now) -> getString(R.string.history_yesterday)
            else -> {
                val sdf = SimpleDateFormat("MM月dd日 EEEE", Locale.CHINA)
                sdf.format(Date(timestamp))
            }
        }
    }
}
