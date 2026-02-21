# 🚀 LeadPulse 部署指南

## 📋 部署架构

```
┌─────────────────┐
│  Streamlit Cloud │  ← 前端 (免费)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Railway      │  ← 后端 API (免费$5额度)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │  ← 数据库 (Railway内置)
└─────────────────┘
```

---

## 🎯 部署步骤

### 1️⃣ 部署后端到Railway

#### 准备工作
```bash
cd C:\Users\陈盈桦\Desktop\LeadPulse\backend

# 确保有这些文件
# - package.json
# - tsconfig.json
# - prisma/schema.prisma
# - src/index.ts
```

#### 创建 `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### 创建 `Procfile`
```
web: npm run start
```

#### 修改 `package.json` 添加启动脚本
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  }
}
```

#### 部署到Railway

1. **访问**: https://railway.app/
2. **登录**: 使用GitHub账号
3. **新建项目**: New Project → Deploy from GitHub repo
4. **选择仓库**: LeadPulse/backend
5. **添加PostgreSQL**:
   - 点击 "New" → "Database" → "PostgreSQL"
   - Railway会自动设置 `DATABASE_URL` 环境变量

6. **设置环境变量**:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-super-secret-jwt-key-change-this
   OPENAI_API_KEY=sk-your-openai-api-key
   SENDGRID_API_KEY=SG.your-sendgrid-api-key
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   FROM_EMAIL=noreply@yourdomain.com
   BACKEND_URL=https://your-app.railway.app
   FRONTEND_URL=https://your-app.streamlit.app
   ```

7. **部署**:
   - Railway会自动检测并部署
   - 等待构建完成(约3-5分钟)
   - 获取部署URL: `https://your-app.railway.app`

8. **运行数据库迁移**:
   ```bash
   # 在Railway控制台执行
   npx prisma migrate deploy
   ```

---

### 2️⃣ 部署前端到Streamlit Cloud

#### 准备工作
```bash
cd C:\Users\陈盈桦\Desktop\LeadPulse\streamlit-app
```

#### 创建 `requirements.txt`
```txt
streamlit==1.31.0
pandas==2.1.4
plotly==5.18.0
requests==2.31.0
python-dotenv==1.0.0
```

#### 创建 `.streamlit/config.toml`
```toml
[theme]
primaryColor = "#0ea5e9"
backgroundColor = "#ffffff"
secondaryBackgroundColor = "#f8fafc"
textColor = "#1e293b"
font = "sans serif"

[server]
headless = true
port = 8501
enableCORS = false
enableXsrfProtection = true
```

#### 创建 `config.py`
```python
import os
from dotenv import load_dotenv

load_dotenv()

# 后端API地址
BACKEND_URL = os.getenv('BACKEND_URL', 'https://your-app.railway.app')

# API配置
API_TIMEOUT = 30
```

#### 部署到Streamlit Cloud

1. **访问**: https://streamlit.io/cloud
2. **登录**: 使用GitHub账号
3. **新建应用**: New app
4. **配置**:
   - Repository: `LeadPulse`
   - Branch: `main`
   - Main file path: `streamlit-app/Home.py`
5. **高级设置** → **Secrets**:
   ```toml
   BACKEND_URL = "https://your-app.railway.app"
   ```
6. **部署**: 点击 "Deploy!"
7. **等待**: 约2-3分钟
8. **获取URL**: `https://your-app.streamlit.app`

---

## 🔧 配置API连接

### 修改Streamlit应用连接后端

在 `streamlit-app/Home.py` 顶部添加:

```python
import requests
import os

# 后端API地址
BACKEND_URL = os.getenv('BACKEND_URL', 'https://your-app.railway.app')

def api_request(endpoint, method='GET', data=None):
    """统一API请求函数"""
    url = f"{BACKEND_URL}/api{endpoint}"
    headers = {}

    if 'token' in st.session_state:
        headers['Authorization'] = f"Bearer {st.session_state.token}"

    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method == 'PUT':
            response = requests.put(url, json=data, headers=headers, timeout=10)
        elif method == 'DELETE':
            response = requests.delete(url, headers=headers, timeout=10)

        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"API请求失败: {e}")
        return None
```

---

