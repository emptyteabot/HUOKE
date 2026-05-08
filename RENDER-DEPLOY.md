# 🚀 Render部署步骤

## 环境变量配置

在Render部署时,添加以下环境变量:

```bash
# 数据库 (Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

# JWT密钥
JWT_SECRET=<generate-a-strong-random-jwt-secret>

# OpenAI API (使用OneAPI)
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1

# 邮件服务 (暂时禁用)
SENDGRID_API_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
FROM_EMAIL=noreply@leadpulse.ai

# 应用配置
NODE_ENV=production
PORT=3000
BACKEND_URL=https://leadpulse-backend.onrender.com
FRONTEND_URL=https://your-app.streamlit.app

# Stripe (暂时不用)
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

## 部署步骤

### 1. 访问Render
https://render.com/

### 2. 创建Web Service
- 点击 "New +" → "Web Service"
- 连接GitHub: `emptyteabot/HUOKE`

### 3. 配置
- **Name**: `leadpulse-backend`
- **Region**: `Singapore`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm run start`
- **Instance Type**: `Free`

### 4. 添加环境变量
复制上面的环境变量,一个个添加到 "Environment Variables"

### 5. 部署
点击 "Create Web Service",等待5-10分钟

### 6. 运行数据库迁移
部署完成后,在Shell中运行:
```bash
npx prisma migrate deploy
```

---

## ✅ 完成后

你会得到后端URL: `https://leadpulse-backend.onrender.com`

然后在Streamlit Cloud的Secrets中添加:
```toml
BACKEND_URL = "https://leadpulse-backend.onrender.com"
```
