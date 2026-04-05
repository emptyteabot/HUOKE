# LeadPulse Growth Frontend

这是 `LeadPulse` 当前最适合直接开卖的前台站点。

它现在不是单纯的登录页，而是一个可上线的设计伙伴 + 实验页 + 经营看板站点，负责：

- 解释 LeadPulse 卖什么
- 展示自用自增长 proof
- 提供免费获客体检工具
- 承接 3 个垂直测试页
- 接收设计伙伴申请
- 把申请写入本地 intake 或转发到 webhook
- 展示经营看板、广告素材库、合规词库
- 保留 `/login` 作为旧后台入口

## 页面结构

- `/`：设计伙伴销售页
- `/book`：预约页
- `/pay`：付款页
- `/experiments`：实验页列表
- `/experiments/[slug]`：垂直测试页
- `/ops`：经营看板
- `/register`：独立申请页
- `/login`：后台登录页
- `/dashboard`：原有后台

## 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 `http://localhost:3000`

## 关键环境变量

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_BOOKING_URL=https://cal.com/your-handle/leadpulse
NEXT_PUBLIC_SUPPORT_EMAIL=hello@leadpulse.ai
NEXT_PUBLIC_TRIAL_PAYMENT_URL=
NEXT_PUBLIC_STANDARD_PAYMENT_URL=
NEXT_PUBLIC_DFY_PAYMENT_URL=
LEADPULSE_INTAKE_WEBHOOK_URL=
LEADPULSE_SLACK_WEBHOOK_URL=
LEADPULSE_FEISHU_WEBHOOK_URL=
LEADPULSE_GOOGLE_APPS_SCRIPT_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## 设计伙伴申请写到哪里

- 本地开发：`../data/intake/design_partner_applications.json`
- 生产环境：推荐至少配置一个 webhook，把申请转发到你的通知或 CRM

## 支持的通知扇出

- `LEADPULSE_INTAKE_WEBHOOK_URL`：通用 JSON webhook
- `LEADPULSE_SLACK_WEBHOOK_URL`：Slack Incoming Webhook
- `LEADPULSE_FEISHU_WEBHOOK_URL`：飞书机器人 webhook
- `LEADPULSE_GOOGLE_APPS_SCRIPT_URL`：Google Apps Script Web App

## 启动码开通

- `/pay` 现在展示收款码和站内兑换入口，不再伪装成自动 Stripe 收款
- 用户付款后获取对应方案的启动码，再去 `/redeem` 或直接在 `/pay` 右侧输入启动码
- 生产环境至少要配置：
  - `LEADPULSE_REDEEM_CODES`
  - `NEXT_PUBLIC_SITE_URL`

## 支持的收款入口

- `NEXT_PUBLIC_TRIAL_PAYMENT_URL`
- `NEXT_PUBLIC_STANDARD_PAYMENT_URL`
- `NEXT_PUBLIC_DFY_PAYMENT_URL`

这些链接会直接显示在价格卡和申请成功状态里。

## Render 部署

仓库根目录已经提供 `render.yaml`，默认会把 `frontend-b2b` 作为一个 Node Web Service 部署。

部署前至少填：

- `NEXT_PUBLIC_BOOKING_URL`
- `NEXT_PUBLIC_TRIAL_PAYMENT_URL`
- `LEADPULSE_SLACK_WEBHOOK_URL` 或 `LEADPULSE_FEISHU_WEBHOOK_URL`

## 构建

```bash
npm run build
npm run start
```
