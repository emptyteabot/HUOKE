# Streamlit 入口网关部署说明

目标：继续使用 `ai-huoke.streamlit.app` 作为入口，但实际产品由 Next.js（Vercel）承载。

## 1. 入口跳转开关

已在 `streamlit-app/Home.py` 内置入口网关。

在 Streamlit Cloud 的 Secrets 中添加：

```toml
ENABLE_NEXT_REDIRECT = true
NEXT_APP_URL = "https://your-vercel-domain.vercel.app"
NEXT_APP_CN_URL = "https://cn.your-domain.com"
NEXT_REDIRECT_DELAY_MS = 1200
```

含义：
- `ENABLE_NEXT_REDIRECT`：开启旧站入口跳转
- `NEXT_APP_URL`：全球主站
- `NEXT_APP_CN_URL`：中国加速线路（可选）
- `NEXT_REDIRECT_DELAY_MS`：自动跳转延迟

## 2. Next.js 正式站

代码目录：`frontend-b2b`

Vercel 环境变量至少需要：

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

说明：`/api/leads` 生产优先读 Supabase，避免依赖本机 Python。

## 3. 数据流

- 本机 OpenClaw 持续采集社媒线索
- 通过同步脚本写入云端（Supabase）
- Next.js 前台实时读取 Supabase 展示
- Streamlit 仅保留入口/兜底

## 4. 建议域名结构（中国+全球）

- 全球：`app.your-domain.com` -> Vercel
- 中国：`cn.your-domain.com` -> 中国线路加速/镜像
- 旧入口：`ai-huoke.streamlit.app` -> 自动跳转到上面域名

这样可以保证：
- 历史入口不丢
- 前台统一升级为 Next.js
- 线索数据由云端统一读取