## 🌐 自定义域名 (可选)

### Railway自定义域名
1. 进入Railway项目设置
2. Settings → Domains
3. 添加自定义域名: `api.yourdomain.com`
4. 配置DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-app.railway.app
   ```

### Streamlit自定义域名
1. Streamlit Cloud → Settings → Custom domain
2. 添加域名: `app.yourdomain.com`
3. 配置DNS:
   ```
   Type: CNAME
   Name: app
   Value: your-app.streamlit.app
   ```

---

## 📊 监控和日志

### Railway日志
```bash
# 实时查看日志
railway logs --follow
```

### Streamlit日志
- 在Streamlit Cloud控制台查看
- Manage app → Logs

---

## 🔒 安全配置

### 1. 环境变量安全
- ✅ 所有敏感信息使用环境变量
- ✅ 不要提交 `.env` 到Git
- ✅ 定期轮换API密钥

### 2. CORS配置
在 `backend/src/index.ts`:
```typescript
app.use(cors({
  origin: [
    'https://your-app.streamlit.app',
    'http://localhost:8501'
  ],
  credentials: true
}));
```

### 3. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制100个请求
});

app.use('/api/', limiter);
```

---

## 💰 成本估算

| 服务 | 免费额度 | 付费价格 |
|------|---------|---------|
| **Streamlit Cloud** | 1个公开应用 | $20/月 (私有应用) |
| **Railway** | $5免费额度 | $5/月起 |
| **PostgreSQL** | Railway内置 | 包含在Railway费用中 |
| **SendGrid** | 100封/天 | $19.95/月 (40k封) |
| **OpenAI API** | 按使用付费 | ~$0.03/1k tokens |

**预估月成本**: $0-30 (取决于使用量)

---

## 🚀 快速部署命令

### 一键部署脚本

创建 `deploy.sh`:
```bash
#!/bin/bash

echo "🚀 开始部署LeadPulse..."

# 1. 部署后端
echo "📦 部署后端到Railway..."
cd backend
railway up

# 2. 运行数据库迁移
echo "🗄️ 运行数据库迁移..."
railway run npx prisma migrate deploy

# 3. 部署前端
echo "🎨 部署前端到Streamlit..."
cd ../streamlit-app
streamlit deploy

echo "✅ 部署完成!"
echo "后端: https://your-app.railway.app"
echo "前端: https://your-app.streamlit.app"
```

运行:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🐛 常见问题

### 1. Railway构建失败
**问题**: `npm install` 失败
**解决**:
```bash
# 删除 package-lock.json 重新生成
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock"
git push
```

### 2. Prisma迁移失败
**问题**: `DATABASE_URL` 未设置
**解决**:
- 确保Railway PostgreSQL已添加
- 检查环境变量 `DATABASE_URL`

### 3. CORS错误
**问题**: 前端无法访问后端API
**解决**:
```typescript
// backend/src/index.ts
app.use(cors({
  origin: '*', // 开发环境
  // origin: 'https://your-app.streamlit.app', // 生产环境
  credentials: true
}));
```

### 4. Streamlit连接超时
**问题**: API请求超时
**解决**:
- 增加 `timeout` 参数
- 检查Railway服务是否运行
- 查看Railway日志

---

## 📚 相关文档

- [Railway文档](https://docs.railway.app/)
- [Streamlit Cloud文档](https://docs.streamlit.io/streamlit-community-cloud)
- [Prisma部署指南](https://www.prisma.io/docs/guides/deployment)
- [SendGrid文档](https://docs.sendgrid.com/)

---

## ✅ 部署检查清单

- [ ] Railway账号已创建
- [ ] Streamlit Cloud账号已创建
- [ ] GitHub仓库已创建并推送代码
- [ ] 后端环境变量已配置
- [ ] PostgreSQL数据库已添加
- [ ] 数据库迁移已运行
- [ ] 后端API可访问
- [ ] 前端已部署
- [ ] 前端可访问后端API
- [ ] CORS配置正确
- [ ] SendGrid API密钥已配置
- [ ] OpenAI API密钥已配置
- [ ] 测试邮件发送功能
- [ ] 测试AI生成功能

---

**部署完成后,您的LeadPulse就可以上线使用了! 🎉**
