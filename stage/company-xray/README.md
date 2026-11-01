# 公司人员透视 · X光

输入任意公司名称（不限行业），聚合展示其**法定代表人、董事长、实际控制人、大股东构成、董监高核心团队**——含职务、任期、持股比例、高管简历。

## 运行

```bash
C:/Users/WQJY/.workbuddy/binaries/node/versions/22.22.2-3/node.exe server.js
# 浏览器打开 http://localhost:3211
```

零 npm 依赖，无需 install。

## 数据源（三级，全部带超时与失败降级）

| 级别 | 来源 | 说明 |
|---|---|---|
| 1 | 企查查 MCP | `get_company_registration_info` / `get_shareholder_info` / `get_key_personnel` / `get_actual_controller`，T+0 工商数据 |
| 1 | 水滴信用 MCP | `get_company_info` / `get_company_partner` / `get_company_employee` |
| 1 | 天眼查 MCP | `get_company_registration_info`（免费档）；主要人员/股东维度需 VIP，受限时如实标注 |
| 2 | 东方财富 F10 | 免登录兜底（A 股）：十大股东、实际控制人、董监高名单（含简历），覆盖最稳 |
| 3 | 必应公开索引 | 法定代表人兜底核验（site:aiqicha / qcc / tianyancha） |

三源**并发查询 + 合并去重**：人员按姓名归并（职务拼接、来源逐源标注），股东取颗粒度最细的源，登记信息按 企查查 > 天眼查 > 水滴信用 优先级。

## MCP Token 配置（可选，不配也能用）

项目根目录建 `mcp.local.json`：

```json
{
  "qcc":    { "token": "企查查MCP的BearerToken" },
  "shuidi": { "token": "水滴信用MCP的BearerToken" },
  "tyc":    { "token": "天眼查MCP的BearerToken" }
}
```

或设环境变量 `QCC_MCP_TOKEN` / `SHUIDI_MCP_TOKEN` / `TYC_MCP_TOKEN`。页面顶部的源状态灯会实时显示哪个源已启用。

## 数据纪律

- 持股比例均为「一层直接持股」口径，按数据源原样展示，不做穿透推算
- 实际控制人仅引用专门接口返回值，不自行推断
- 单渠道失败不影响整体；渠道状态卡如实标注每个来源的成败与 VIP 受限情况
- 免责声明：信息可能滞后，以国家企业信用信息公示系统为准

## 结构

```
company-xray/
├── server.js          # HTTP 服务（端口 3211，零依赖）
├── lib/
│   ├── mcp.js         # 零依赖 MCP streamable-http 客户端（三源通用）
│   ├── normalize.js   # 三源返回结构归一化（JSON + Markdown 表格双解析）
│   ├── aggregator.js  # 三源编排 + 合并去重
│   ├── fallback.js    # 东财F10 / 必应 免登录兜底
│   └── profile.js     # 总编排
└── public/
    ├── index.html     # 单页界面
    └── app.js         # 渲染逻辑
```
