# 📋 AI 交接报告 — invest-score-app（公司投资评分 · X光透视）

> ## ⚠️ 文件性质声明（请先读这里）
>
> **本文件是「交接报告」，不是需求文档、不是规范文档、不是设计稿、也不是程序源码。**
>
> 用途：向后续接手的 AI / 开发者说明这个程序**是什么、怎么跑、被改过什么、为什么这么改、还有哪些坑**，使其能在 10 分钟内上手，避免重复踩坑与重复提问。
>
> | 项目 | 内容 |
> |---|---|
> | 文档类型 | **交接报告 / Handover Document** |
> | 适用对象 | 接手本模块的 AI 助手或开发者 |
> | 作用域 | 仅 `front/stage/invest-score/`（P2 模块） |
> | 是否影响程序运行 | **否**（纯说明文档，删除也不影响程序） |
> | 是否可安全忽略 | 是（但**强烈建议先读**，能省大量摸索时间） |
> | 与代码冲突时 | **以代码为准**，并顺手更新本文件 |
>
> 最后更新：2026-10-03 13:36（北京时间）
> 撰写者：负责 P2 / invest-score 模块的 AI 助手

---

## 0. 一句话概括

一个 Node.js 零依赖的**公司投资评分服务**：输入公司名 → 联网聚合财报 / 行情 / 工商 / 新闻 / 精英人物 → 十维加权打分 → 输出「是否适合投资」结论 + 可视化页面。

---

## 1. 运行环境与启动方式

| 项 | 值 |
|---|---|
| 工作目录 | `D:/工作区1：黑客松/invest-score-app/` |
| 仓库副本（需同步） | `D:/工作区1：黑客松/financial-fraud-prevention/front/stage/invest-score/` |
| 运行时 | Node.js 22（**必须用这个绝对路径**）`C:/Users/WQJY/.workbuddy/binaries/node/versions/22.22.2-3/node.exe` |
| 端口 | `3210` |
| 启动 | `cd "D:/工作区1：黑客松/invest-score-app" && <上面那个node路径> server.js` |
| 依赖 | **无 npm 依赖**（纯 Node 内置模块 + 一个外部 SDK，见 §6） |
| 入口 | `server.js` → `lib/analyze.js` 的 `analyze()` |

**重启服务**（改完代码后必须重启，Node 不会热加载）：
```bash
taskkill //F //IM node.exe 2>/dev/null; sleep 1
cd "D:/工作区1：黑客松/invest-score-app" && C:/Users/WQJY/.workbuddy/binaries/node/versions/22.22.2-3/node.exe server.js
```

**自测命令**（改完必跑）：
```bash
cd "D:/工作区1：黑客松/invest-score-app" && curl -s -X POST http://localhost:3210/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"company":"贵州茅台酒股份有限公司","type":"listed"}' -o r.json -w "%{time_total}s\n"
```

---

## 2. HTTP 接口

| 方法 | 路径 | 请求体 | 说明 |
|---|---|---|---|
| POST | `/api/analyze` | `{company, legalPerson?, type}` | 主评分接口。`type`: `"listed"`(默认) / `"unlisted"` |
| POST | `/api/personnel` | `{company, legalPerson?}` | 人员透视（**前端入口已移除，后端能力保留**） |
| GET | `/` 或 `/index.html` | — | 评分页面 |
| GET | `/app.js` | — | 前端脚本 |

响应统一为 `{ok: true, result: {...}}` 或 `{ok: false, error: "..."}`。

---

## 3. 核心模块地图

