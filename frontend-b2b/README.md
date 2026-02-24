# LeadPulse Web SaaS (Next.js)

留学赛道 AI 获客 SaaS 前端（生产版）。

## 当前能力

- 全中文 B2B SaaS 前台
- 线索池看板（筛选、评分、竞品排除、私信可达）
- AI 触达文案生成 API
- 生产 API：优先读取 Supabase（云端 24h），本地 Python 仅兜底

## 本地开发

```bash
cd frontend-b2b
npm install
npm run dev
```

访问：`http://localhost:3000`

## 生产部署（Vercel）

1. 在 Vercel 导入仓库。
2. Root Directory 选择：`frontend-b2b`
3. Build Command：`npm run build`
4. Output：默认（Next.js）
5. 配置环境变量（Production/Preview 都配）

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
# 兼容项（二选一）
# SUPABASE_KEY=...
```

说明：
- `/api/leads` 会优先走 Supabase REST API（适合 Vercel 24h）。
- 若 Supabase 未配置，才会尝试本地 Python 导出脚本（仅本地联调可用）。

## API 路由

- `GET /api/health`：健康检查
- `GET /api/leads`：线索读取与筛选
- `POST /api/ai/draft`：生成触达文案

## 关键查询参数（/api/leads）

- `minScore`：最低分，默认 `65`
- `onlyTarget`：是否只看目标客户，默认 `1`
- `excludeCompetitors`：是否排除机构/竞品，默认 `1`
- `limit`：返回数量，默认 `200`
- `vertical`：垂直领域，默认 `study_abroad`

## 与旧域名联动

如果继续保留 `ai-huoke.streamlit.app` 作为入口：

在 Streamlit secrets 或环境变量中配置：

```toml
ENABLE_NEXT_REDIRECT = true
NEXT_APP_URL = "https://your-vercel-domain.vercel.app"
NEXT_APP_CN_URL = "https://cn.your-domain.com"
NEXT_REDIRECT_DELAY_MS = 1200
```

配置后，旧 Streamlit 域名会自动跳转到 Next.js 新站。
