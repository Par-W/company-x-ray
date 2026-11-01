/* 离线快照（v2 统一结构）—— 由 scripts/gen_offline.py 生成，不要手改。 */
window.XrayOfflineUnified = {
 "_note": "离线快照：由 scripts/gen_offline.py 从内置已复核库生成，结构与线上统一查询一致。直接打开文件时只能查本地库，**云端线索不可用**；查无记录 ≠ 有问题。不要手改。",
 "_generated_from": "backend/data/brands.json + entities.json",
 "_schema": "xray.unified.v1",
 "_count": 38,
 "entries": {
  "蜜雪冰城": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "蜜雪冰城",
    "at": ""
   },
   "verdict": {
    "name": "蜜雪冰城",
    "trust": "high",
    "trust_label": "高 · 公开信息一致",
    "trust_hint": "该名称在内置已复核事实库中，关键公开信息相互一致。付款前请再核对一次：合同上的签约主体是否就是这里的官方主体。",
    "in_library": true,
    "verified": 4,
    "grey": 2,
    "mismatch": 0,
    "coverage": 67,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 67,
     "coverageBasis": "六锚点已核一致 4 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 33,
    "facts": [
     {
      "k": "品牌",
      "v": "蜜雪冰城"
     },
     {
      "k": "官方主体",
      "v": "蜜雪冰城股份有限公司"
     },
     {
      "k": "备案编号",
      "v": "0410101211000020"
     },
     {
      "k": "商标持有人",
      "v": "蜜雪冰城股份有限公司"
     },
     {
      "k": "ICP主体",
      "v": "蜜雪冰城股份有限公司"
     },
     {
      "k": "官网域名",
      "v": "www.mxbc.com"
     },
     {
      "k": "复核状态",
      "v": "已复核"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0410101211000020",
      "actual": "0410101211000020",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "蜜雪冰城股份有限公司",
      "actual": "蜜雪冰城股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "蜜雪冰城股份有限公司",
      "actual": "蜜雪冰城股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": "蜜雪冰城股份有限公司",
      "actual": "蜜雪冰城股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "蜜雪冰城股份有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "蜜雪冰城股份有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "蜜雪冰城股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "www.mxbc.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "蜜雪冰城股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "蜜雪冰城股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "blue_v",
     "label": "蓝V 认证主体",
     "group": "registration",
     "local": {
      "v": "蜜雪冰城股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0410101211000020",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "蜜雪冰城",
     "entity": null,
     "fields": 6
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "茶百道": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "茶百道",
    "at": ""
   },
   "verdict": {
    "name": "茶百道",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "茶百道"
     },
     {
      "k": "官方主体",
      "v": "成都茶百道餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0510100211800119"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "备案号已核实,其余待查"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0510100211800119",
      "actual": "0510100211800119",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "成都茶百道餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "成都茶百道餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "成都茶百道餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0510100211800119",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "茶百道",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "古茗": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "古茗",
    "at": ""
   },
   "verdict": {
    "name": "古茗",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "古茗"
     },
     {
      "k": "官方主体",
      "v": "浙江古茗科技有限公司"
     },
     {
      "k": "备案编号",
      "v": "0331000212000019"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "备案号已核实,其余待查"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0331000212000019",
      "actual": "0331000212000019",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "浙江古茗科技有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "浙江古茗科技有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "浙江古茗科技有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0331000212000019",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "古茗",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "沪上阿姨": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "沪上阿姨",
    "at": ""
   },
   "verdict": {
    "name": "沪上阿姨",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "沪上阿姨"
     },
     {
      "k": "官方主体",
      "v": "上海臻敬实业有限公司"
     },
     {
      "k": "备案编号",
      "v": "0310900211900024"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "备案号已核实,其余待查"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0310900211900024",
      "actual": "0310900211900024",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "上海臻敬实业有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "上海臻敬实业有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "上海臻敬实业有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0310900211900024",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "沪上阿姨",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "塔斯汀": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "塔斯汀",
    "at": ""
   },
   "verdict": {
    "name": "塔斯汀",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "塔斯汀"
     },
     {
      "k": "官方主体",
      "v": "福州塔斯汀餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0350100212000103"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "备案号已核实,其余待查"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0350100212000103",
      "actual": "0350100212000103",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "福州塔斯汀餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "福州塔斯汀餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "福州塔斯汀餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0350100212000103",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "塔斯汀",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "杨国福麻辣烫": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "杨国福麻辣烫",
    "at": ""
   },
   "verdict": {
    "name": "杨国福麻辣烫",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "杨国福麻辣烫"
     },
     {
      "k": "官方主体",
      "v": "哈尔滨杨国福麻辣烫餐饮服务有限公司"
     },
     {
      "k": "备案编号",
      "v": "0230100211300017"
     },
     {
      "k": "商标持有人",
      "v": "哈尔滨杨国福麻辣烫餐饮服务有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "ygfglobal.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04,与旧值逐字一致)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0230100211300017",
      "actual": "0230100211300017",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "哈尔滨杨国福麻辣烫餐饮服务有限公司",
      "actual": "哈尔滨杨国福麻辣烫餐饮服务有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "哈尔滨杨国福麻辣烫餐饮服务有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "哈尔滨杨国福麻辣烫餐饮服务有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "哈尔滨杨国福麻辣烫餐饮服务有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "ygfglobal.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "哈尔滨杨国福麻辣烫餐饮服务有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0230100211300017",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "杨国福麻辣烫",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "张亮麻辣烫": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "张亮麻辣烫",
    "at": ""
   },
   "verdict": {
    "name": "张亮麻辣烫",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "张亮麻辣烫"
     },
     {
      "k": "官方主体",
      "v": "黑龙江省张亮餐饮有限公司"
     },
     {
      "k": "备案编号",
      "v": "0230100211500023"
     },
     {
      "k": "商标持有人",
      "v": "黑龙江省张亮餐饮有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "zlmlt.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04,已更正旧错误数据)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0230100211500023",
      "actual": "0230100211500023",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "黑龙江省张亮餐饮有限公司",
      "actual": "黑龙江省张亮餐饮有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "黑龙江省张亮餐饮有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "黑龙江省张亮餐饮有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "黑龙江省张亮餐饮有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "zlmlt.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "黑龙江省张亮餐饮有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0230100211500023",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "张亮麻辣烫",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "正新鸡排": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "正新鸡排",
    "at": ""
   },
   "verdict": {
    "name": "正新鸡排",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 3,
    "grey": 3,
    "mismatch": 0,
    "coverage": 50,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 50,
     "coverageBasis": "六锚点已核一致 3 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 50,
    "facts": [
     {
      "k": "品牌",
      "v": "正新鸡排"
     },
     {
      "k": "官方主体",
      "v": "上海正新食品集团有限公司"
     },
     {
      "k": "备案编号",
      "v": "0311700211600031"
     },
     {
      "k": "商标持有人",
      "v": "上海正新食品集团有限公司"
     },
     {
      "k": "ICP主体",
      "v": "上海正新食品集团有限公司"
     },
     {
      "k": "官网域名",
      "v": "zhengxinfood.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04,已更正主体名)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0311700211600031",
      "actual": "0311700211600031",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "上海正新食品集团有限公司",
      "actual": "上海正新食品集团有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "上海正新食品集团有限公司",
      "actual": "上海正新食品集团有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "上海正新食品集团有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "上海正新食品集团有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "上海正新食品集团有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "zhengxinfood.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "上海正新食品集团有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "上海正新食品集团有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0311700211600031",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "正新鸡排",
     "entity": null,
     "fields": 5
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "书亦烧仙草": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "书亦烧仙草",
    "at": ""
   },
   "verdict": {
    "name": "书亦烧仙草",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "书亦烧仙草"
     },
     {
      "k": "官方主体",
      "v": "四川书亦餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0510100211700112"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "备案号已核实,其余待查"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0510100211700112",
      "actual": "0510100211700112",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "四川书亦餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "四川书亦餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "四川书亦餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0510100211700112",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "书亦烧仙草",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "德克士": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "德克士",
    "at": ""
   },
   "verdict": {
    "name": "德克士",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "德克士"
     },
     {
      "k": "官方主体",
      "v": "天津顶巧餐饮服务咨询有限公司"
     },
     {
      "k": "备案编号",
      "v": "0120301100900003"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "备案号已核实,其余待查"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0120301100900003",
      "actual": "0120301100900003",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "天津顶巧餐饮服务咨询有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "天津顶巧餐饮服务咨询有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "天津顶巧餐饮服务咨询有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0120301100900003",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "德克士",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "鹿角湾": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "鹿角湾",
    "at": ""
   },
   "verdict": {
    "name": "鹿角湾",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "鹿角湾"
     },
     {
      "k": "官方主体",
      "v": "库内未登记"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "库内未登记"
     },
     {
      "k": "复核状态",
      "v": "待查证"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "鹿角湾",
     "entity": null,
     "fields": 0
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "华莱士": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "华莱士",
    "at": ""
   },
   "verdict": {
    "name": "华莱士",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "华莱士"
     },
     {
      "k": "官方主体",
      "v": "上海榕赢品牌管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0311200212000064"
     },
     {
      "k": "商标持有人",
      "v": "上海榕赢品牌管理有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "cnhls.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0311200212000064",
      "actual": "0311200212000064",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "上海榕赢品牌管理有限公司",
      "actual": "上海榕赢品牌管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "上海榕赢品牌管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "上海榕赢品牌管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "上海榕赢品牌管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "cnhls.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "上海榕赢品牌管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0311200212000064",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "华莱士",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "绝味鸭脖": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "绝味鸭脖",
    "at": ""
   },
   "verdict": {
    "name": "绝味鸭脖",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "绝味鸭脖"
     },
     {
      "k": "官方主体",
      "v": "长沙绝味食品营销有限公司"
     },
     {
      "k": "备案编号",
      "v": "0430102011100019"
     },
     {
      "k": "商标持有人",
      "v": "长沙绝味食品营销有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "juewei.cn"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0430102011100019",
      "actual": "0430102011100019",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "长沙绝味食品营销有限公司",
      "actual": "长沙绝味食品营销有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "长沙绝味食品营销有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "长沙绝味食品营销有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "长沙绝味食品营销有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "juewei.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "长沙绝味食品营销有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0430102011100019",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "绝味鸭脖",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "霸王茶姬": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "霸王茶姬",
    "at": ""
   },
   "verdict": {
    "name": "霸王茶姬",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "霸王茶姬"
     },
     {
      "k": "官方主体",
      "v": "四川茶姬企业管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0530100211900046"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "四川茶姬企业管理有限公司"
     },
     {
      "k": "官网域名",
      "v": "chagee.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0530100211900046",
      "actual": "0530100211900046",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "四川茶姬企业管理有限公司",
      "actual": "四川茶姬企业管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "四川茶姬企业管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "四川茶姬企业管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "四川茶姬企业管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "chagee.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "四川茶姬企业管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0530100211900046",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "霸王茶姬",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "奈雪的茶": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "奈雪的茶",
    "at": ""
   },
   "verdict": {
    "name": "奈雪的茶",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "奈雪的茶"
     },
     {
      "k": "官方主体",
      "v": "深圳市品道餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0311200212300113"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "深圳市品道餐饮管理有限公司"
     },
     {
      "k": "官网域名",
      "v": "naixue.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0311200212300113",
      "actual": "0311200212300113",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "深圳市品道餐饮管理有限公司",
      "actual": "深圳市品道餐饮管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "深圳市品道餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "深圳市品道餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "深圳市品道餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "naixue.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "深圳市品道餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0311200212300113",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "奈雪的茶",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "老乡鸡": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "老乡鸡",
    "at": ""
   },
   "verdict": {
    "name": "老乡鸡",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "老乡鸡"
     },
     {
      "k": "官方主体",
      "v": "安徽老乡鸡餐饮有限公司"
     },
     {
      "k": "备案编号",
      "v": "0340100212000123"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "lxjchina.com.cn"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0340100212000123",
      "actual": "0340100212000123",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "安徽老乡鸡餐饮有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "安徽老乡鸡餐饮有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "安徽老乡鸡餐饮有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "lxjchina.com.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0340100212000123",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "老乡鸡",
     "entity": null,
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "紫燕百味鸡": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "紫燕百味鸡",
    "at": ""
   },
   "verdict": {
    "name": "紫燕百味鸡",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 3,
    "grey": 3,
    "mismatch": 0,
    "coverage": 50,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 50,
     "coverageBasis": "六锚点已核一致 3 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 50,
    "facts": [
     {
      "k": "品牌",
      "v": "紫燕百味鸡"
     },
     {
      "k": "官方主体",
      "v": "紫燕食品集团股份有限公司"
     },
     {
      "k": "备案编号",
      "v": "0311200111400023"
     },
     {
      "k": "商标持有人",
      "v": "紫燕食品集团股份有限公司"
     },
     {
      "k": "ICP主体",
      "v": "紫燕食品集团股份有限公司"
     },
     {
      "k": "官网域名",
      "v": "ziyanfoods.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0311200111400023",
      "actual": "0311200111400023",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "紫燕食品集团股份有限公司",
      "actual": "紫燕食品集团股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "紫燕食品集团股份有限公司",
      "actual": "紫燕食品集团股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "紫燕食品集团股份有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "紫燕食品集团股份有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "紫燕食品集团股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "ziyanfoods.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "紫燕食品集团股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "紫燕食品集团股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0311200111400023",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "紫燕百味鸡",
     "entity": null,
     "fields": 5
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "夸父炸串": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "夸父炸串",
    "at": ""
   },
   "verdict": {
    "name": "夸父炸串",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "夸父炸串"
     },
     {
      "k": "官方主体",
      "v": "厦门心有炸念餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0112800212100013"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "51kuafu.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0112800212100013",
      "actual": "0112800212100013",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "厦门心有炸念餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "厦门心有炸念餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "厦门心有炸念餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "51kuafu.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0112800212100013",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "夸父炸串",
     "entity": null,
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "锅圈食汇": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "锅圈食汇",
    "at": ""
   },
   "verdict": {
    "name": "锅圈食汇",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "锅圈食汇"
     },
     {
      "k": "官方主体",
      "v": "河南锅圈供应链管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0410100111900091"
     },
     {
      "k": "商标持有人",
      "v": "河南锅圈供应链管理有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "zzgqsh.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核;官网主体三方不一致(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0410100111900091",
      "actual": "0410100111900091",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "河南锅圈供应链管理有限公司",
      "actual": "河南锅圈供应链管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "河南锅圈供应链管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "河南锅圈供应链管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "河南锅圈供应链管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "zzgqsh.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "河南锅圈供应链管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0410100111900091",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "锅圈食汇",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "米村拌饭": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "米村拌饭",
    "at": ""
   },
   "verdict": {
    "name": "米村拌饭",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "米村拌饭"
     },
     {
      "k": "官方主体",
      "v": "延边米村餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0222400211900004"
     },
     {
      "k": "商标持有人",
      "v": "延边米村餐饮管理有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "micun.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0222400211900004",
      "actual": "0222400211900004",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "延边米村餐饮管理有限公司",
      "actual": "延边米村餐饮管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "延边米村餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "延边米村餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "延边米村餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "micun.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "延边米村餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0222400211900004",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "米村拌饭",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "美宜佳": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "美宜佳",
    "at": ""
   },
   "verdict": {
    "name": "美宜佳",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "美宜佳"
     },
     {
      "k": "官方主体",
      "v": "美宜佳控股有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "meiyijia.com.cn"
     },
     {
      "k": "复核状态",
      "v": "官方主体已核(官网页脚);备案号未取得"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "美宜佳控股有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "美宜佳控股有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "美宜佳控股有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "meiyijia.com.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "美宜佳",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "百果园": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "百果园",
    "at": ""
   },
   "verdict": {
    "name": "百果园",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "百果园"
     },
     {
      "k": "官方主体",
      "v": "深圳百果园实业（集团）股份有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "深圳百果园实业（集团）股份有限公司"
     },
     {
      "k": "官网域名",
      "v": "pagoda.com.cn"
     },
     {
      "k": "复核状态",
      "v": "官方主体已核(官网app开发者署名,置信度高);备案号未取得"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "深圳百果园实业（集团）股份有限公司",
      "actual": "深圳百果园实业（集团）股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "深圳百果园实业(集团)股份有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "深圳百果园实业(集团)股份有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "深圳百果园实业（集团）股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "pagoda.com.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "深圳百果园实业（集团）股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "百果园",
     "entity": null,
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "赵一鸣零食": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "赵一鸣零食",
    "at": ""
   },
   "verdict": {
    "name": "赵一鸣零食",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "赵一鸣零食"
     },
     {
      "k": "官方主体",
      "v": "宜春市赵一鸣商贸有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "zymls.com"
     },
     {
      "k": "复核状态",
      "v": "官方主体已核(官网页脚版权署名);集团主体两说并存"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "宜春市赵一鸣商贸有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "宜春市赵一鸣商贸有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "宜春市赵一鸣商贸有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "zymls.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "赵一鸣零食",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "零食很忙": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "零食很忙",
    "at": ""
   },
   "verdict": {
    "name": "零食很忙",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "零食很忙"
     },
     {
      "k": "官方主体",
      "v": "湖南鸣鸣很忙商业连锁股份有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "hnlshm.com"
     },
     {
      "k": "复核状态",
      "v": "官方主体已核(集团官网页头);股份/有限两写并存"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "湖南鸣鸣很忙商业连锁股份有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "湖南鸣鸣很忙商业连锁股份有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "湖南鸣鸣很忙商业连锁股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "hnlshm.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "零食很忙",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "零食有鸣": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "零食有鸣",
    "at": ""
   },
   "verdict": {
    "name": "零食有鸣",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "零食有鸣"
     },
     {
      "k": "官方主体",
      "v": "成都零食有鸣商业管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "cdlsym.com"
     },
     {
      "k": "复核状态",
      "v": "⚠️官方主体为二手来源(百科/爱企查摘要),待人工复核"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "成都零食有鸣商业管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "成都零食有鸣商业管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "成都零食有鸣商业管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "cdlsym.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "零食有鸣",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "钱大妈": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "钱大妈",
    "at": ""
   },
   "verdict": {
    "name": "钱大妈",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "钱大妈"
     },
     {
      "k": "官方主体",
      "v": "广州市钱大妈农产品有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "qdama.cn"
     },
     {
      "k": "复核状态",
      "v": "⚠️官方主体为二手来源(百科/爱企查摘要),待人工复核"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "广州市钱大妈农产品有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "广州市钱大妈农产品有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "广州市钱大妈农产品有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "qdama.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "钱大妈",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "罗森": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "罗森",
    "at": ""
   },
   "verdict": {
    "name": "罗森",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 6,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 100,
    "facts": [
     {
      "k": "品牌",
      "v": "罗森"
     },
     {
      "k": "官方主体",
      "v": "罗森投资有限公司"
     },
     {
      "k": "备案编号",
      "v": "库内未登记"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "chinalawson.com.cn"
     },
     {
      "k": "复核状态",
      "v": "官方主体已核(官网企业概要);区域主体未逐一核实"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "罗森投资有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "罗森投资有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "罗森投资有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "chinalawson.com.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "罗森",
     "entity": null,
     "fields": 2
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "瑞幸咖啡": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "瑞幸咖啡",
    "at": ""
   },
   "verdict": {
    "name": "瑞幸咖啡",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "瑞幸咖啡"
     },
     {
      "k": "官方主体",
      "v": "瑞幸咖啡（中国）有限公司"
     },
     {
      "k": "备案编号",
      "v": "0350200212000103"
     },
     {
      "k": "商标持有人",
      "v": "瑞幸咖啡（中国）有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "lkcoffee.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04);三个法人并存"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0350200212000103",
      "actual": "0350200212000103",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "瑞幸咖啡（中国）有限公司",
      "actual": "瑞幸咖啡（中国）有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "瑞幸咖啡(中国)有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "瑞幸咖啡(中国)有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "瑞幸咖啡（中国）有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "lkcoffee.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "瑞幸咖啡（中国）有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0350200212000103",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "瑞幸咖啡",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "库迪咖啡": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "库迪咖啡",
    "at": ""
   },
   "verdict": {
    "name": "库迪咖啡",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "库迪咖啡"
     },
     {
      "k": "官方主体",
      "v": "库迪新科技（安徽）有限公司"
     },
     {
      "k": "备案编号",
      "v": "0340500212400005"
     },
     {
      "k": "商标持有人",
      "v": "库迪科技（海南）有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "cotticoffee.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04);多法人并存"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0340500212400005",
      "actual": "0340500212400005",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "库迪科技（海南）有限公司",
      "actual": "库迪科技（海南）有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "库迪新科技(安徽)有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "库迪新科技(安徽)有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "库迪新科技（安徽）有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "cotticoffee.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "库迪科技（海南）有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0340500212400005",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "库迪咖啡",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "喜茶": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "喜茶",
    "at": ""
   },
   "verdict": {
    "name": "喜茶",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "喜茶"
     },
     {
      "k": "官方主体",
      "v": "喜茶（深圳）企业管理有限责任公司"
     },
     {
      "k": "备案编号",
      "v": "0440300212200213"
     },
     {
      "k": "商标持有人",
      "v": "深圳美西西餐饮管理有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "heytea.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0440300212200213",
      "actual": "0440300212200213",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "深圳美西西餐饮管理有限公司",
      "actual": "深圳美西西餐饮管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "喜茶(深圳)企业管理有限责任公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "喜茶(深圳)企业管理有限责任公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "喜茶（深圳）企业管理有限责任公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "heytea.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "深圳美西西餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0440300212200213",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "喜茶",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "一点点": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "一点点",
    "at": ""
   },
   "verdict": {
    "name": "一点点",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "一点点"
     },
     {
      "k": "官方主体",
      "v": "上海晴安餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "1310700211600020"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "alittle-tea.com"
     },
     {
      "k": "复核状态",
      "v": "⚠️主体关系混乱(置信度低),待人工复核"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "1310700211600020",
      "actual": "1310700211600020",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "上海晴安餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "上海晴安餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "上海晴安餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "alittle-tea.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "1310700211600020",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "一点点",
     "entity": null,
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "CoCo都可": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "CoCo都可",
    "at": ""
   },
   "verdict": {
    "name": "CoCo都可",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 1,
    "grey": 5,
    "mismatch": 0,
    "coverage": 17,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 17,
     "coverageBasis": "六锚点已核一致 1 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 83,
    "facts": [
     {
      "k": "品牌",
      "v": "coco都可"
     },
     {
      "k": "官方主体",
      "v": "上海嘉赫餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0310500212300048"
     },
     {
      "k": "商标持有人",
      "v": "库内未登记"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "coco-tea.com.cn"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0310500212300048",
      "actual": "0310500212300048",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "上海嘉赫餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "上海嘉赫餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "上海嘉赫餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "coco-tea.com.cn",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0310500212300048",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "CoCo都可",
     "entity": null,
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "益禾堂": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "益禾堂",
    "at": ""
   },
   "verdict": {
    "name": "益禾堂",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 2,
    "grey": 4,
    "mismatch": 0,
    "coverage": 33,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 33,
     "coverageBasis": "六锚点已核一致 2 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 67,
    "facts": [
     {
      "k": "品牌",
      "v": "益禾堂"
     },
     {
      "k": "官方主体",
      "v": "武汉熠汇饮科技有限公司"
     },
     {
      "k": "备案编号",
      "v": "0420100212000130"
     },
     {
      "k": "商标持有人",
      "v": "武汉熠汇饮科技有限公司"
     },
     {
      "k": "ICP主体",
      "v": "库内未登记"
     },
     {
      "k": "官网域名",
      "v": "yihetang.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0420100212000130",
      "actual": "0420100212000130",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "武汉熠汇饮科技有限公司",
      "actual": "武汉熠汇饮科技有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "武汉熠汇饮科技有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "武汉熠汇饮科技有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "武汉熠汇饮科技有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "yihetang.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "武汉熠汇饮科技有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0420100212000130",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "益禾堂",
     "entity": null,
     "fields": 4
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "甜啦啦": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "甜啦啦",
    "at": ""
   },
   "verdict": {
    "name": "甜啦啦",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 3,
    "grey": 3,
    "mismatch": 0,
    "coverage": 50,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 50,
     "coverageBasis": "六锚点已核一致 3 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 50,
    "facts": [
     {
      "k": "品牌",
      "v": "甜啦啦"
     },
     {
      "k": "官方主体",
      "v": "安徽汇旺餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0340300212000010"
     },
     {
      "k": "商标持有人",
      "v": "安徽汇旺餐饮管理有限公司"
     },
     {
      "k": "ICP主体",
      "v": "安徽汇旺餐饮管理有限公司"
     },
     {
      "k": "官网域名",
      "v": "tianlala.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04,四项互相印证)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0340300212000010",
      "actual": "0340300212000010",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "安徽汇旺餐饮管理有限公司",
      "actual": "安徽汇旺餐饮管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "安徽汇旺餐饮管理有限公司",
      "actual": "安徽汇旺餐饮管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "安徽汇旺餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "安徽汇旺餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "安徽汇旺餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "tianlala.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "安徽汇旺餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "安徽汇旺餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0340300212000010",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "甜啦啦",
     "entity": null,
     "fields": 5
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "幸运咖": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "幸运咖",
    "at": ""
   },
   "verdict": {
    "name": "幸运咖",
    "trust": "medium",
    "trust_label": "一般 · 部分信息待核",
    "trust_hint": "查到了一部分公开信息，还有若干项没有记录。这不代表有问题，建议按官方入口补齐后再决定。",
    "in_library": true,
    "verified": 3,
    "grey": 3,
    "mismatch": 0,
    "coverage": 50,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 50,
     "coverageBasis": "六锚点已核一致 3 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": 50,
    "facts": [
     {
      "k": "品牌",
      "v": "幸运咖"
     },
     {
      "k": "官方主体",
      "v": "河南幸运咖餐饮管理有限公司"
     },
     {
      "k": "备案编号",
      "v": "0410100212000102"
     },
     {
      "k": "商标持有人",
      "v": "蜜雪冰城股份有限公司"
     },
     {
      "k": "ICP主体",
      "v": "河南幸运咖餐饮管理有限公司"
     },
     {
      "k": "官网域名",
      "v": "xingyunka.com"
     },
     {
      "k": "复核状态",
      "v": "商务部备案库+官网页脚已核(2026-10-04)"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "expected": "0410100212000102",
      "actual": "0410100212000102",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://txjy.mofcom.gov.cn/"
     },
     {
      "name": "商标持有人",
      "expected": "蜜雪冰城股份有限公司",
      "actual": "蜜雪冰城股份有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://wcjs.sbj.cnipa.gov.cn/"
     },
     {
      "name": "ICP备案主体",
      "expected": "河南幸运咖餐饮管理有限公司",
      "actual": "河南幸运咖餐饮管理有限公司",
      "pass": true,
      "evidence": "一致",
      "source_url": "https://beian.miit.gov.cn/"
     },
     {
      "name": "蓝V认证主体",
      "expected": null,
      "actual": null,
      "pass": null,
      "evidence": "无公开数据",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "签约主体",
      "expected": null,
      "actual": "河南幸运咖餐饮管理有限公司",
      "pass": null,
      "evidence": "演示中无合同",
      "source_url": "https://www.gsxt.gov.cn/"
     },
     {
      "name": "收款主体",
      "expected": null,
      "actual": "河南幸运咖餐饮管理有限公司",
      "pass": null,
      "evidence": "未捕获收款账户信息",
      "source_url": "https://www.gsxt.gov.cn/"
     }
    ],
    "anchors_judgeable": true,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "河南幸运咖餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "website",
     "label": "官网",
     "group": "identity",
     "local": {
      "v": "xingyunka.com",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "trademark_holder",
     "label": "商标持有人",
     "group": "registration",
     "local": {
      "v": "蜜雪冰城股份有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "icp_entity",
     "label": "ICP 备案主体",
     "group": "registration",
     "local": {
      "v": "河南幸运咖餐饮管理有限公司",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "franchise_no",
     "label": "特许经营备案号",
     "group": "registration",
     "local": {
      "v": "0410100212000102",
      "src": "brands.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": "幸运咖",
     "entity": null,
     "fields": 5
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "河南雪王冻品优选餐饮管理有限公司": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "河南雪王冻品优选餐饮管理有限公司",
    "at": ""
   },
   "verdict": {
    "name": "河南雪王冻品优选餐饮管理有限公司",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 0,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": null,
    "facts": [
     {
      "k": "工商登记名称",
      "v": "河南雪王冻品优选餐饮管理有限公司"
     },
     {
      "k": "成立日期",
      "v": "2026-05-02"
     },
     {
      "k": "登记状态",
      "v": "正常"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "商标持有人",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "ICP备案主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "蓝V认证主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "签约主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "收款主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     }
    ],
    "anchors_judgeable": false,
    "fund": {
     "state": "ok",
     "note": "库内没有该主体的资金往来记录。",
     "summary": {
      "total": 0,
      "red_hard": 0,
      "red_soft": 0,
      "yellow": 0,
      "green": 0,
      "amount_total": 0,
      "counterparts": 0
     },
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "河南雪王冻品优选餐饮管理有限公司",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "status",
     "label": "工商状态",
     "group": "status",
     "local": {
      "v": "正常",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "established",
     "label": "成立日期",
     "group": "status",
     "local": {
      "v": "2026-05-02",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": null,
     "entity": "河南雪王冻品优选餐饮管理有限公司",
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "成都岑野餐饮管理有限公司": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "成都岑野餐饮管理有限公司",
    "at": ""
   },
   "verdict": {
    "name": "成都岑野餐饮管理有限公司",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 0,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": null,
    "facts": [
     {
      "k": "工商登记名称",
      "v": "成都岑野餐饮管理有限公司"
     },
     {
      "k": "成立日期",
      "v": "2026-02-02"
     },
     {
      "k": "登记状态",
      "v": "正常"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "商标持有人",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "ICP备案主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "蓝V认证主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "签约主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "收款主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     }
    ],
    "anchors_judgeable": false,
    "fund": {
     "state": "ok",
     "note": "库内没有该主体的资金往来记录。",
     "summary": {
      "total": 0,
      "red_hard": 0,
      "red_soft": 0,
      "yellow": 0,
      "green": 0,
      "amount_total": 0,
      "counterparts": 0
     },
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "成都岑野餐饮管理有限公司",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "status",
     "label": "工商状态",
     "group": "status",
     "local": {
      "v": "正常",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "established",
     "label": "成立日期",
     "group": "status",
     "local": {
      "v": "2026-02-02",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": null,
     "entity": "成都岑野餐饮管理有限公司",
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  },
  "郑州优选冻品供应链有限公司": {
   "schema": "xray.unified.v1",
   "query": {
    "name": "郑州优选冻品供应链有限公司",
    "at": ""
   },
   "verdict": {
    "name": "郑州优选冻品供应链有限公司",
    "trust": "medium",
    "trust_label": "一般 · 库内仅有基础记录",
    "trust_hint": "库内只有基础记录，其余公开信息尚未收录。建议按官方入口自行核实。",
    "in_library": true,
    "verified": 0,
    "grey": 0,
    "mismatch": 0,
    "coverage": 0,
    "caliber": {
     "schema": "xray.caliber.v1",
     "version": "2.0.0",
     "gate": "descriptive",
     "coverage": 0,
     "coverageBasis": "六锚点已核一致 0 / 6",
     "anchorsTotal": 6,
     "note": "可信度只描述「查到了什么」，本身不是建议，因此不设覆盖率下限。"
    },
    "transparency": null,
    "facts": [
     {
      "k": "工商登记名称",
      "v": "郑州优选冻品供应链有限公司"
     },
     {
      "k": "成立日期",
      "v": "2024-08-02"
     },
     {
      "k": "登记状态",
      "v": "正常"
     }
    ],
    "ai_clues": [],
    "ai_used": false,
    "ai_note": "以下为 AI 依据自身知识给出的线索（**非实时接口、可能过时、不可复核**）。本次结论未参与本次判定；请用下方官方入口核对。",
    "anchors": [
     {
      "name": "特许经营备案",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "商标持有人",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "ICP备案主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "蓝V认证主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "签约主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     },
     {
      "name": "收款主体",
      "pass": null,
      "evidence": "该主体未收录于内置已复核事实库，本次也没有页面信息，因此这一项**无法判断**（无法判断 ≠ 有问题；请用官方入口自查后回到本页对照）",
      "source_url": ""
     }
    ],
    "anchors_judgeable": false,
    "fund": {
     "state": "unknown",
     "note": "内置资金流水库里没有该主体的往来记录 —— 查无记录不等于资金往来干净。当前为虚构演示数据，只覆盖库内主体。",
     "summary": null,
     "link": "/fund/",
     "rows": []
    },
    "sources": {
     "facts": "内置已复核事实库（团队逐条核对并附官方来源链接，离线可用）",
     "live": "联网项：A 股上市公司财务与行情（可选，来自公开数据源）",
     "official": "官方入口只提供跳转，本系统不抓取官方站点内容；结论以你当场点开看到的为准",
     "not_provided": "本次为手动查询，没有页面上的签约主体 / 收款账户信息，相关锚点标为「需页面信息」"
    },
    "manual_note": "这是手动查询口径（可不可信），与浏览器插件在付款页面的自动拦截口径不同：后者能拿到页面上的签约主体与收款账户，所以会给出「不一致就拦下」的结论。",
    "disclaimer": null,
    "generated_at": null,
    "conflict": false,
    "conflicts": 0
   },
   "fields": [
    {
     "key": "official_name",
     "label": "官方 / 签约主体",
     "group": "identity",
     "local": {
      "v": "郑州优选冻品供应链有限公司",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "status",
     "label": "工商状态",
     "group": "status",
     "local": {
      "v": "正常",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    },
    {
     "key": "established",
     "label": "成立日期",
     "group": "status",
     "local": {
      "v": "2024-08-02",
      "src": "entities.json"
     },
     "cloud": null,
     "state": "local_only",
     "note": "仅本地方有记录；云端未提供该字段"
    }
   ],
   "conflicts": [],
   "sources": {
    "local": {
     "state": "hit",
     "brand": null,
     "entity": "郑州优选冻品供应链有限公司",
     "fields": 3
    },
    "cloud": {
     "state": "offline",
     "note": "离线模式：直接打开文件，无法检索云端（联网后请用后端启动，能看到云端线索与两侧冲突）。",
     "snippets": null,
     "hosts": null,
     "fields": 0
    }
   },
   "limits": [
    "本地事实来自内置已复核库（backend/data），收录有限：查无记录 ≠ 有问题。",
    "云端线索来自公开检索片段 + AI 抽取，可能滞后、缺失或抓取失败；它**不能**把结论抬到「高」。",
    "两侧说法不同时本页两边都列出来，不用任何一方覆盖另一方；请以官方登记为准。"
   ]
  }
 },
 "aliases": {
  "蜜雪": "蜜雪冰城",
  "雪王": "蜜雪冰城",
  "杨国福": "杨国福麻辣烫",
  "绝味": "绝味鸭脖",
  "CHAGEE": "霸王茶姬",
  "茶姬": "霸王茶姬",
  "奈雪": "奈雪的茶",
  "紫燕": "紫燕百味鸡",
  "夸父": "夸父炸串",
  "锅圈": "锅圈食汇",
  "米村": "米村拌饭",
  "赵一鸣": "赵一鸣零食",
  "LAWSON": "罗森",
  "罗森便利店": "罗森",
  "瑞幸": "瑞幸咖啡",
  "luckin": "瑞幸咖啡",
  "库迪": "库迪咖啡",
  "COTTI": "库迪咖啡",
  "COTTI COFFEE": "库迪咖啡",
  "HEYTEA": "喜茶",
  "1點點": "一点点",
  "1点点": "一点点",
  "50岚": "一点点",
  "CoCo": "CoCo都可",
  "都可": "CoCo都可",
  "coco": "CoCo都可"
 }
};
