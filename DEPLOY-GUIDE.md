# 🚀 LeadPulse - 云端部署完整指南

基于GitHub高星项目最佳实践的部署方案

## 📊 参考的高星项目

本项目参考了以下GitHub高星项目的设计和部署方案:

1. **[streamlit/streamlit](https://github.com/streamlit/streamlit)** (43.6k⭐)
   - 官方最佳实践
   - 多页面架构设计

2. **[run-llama/rags](https://github.com/run-llama/rags)** (6.5k⭐)
   - 配置管理模式
   - 状态持久化方案

3. **[langchain-ai/streamlit-agent](https://github.com/langchain-ai/streamlit-agent)**
   - UI组件使用
   - 实时反馈设计

---

## 🌐 部署方案对比

| 方案 | 成本 | 难度 | 速度 | 推荐度 |
|------|------|------|------|--------|
| Streamlit Cloud | 免费 | ⭐ | 5分钟 | ⭐⭐⭐⭐⭐ |
| Railway | $5/月 | ⭐⭐ | 10分钟 | ⭐⭐⭐⭐ |
| Vercel | 免费 | ⭐⭐⭐ | 15分钟 | ⭐⭐⭐ |
| Docker | 自定义 | ⭐⭐⭐⭐ | 30分钟 | ⭐⭐ |

---

## 🎯 方案1: Streamlit Cloud (推荐)

### 优势
- ✅ 完全免费
- ✅ 自动获得HTTPS
- ✅ 自动部署
- ✅ 无需服务器管理

### 步骤

#### 1. 准备GitHub仓库

```bash
cd C:\Users\陈盈桦\Desktop\LeadPulse

# 初始化Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "LeadPulse - AI驱动的B2B获客平台"

# 连接GitHub (替换为你的仓库地址)
git remote add origin https://github.com/你的用户名/leadpulse.git

# 推送
git push -u origin main
```

#### 2. 部署到Streamlit Cloud

1. 访问: https://share.streamlit.io/
2. 点击 **"New app"**
3. 选择你的GitHub仓库
4. 配置:
   - **Repository**: `你的用户名/leadpulse`
   - **Branch**: `main`
   - **Main file path**: `streamlit-app/Home.py`
5. 点击 **"Deploy"**

#### 3. 配置Secrets

在Streamlit Cloud的 **Settings -> Secrets** 中添加:

```toml
API_URL = "https://your-backend-api.railway.app/api"
OPENAI_API_KEY = "sk-..."
SENDGRID_API_KEY = "SG..."
```

#### 4. 完成!

你的应用会部署到: `https://leadpulse-你的用户名.streamlit.app`

---

## 🚂 方案2: Railway (后端推荐)

### 部署后端API

#### 1. 访问Railway

https://railway.app/

#### 2. 创建新项目

1. 点击 **"New Project"**
2. 选择 **"Deploy from GitHub repo"**
3. 选择你的仓库
4. Railway会自动检测到Node.js项目

#### 3. 配置环境变量

在Railway的 **Variables** 中添加:

```env
DATABASE_URL=postgresql://...  (Railway自动提供)
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
BACKEND_URL=https://your-app.railway.app
FROM_EMAIL=noreply@leadpulse.ai
NODE_ENV=production
```

#### 4. 添加PostgreSQL数据库

1. 在项目中点击 **"New"**
2. 选择 **"Database" -> "PostgreSQL"**
3. Railway会自动连接数据库

#### 5. 部署

Railway会自动部署,你会得到一个URL:
`https://your-app.railway.app`

---

## 🐳 方案3: Docker部署

### 创建Dockerfile

```dockerfile
# streamlit-app/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8501

CMD ["streamlit", "run", "Home.py", "--server.port=8501", "--server.address=0.0.0.0"]
```

### 构建和运行

```bash
cd streamlit-app

# 构建镜像
docker build -t leadpulse-frontend .

# 运行容器
docker run -p 8501:8501 leadpulse-frontend
```

### Docker Compose (前后端一起)

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/leadpulse
      - JWT_SECRET=your-secret
    depends_on:
      - db

  frontend:
    build: ./streamlit-app
    ports:
      - "8501:8501"
    environment:
      - API_URL=http://backend:3001/api
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=leadpulse
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

运行:
```bash
docker-compose up -d
```

---

## 🔧 完整部署架构

```
用户浏览器
    ↓
Streamlit Cloud (前端)
https://leadpulse.streamlit.app
    ↓
Railway (后端API)
https://leadpulse-api.railway.app
    ↓
Railway PostgreSQL (数据库)
```

---

## 💰 成本估算

### 免费方案
- **Streamlit Cloud**: 免费
- **Railway**: $5免费额度
- **总计**: $0/月 (小规模使用)

### 付费方案
- **Streamlit Cloud**: 免费
- **Railway**: $20/月 (生产环境)
- **总计**: $20/月

---

## 🎯 部署检查清单

### 前端 (Streamlit)
- [ ] 代码推送到GitHub
- [ ] Streamlit Cloud部署成功
- [ ] Secrets配置完成
- [ ] 自定义域名绑定 (可选)

### 后端 (Railway)
- [ ] 后端代码推送到GitHub
- [ ] Railway项目创建
- [ ] PostgreSQL数据库添加
- [ ] 环境变量配置
- [ ] 数据库迁移完成

### 测试
- [ ] 前端可以访问
- [ ] 登录功能正常
- [ ] API连接成功
- [ ] AI生成功能正常
- [ ] 邮件发送功能正常

---

## 🚀 一键部署脚本

```bash
#!/bin/bash

echo "🚀 LeadPulse 一键部署"
echo "===================="

# 1. 推送到GitHub
echo "📤 推送代码到GitHub..."
git add .
git commit -m "Deploy LeadPulse"
git push origin main

# 2. 提示部署Streamlit
echo ""
echo "✅ 代码已推送!"
echo ""
echo "📋 下一步:"
echo "1. 访问: https://share.streamlit.io/"
echo "2. 点击 'New app'"
echo "3. 选择仓库: streamlit-app/Home.py"
echo "4. 点击 'Deploy'"
echo ""
echo "🎉 完成后你会得到公网地址!"
```

---

## 📊 性能优化

### Streamlit优化
```python
# 使用缓存
@st.cache_data(ttl=3600)
def load_data():
    return fetch_from_api()

# 懒加载
if st.button("加载数据"):
    data = load_data()
```

### Railway优化
- 启用自动扩展
- 配置健康检查
- 使用CDN加速

---

## 🔒 安全建议

1. **环境变量**: 永远不要提交API密钥到Git
2. **HTTPS**: 使用Streamlit Cloud自动获得HTTPS
3. **认证**: 实现JWT token认证
4. **限流**: 在后端添加API限流

---

## 📞 获取帮助

- Streamlit文档: https://docs.streamlit.io/
- Railway文档: https://docs.railway.app/
- GitHub Issues: 提交问题到仓库

---

**恭喜!** 🎉

你现在有一个部署在云端的AI SaaS产品了!

**下一步**:
1. 分享你的应用链接
2. 收集用户反馈
3. 持续优化产品
4. 开始赚钱! 💰
