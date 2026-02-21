# 🚀 LeadPulse 快速启动指南

## ⚡ 5分钟快速启动

### 前置要求
- Node.js 18+
- PostgreSQL 15+ (或使用Railway免费数据库)
- OpenAI API Key (https://platform.openai.com/api-keys)

---

## 📦 安装步骤

### 1. 克隆项目
```bash
cd ~/Desktop/LeadPulse
```

### 2. 后端设置

```bash
cd backend

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env

# 编辑.env文件，填入以下信息：
# - DATABASE_URL (PostgreSQL连接字符串)
# - OPENAI_API_KEY (你的OpenAI API密钥)
# - JWT_SECRET (随机字符串，至少32位)
```

### 3. 数据库设置

**选项A：本地PostgreSQL**
```bash
# 创建数据库
createdb leadpulse

# 运行迁移
npx prisma migrate dev

# 生成Prisma Client
npx prisma generate
```

**选项B：Railway云数据库（推荐）**
```bash
# 1. 访问 https://railway.app
# 2. 创建新项目 → 添加PostgreSQL
# 3. 复制DATABASE_URL到.env
# 4. 运行迁移
npx prisma migrate deploy
```

### 4. 启动后端
```bash
npm run dev
```

后端运行在：http://localhost:3001

### 5. 前端设置

```bash
# 新终端
cd ../frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在：http://localhost:3000

---

## 🧪 测试API

### 注册用户
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "company": "Test Company"
  }'
```

### 生成AI邮件
```bash
# 先登录获取token
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3001/api/ai/generate-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "recipientName": "张三",
    "recipientCompany": "阿里巴巴",
    "recipientTitle": "CEO",
    "painPoint": "客户流失率高",
    "productName": "LeadPulse",
    "valueProposition": "降低30%客户流失率",
    "tone": "professional",
    "length": "short"
  }'
```

---

## 🚀 部署到生产环境

### 后端部署（Railway）

1. 访问 https://railway.app
2. 创建新项目
3. 连接GitHub仓库
4. 添加环境变量：
   ```
   DATABASE_URL=<Railway自动提供>
   OPENAI_API_KEY=<你的密钥>
   JWT_SECRET=<生产环境密钥>
   NODE_ENV=production
   ```
5. 自动部署完成

### 前端部署（Vercel）

1. 访问 https://vercel.com
2. 导入GitHub仓库
3. 选择`frontend`目录
4. 添加环境变量：
   ```
   NEXT_PUBLIC_API_URL=<Railway后端URL>
   ```
5. 部署完成

---

## 🔑 获取API密钥

### OpenAI API Key
1. 访问 https://platform.openai.com/api-keys
2. 创建新密钥
3. 复制到`.env`的`OPENAI_API_KEY`

**费用**：
- GPT-4: $0.03/1K tokens (输入), $0.06/1K tokens (输出)
- 每封邮件约500 tokens = $0.045
- $10可以生成约220封邮件

### Stripe API Key
1. 访问 https://dashboard.stripe.com/apikeys
2. 复制测试密钥
3. 添加到`.env`

---

## 📊 数据库管理

### Prisma Studio（可视化管理）
```bash
cd backend
npx prisma studio
```

访问：http://localhost:5555

### 常用命令
```bash
# 创建新迁移
npx prisma migrate dev --name add_new_field

# 重置数据库
npx prisma migrate reset

# 查看数据库状态
npx prisma migrate status
```

---

## 🐛 常见问题

### 1. 数据库连接失败
```
Error: Can't reach database server
```
**解决**：检查PostgreSQL是否运行，DATABASE_URL是否正确

### 2. OpenAI API错误
```
Error: Invalid API key
```
**解决**：检查OPENAI_API_KEY是否正确，是否有余额

### 3. 端口被占用
```
Error: Port 3001 is already in use
```
**解决**：
```bash
# 查找占用端口的进程
lsof -i :3001
# 杀死进程
kill -9 <PID>
```

### 4. Prisma Client未生成
```
Error: @prisma/client did not initialize yet
```
**解决**：
```bash
npx prisma generate
```

---

## 📈 监控与日志

### 开发环境
- 后端日志：终端输出
- 前端日志：浏览器控制台

### 生产环境
- 错误监控：Sentry (https://sentry.io)
- 性能监控：Datadog (https://www.datadoghq.com)
- 日志：Railway自带日志查看

---

## 🔒 安全检查清单

- [ ] 修改JWT_SECRET为强密码
- [ ] 启用HTTPS（生产环境）
- [ ] 设置CORS白名单
- [ ] 启用Rate Limiting
- [ ] 定期备份数据库
- [ ] 监控API使用量
- [ ] 设置Stripe Webhook签名验证

---

## 📞 需要帮助？

- 📧 技术支持：dev@leadpulse.ai
- 📖 文档：https://docs.leadpulse.ai
- 💬 Discord社区：https://discord.gg/leadpulse

---

**祝你开发顺利！** 🚀