```
server.js                 HTTP 服务 + 路由（无框架，原生 http）
lib/
├── analyze.js            ★ 主编排：串联全流程 9 个步骤
├── scoring.js            ★ 十维加权打分 + 投资线判定
├── sources.js            ★ 数据源聚合层（东财/腾讯行情/必应/百度/搜狗）+ 缓存层
├── registry.js           ★ 工商与股权数据三级聚合（MCP → 东财F10 → AI记忆库）
├── elite-search.js       ★ 精英人物搜索判定（双标记法）
├── person-search.js      人物专属检索（百度优先 + 必应兜底 + 缓存）
├── agent-db.js           Agent 内置库兜底（66人静态库 + 大模型批量）
├── ai-memory.js          WorkBuddy 云服务大模型补档（公司工商信息）
├── known-people.js       66 位知名企业家静态知识库
├── stockAssess.js        股票投资评估（估值PE/PB + 52周位置 + 现金流）
├── topics.js             话题热度兜底（数据覆盖不足时按口碑判定）
├── seed.js               演示库兜底（离线可演示）
├── elite.js              【旧版精英判定】已被 elite-search 替代，保留未删
└── personnel.js          人员透视（对应 /api/personnel，保留）
public/index.html         单文件前端（内联 CSS+JS，无构建）
```

---

## 4. 主流程（`analyze.js`）

```
1) 行情搜索确认代码        searchStockCode(公司名)
2) 财务 + 现价（并发）      A股→东财F10三表；港美股→东财datacenter F10 + 腾讯行情
2.5) 股票投资评估          assessStock()（仅上市公司）
3)+4) 工商/股权 与 新闻检索 —— 【并发】
     · 工商：registry.fetchRegistry({skipAiMemory:true})  三级源
     · 新闻：3-4 条查询并发 searchNews
3.5) AI 记忆库补档（异步）  registry.aiMemoryFill()  ← 仅当同步渠道全空时触发
5) 演示库兜底               findSeed()
6) 十维合成                 财务实数 → 新闻修正 → 演示库 → 缺省 50
7) 精英人物搜索判定          searchElitePeople()
8) 打分                     scoreCompany()
9) 话题热度兜底              仅当 coverage < 50% 且未达投资线时触发
```

---

## 5. 关键业务口径（**改动前务必先确认，这是用户钉死的规则**）

### 5.1 投资线：**≥ 60 分**为「目前适合投资」
- 位置：`lib/scoring.js` 的 `verdictOf()`
- 历史沿革：`>50` → `≥58`（10-02） → **`≥60`（10-03，当前）**
- 前端文案在 `public/index.html` 的 `verdictText()` 两处，**必须与后端同步**

### 5.2 精英人物判定（双标记法）
一人被判定为「精英」必须**同时**满足：
1. **大厂履历**：报道/简历中出现知名大企业任职经历（`BIG_COMPANIES` 正则），或现任企业本身是大企业
2. **专业提及**：有专利/技术/研发/专访/获奖/工程师/博士/教授等专业领域公开提及，或人物专属检索 ≥3 条独立资料

**候选人池**：法定代表人 / 董事长 / 大股东（自然人）/ 核心成员 / 实际控制人

**判定优先级（重要）**：
1. `aiDossiers` 命中（AI 补档已给职务）→ 直接判定，**不联网、不调大模型**（10-03 新增，提速关键）
2. `KNOWN_PEOPLE_DB` 静态库命中 → 直接判定，**不联网**
3. 有 F10 简历（≥60字）→ 用简历判定，**不联网**
4. 其余 → 联网检索（百度优先→必应）→ 线上查无则回退大模型批量

**加分规则**：每检出 1 名精英 **总分 +1，不封顶**（总分上限 99）

### 5.3 数据来源限制（用户硬要求）
精英判定的资料**必须**来自：互联网搜索（百度/必应）或线上工商渠道（企查查/天眼查/爱企查/水滴信用/东财F10）。
线上完全查无时才能回退 Agent 内置库，且必须在 UI 与 notes 中**显著标注"非实时、可能过时"**。

### 5.4 打分权重（十维，上市/未上市两套）
```
listed:   finance18 product15 industry10 tech10 cost10 customers10 team8 brand4 litigation6 management5
unlisted: product18 industry15 tech12 team12 customers12 finance12 cost6 brand3 litigation5 management5
```
- 上市公司：十维折算 **80%** + 股票评估 **20%**
- 未上市公司：纯十维

