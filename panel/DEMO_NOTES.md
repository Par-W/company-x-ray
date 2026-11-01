# P3 演示口径

## 桌面端 fallback

现场默认使用浏览器版 `front/panel/index.html`（后端托管后访问 `/panel/`）。它不依赖 Tkinter 或桌面程序；先双击 `front/backend_launcher.bat` 启动后端，再打开 `/panel/`。

Windows 桌面程序是可选方案：只有在演示机双击 `front/panel/desktop_launcher.bat` 能出现置顶窗口、并完成一次真实核验时，才使用桌面版。若机器没有带 Tcl/Tk 的 Python，直接使用浏览器版，不在现场临时安装依赖。

## 安卓目录

`front/panel/android-app/` 暂作为赛后规划冻结，不参与当前静态演示路由。后续转 Android 时再单独迁移到移动端目录，并同步更新 `docs/roles.md` 的目录归属。

## AI 解读

AI 解读按钮调用后端 `POST /api/v1/ai/explain`，由后端按 OpenAI 兼容协议调用大模型，生成事实型中文说明。当前演示机使用 **DeepSeek**（密钥形如 `sk-` + 32 位十六进制，**不是** OpenAI 平台密钥，必须同时配 `DEEPSEEK_BASE_URL`，否则会在错误端点得到 401 `invalid_api_key`）。启动后端前在演示机配置环境变量：

搜索框旁的「AI 辅助搜索」调用 `POST /api/v1/ai/search`，返回规范名称、可能别名和下一步核验词；它只做检索辅助，不会把 AI 猜测当成绿色核验结论。

```bat
set DEEPSEEK_API_KEY=你的密钥
set DEEPSEEK_BASE_URL=https://api.deepseek.com
set DEEPSEEK_MODEL=deepseek-v4-pro
uvicorn backend.main:app --port 8000
```

密钥只放在后端环境变量中，不写入页面、桌面程序或仓库。未配置密钥时，核验和搜索仍可使用，AI 按钮会明确提示未启用。

两个必须注意的坑：

1. **代理必须先启动，再启动后端。** 后端用 Python 标准库 `urllib`，代理配置在进程内**只读一次**（首次请求时缓存）。若顺序反了，后端会一直直连错误端点，表现为 `504 AI 请求超时或无法连接：WinError 10061`。稳妥做法是显式指定代理，不依赖注册表读取：

   ```bat
   set HTTPS_PROXY=http://127.0.0.1:7892
   set HTTP_PROXY=http://127.0.0.1:7892
   set NO_PROXY=127.0.0.1,localhost
   ```

2. **`DEEPSEEK_MODEL` 必须是服务商真实存在的模型名。** DeepSeek 当前可选 `deepseek-v4-pro`、`deepseek-flash`；填 `gpt-5` 会得到 502 报错（链路是通的，只是模型不存在）。

已实测（2026-10-03）：`GET /api/v1/ai/status` → `{"enabled":true,"model":"deepseek-v4-pro"}`；`/ai/search`、`/ai/explain` 均 HTTP 200 正常返回；核验主链路 `/api/v1/brand/{name}`、`/api/v1/verdict` 不受影响（brand 绿色 / 6 锚点，verdict 200）。
