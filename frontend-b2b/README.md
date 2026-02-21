# LeadPulse B2B Frontend

AI驱动的B2B获客平台 - 前端应用

## 功能特性

- 🔐 用户认证(登录/注册)
- 📊 数据仪表盘
- 👥 潜在客户管理
- ✉️ 邮件历史追踪
- 🤖 AI邮件生成
- 📈 实时统计数据

## 技术栈

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Axios
- Lucide Icons

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 页面结构

- `/` - 登录页面
- `/register` - 注册页面
- `/dashboard` - 主仪表盘
- `/dashboard/leads` - 潜在客户管理
- `/dashboard/emails` - 邮件历史
- `/dashboard/ai` - AI邮件生成

## 构建生产版本

```bash
npm run build
npm start
```

## 部署

推荐使用 Vercel 部署:

```bash
vercel
```

或使用其他支持 Next.js 的平台。