### 5.5 措辞红线（**合规要求，不得违反**）
- **禁止**出现「诈骗」「骗子」等定性词
- 合规说法：「查无备案记录」「主体不一致」「成立不足一年」
- **禁止**荐股观感与「投资评分」字样
- 所有页面必须带免责声明（`index.html` 底部 `.disclaim`）

---

## 6. 外部依赖详解

### 6.1 WorkBuddy 云服务大模型（免密钥）
- 配置在两个文件（**内容相同，改要一起改**）：`lib/ai-memory.js`、`lib/agent-db.js` 的 `PUBLIC_CONFIG`
```js
endpoint: 'https://company-xray.app.workbuddy.host'
publishableKey: 'wbpk_ryQxdYP2vNDBK5vLQU5j11_WHwRzkovvRb7YXDNHX6p1WEGR2ddgNwn'
model: 'glm-5.3-flash'（优先，自动降级到任一启用模型）
```
- SDK 路径（**硬编码绝对路径**）：`C:/Users/WQJY/.workbuddy/binaries/node/workspace/node_modules/@tencent-ai/workbuddy-cloud-sdk`
- 仅支持 `stream: true`

### 6.2 公开数据接口（零鉴权）
| 用途 | 接口 |
|---|---|
| A股代码搜索 | `searchapi.eastmoney.com/api/suggest/get` |
| A股三表 | `emweb.securities.eastmoney.com/PC_HSF10/NewFinanceAnalysis/*` |
| A股股东/高管 | `emweb.securities.eastmoney.com/PC_HSF10/ShareholderResearch\|CompanyManagement` |
| 港美股财报 | `datacenter.eastmoney.com/securities/api/data/v1/get`（`RPT_HKF10_FN_*` / `RPT_USF10_FN_*`） |
| 行情 | `qt.gtimg.cn/q=`（GBK 编码，hk/us 前缀） |
| 新闻 | 必应 / 百度 / 搜狗 网页搜索 |

### 6.3 MCP Connector（可选，未配置则自动降级）
- 配置文件：`mcp.local.json`（**当前不存在**）或环境变量 `QCC_MCP_TOKEN` / `SHUIDI_MCP_TOKEN`
- 企查查：`get_company_registration_info` / `get_shareholder_info` / `get_key_personnel` / `get_actual_controller`
- 水滴信用：`get_company_info` / `get_company_partner` / `get_company_employee`

---

## 7. 【重要】我这次做了哪些改动（2026-10-03 13:04–13:36）

### 7.1 阈值调整
- **投资线 58 → 60**（`lib/scoring.js`）
- 前端 `verdictText()` 两处「50 分投资线」→「60 分」（修历史遗留的不一致）
  - ⚠️ **补记（P4，13:56）**：上面这句实际只改了**生效的** `public/index.html`；**根目录 `index.html`（死副本，`server.js` 不引用）当时仍写着「50 分投资线」**，已由 P4 在整合后体检中一并改为 60，消除口径分裂。详见 `pitch/整合后体检报告.md`。
- 前端精英加分显示去掉 `Math.min(计数, 5)` 截断，与后端"不封顶"对齐

### 7.2 修复的 3 个真 Bug

**Bug 1（严重，影响速度）：大模型超时保护从未生效**
- 文件：`lib/ai-memory.js`、`lib/agent-db.js` 的 `chatOnce()`
- 现象：创建了 `AbortController` 但**从未把 `signal` 传给 `cloud.llm.chat.completions.create()`**，导致 `setTimeout` 里的 `abort()` 毫无作用，大模型慢时会**无限挂起**
- 修复：补 `signal: ctl.signal` + `if (timedOut) break` 双保险 + 仅在无内容时才抛 `TIMEOUT`
- 验证：6s 超时实测 6.5s 就断流（修复前不限时）

**Bug 2（影响正确性）：精英漏判**
- 文件：`lib/elite-search.js`
- 现象：`notes.push()` 调用早于 `const notes = []` 声明（TDZ 暂时性死区）→ 抛 `ReferenceError`，被外层 `try/catch` 静默吞掉 → **公开名单兜底识别到人物后失效**
- 修复：把 `const notes = []` 声明提前到候选池构建之前

