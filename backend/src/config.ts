export const config = {
  // 数据库
  database: {
    url: process.env.DATABASE_URL || ''
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'leadpulse-super-secret-jwt-key-2024-production-secure'
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  },

  // 邮件
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: process.env.SMTP_USER || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@leadpulse.ai'
  },

  // 应用
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8501'
  },

  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
  }
};
