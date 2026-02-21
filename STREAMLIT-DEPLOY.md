# 🚀 LeadPulse - Streamlit云端部署指南

## 立即部署到公网 (3分钟完成)

### 方案1: Streamlit Cloud (推荐 - 完全免费)

1. **准备GitHub仓库**
```bash
cd C:\Users\陈盈桦\Desktop\LeadPulse
git init
git add .
git commit -m "LeadPulse initial commit"
git remote add origin https://github.com/你的用户名/leadpulse.git
git push -u origin main
```

2. **部署前端**
- 访问: https://share.streamlit.io/
- 点击 "New app"
- 选择你的GitHub仓库
- Main file path: `streamlit-app/app.py`
- 点击 "Deploy"

**完成! 你会得到一个公网地址: `https://leadpulse.streamlit.app`**

3. **部署后端到Railway**
- 访问: https://railway.app/
- 连接GitHub
- 选择 `backend` 目录
- 添加PostgreSQL数据库
- 配置环境变量
- 自动部署

**完成! 你会得到后端API地址: `https://your-app.railway.app`**

4. **连接前后端**
在Streamlit Cloud的Settings -> Secrets中添加:
```toml
API_URL = "https://your-app.railway.app/api"
```

---

## 方案2: 本地快速测试

### 启动后端
```bash
cd backend
npm run dev
```

### 启动Streamlit前端
```bash
cd streamlit-app
streamlit run app.py
```

访问自动打开的浏览器窗口

---

## 完整部署架构

```
用户浏览器
    ↓
Streamlit Cloud (前端)
https://leadpulse.streamlit.app
    ↓
Railway (后端API)
https://your-app.railway.app
    ↓
Railway PostgreSQL (数据库)
```

---

## 成本

- **Streamlit Cloud**: 免费
- **Railway**:
  - 免费额度: $5/月
  - 足够运行小规模应用
  - 付费: $5起/月

**总成本: $0-5/月** 🎉

---

## 下一步

1. 部署到云端获得公网地址
2. 分享给潜在客户测试
3. 收集反馈优化产品
4. 开始收费!

**现在你有一个可以立即访问的在线产品了!** 🚀