**Bug 3（显示不一致）：加分截断**
- 文件：`public/index.html`
- 现象：后端已取消加分封顶，前端仍 `Math.min(eliteCount, 5)`
- 修复：改为直接显示 `eliteCount`

### 7.3 提速改造（**原则：不削减任何数据源与判定逻辑**）

| 手段 | 文件 | 说明 |
|---|---|---|
| **进程内 TTL 缓存层** | `sources.js` | 新增 `cached(key, ttl, fn)` + in-flight Promise 合并（同 key 并发共享同一请求） |
| 缓存挂载点 | `sources.js` | 行情 30s、A股财报 30min、港美股财报 30min、代码映射 10min、新闻检索 5min |
| 代码搜索并发化 | `sources.js` | `searchStockCode` 由逐个 await 串行 → 每批 4 个并发，首批命中即返回 |
| 港美股财报去睡眠 | `sources.js` | 删除固定 `4s 睡眠 + 6s 退避`，改 BALANCE/INCOME 并发发起 |
| 人物检索缓存 + 并发 | `person-search.js` | 加 5min 缓存；百度两 query 串行 → 并发取首个非空 |
| **共享百度风控冷却** | `sources.js` + `person-search.js` | 新增 `isBaiduCoolingDown()` 导出；风控期内逐人检索零等待（原先每人白等 7s） |
| **工商 与 新闻 并发** | `analyze.js` | 原本串行相加，改 `Promise.all` |
| AI 补档解耦 | `registry.js` | 抽出 `aiMemoryFill(out, company)`；`fetchRegistry` 支持 `skipAiMemory` 让主链路先出同步结果 |
| **AI 档案复用（最关键）** | `analyze.js` + `elite-search.js` | AI 补档产出的 `{人名 → 职务}` 做成 `aiDossiers` 传给精英搜索，命中者免联网、免第二次大模型调用 |
| 静态库跳过联网 | `elite-search.js` | `KNOWN_PEOPLE_DB` 命中的知名人物不再联网检索 |
| 超时收窄 | `ai-memory.js` / `agent-db.js` | AI 补档 fast 60s→40s；人物批量 90s→60s |

### 7.4 实测效果（同机、同网络条件）

| 场景 | 优化前 | 优化后 | 倍数 |
|---|---|---|---|
| 贵州茅台 / 宁德时代（重复查询） | 1.0s | **0.7–1.2s** | — |
| 腾讯控股（港股首查） | 153s | **33s** | 4.6× |
| 蔚来汽车（未上市首查） | 132s | **30s** | 4.4× |
| 蜜雪冰城（未上市） | 92s | **36s** | 2.6× |

**精英判定结果前后完全一致**（腾讯 12 人 / 茅台 6 人 / 蔚来 5 人），提速没有丢结果。

### 7.5 未完成事项（**留给你的交接点**）
- **未 `git commit`、未 `git push`**（用户明确指示"先不要push"，需等其验证）
- 改动**已同步**到仓库副本 `front/stage/invest-score/`（lib / public / server.js 均校验一致）
- 剩余瓶颈：AI 大模型生成本身 20–50s（港股/未上市公司无公开工商接口，必须靠 AI 补档），已并行化但仍是大头
- `lib/elite.js`（旧版精英判定）已被 `elite-search.js` 替代，**保留未删**，注意别误引用

---

## 8. 已知的坑与踩坑记录（**强烈建议先读**）

### 8.1 编辑工具相关
- **绝对不要用 `bash heredoc` 或 `sed/awk` 写含正则的 JS 代码**：反斜杠转义会被 shell 吃掉，导致正则损坏（本项目曾因此把 `isPersonName` 正则写坏，精英搜索 ranked=0）。**一律用 Write / Edit 工具**。

### 8.2 数据源相关
- **美股财报 SECUCODE 必须带 `.N` 后缀**（如 `BABA.N`），否则东财 datacenter 恒返回空。这是花了很久才定位的坑。
- 东财 datacenter **限流敏感**，用大页模式 `pageSize=500` 规避。
- `qt.gtimg.cn` 返回 **GBK 编码**，要 `TextDecoder('gbk')`。
- **百度安全验证是 IP 级风控，无法绕过**（Cookie 预热、Baiduspider UA 均无效）。已做 10 分钟冷却短路。
- 港美股**没有公开的轻量高管接口**（东财无此报表，新浪港股高管页是 JS 异步加载空壳）→ 只能靠 AI 记忆库补档。

### 8.3 编码/路径相关
- 中文路径下 **bash 的 glob 不会展开**（`lib/*.js` 会报 No such file），要 `cd` 到目录再 `for f in *.js`。
- Windows + Git Bash：临时文件别写 `/tmp`（会变成 `D:\tmp`），写在项目目录里。

### 8.4 后台任务通知
- 会收到 `task failed` 通知——**如果那是我主动 `taskkill` 掉的旧服务进程，属预期**，不要当成错误去"修"。

### 8.5 逻辑陷阱
- `registry.fetchRegistry()` 返回的 `out.personnel` 里，AI 补档来源的人**必须带 `sources: ['AI 记忆库']`**，否则 `analyze.js` 无法识别并构造 `aiDossiers`（我修过这个）。
- `elite-search.js` 里 `KNOWN_PEOPLE_DB` 的引入是 `require('./known-people').KNOWN_PEOPLE_DB`（因为 known-people 导出的是 `{KNOWN_PEOPLE_DB: {...}}` 包装对象，**需要解构**）。

---

## 9. 自测基线（改动后应保持）

```bash
# 场景 1：A股（应 < 2s，覆盖率 100%）
POST /api/analyze {"company":"贵州茅台酒股份有限公司","type":"listed"}
# 期望：score ≈ 91.2，verdict「目前适合投资」，elite 6，coverage 100%

# 场景 2：港股（应 < 40s）
POST /api/analyze {"company":"腾讯控股有限公司","type":"listed"}
# 期望：code 00700/hk，verdict「目前适合投资」，elite 10-12

# 场景 3：未上市（应 < 40s）
POST /api/analyze {"company":"蔚来汽车","type":"unlisted"}
# 期望：score ≈ 54，verdict「目前并不是非常适合投资」，elite 5
```

**判定阈值验证**：
```bash
node -e "const{verdictOf}=require('./lib/scoring');[59.9,60,60.1].forEach(s=>console.log(s,verdictOf(s).label))"
# 59.9 → 目前看来并不是非常适合投资
# 60   → 目前适合投资
# 60.1 → 目前适合投资
```

---

## 10. 协作须知（**用户明确要求，必须遵守**）

1. **AI 说"完成"不算数** —— 改完等用户亲自验证后才 commit/push。
2. **不得擅自 commit / push**。
3. 用户是参与人员而非仓库管理员：不 force push、不删远程分支/tag、不改仓库设置。
4. Gitee 仓库（`laj37/financial-fraud-prevention`）**走 SSH**（@C-Sunset / 吴乔佳屹），HTTPS token 已失效。
5. 提交身份：`Par_W <win_wkp@outlook.com>`，提交消息前缀 `[P2]`。
6. **目录边界**：P2 只改 `front/stage/**`；`backend/`、`docs/`、`AGENTS.md`、`pitch/`、`front/panel/`、`front/family/`、`backend/data/` 一律只读。
7. 删代码、装新依赖、改契约前**必须先问用户**。
8. 沟通用中文，直接给结论和可执行命令。

---

## 11. 工作日志位置

详细的逐次改动记录在：
```
D:/工作区1：黑客松/.workbuddy/memory/2026-10-02.md
D:/工作区1：黑客松/.workbuddy/memory/2026-10-03.md
D:/工作区1：黑客松/.workbuddy/memory/MEMORY.md   (项目长期约定)
```

---

*如本报告与代码不一致，**以代码为准**，并顺手更新本文件。*
