-- GuestSeek 数据库表结构
-- 在Supabase SQL Editor中执行

-- 1. 用户表
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    company VARCHAR(200),
    role VARCHAR(50) DEFAULT 'user',
    plan VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 学生线索表
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    target_country VARCHAR(100),
    target_degree VARCHAR(100),
    major VARCHAR(200),
    budget VARCHAR(100),
    language_score VARCHAR(200),
    gpa VARCHAR(50),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'new',
    score INTEGER DEFAULT 0,
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. 邮件表
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    device_info JSONB,
    click_device_info JSONB,
    clicked_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 邮件模板表
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100),
    subject VARCHAR(500),
    body TEXT,
    variables JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 自动化工作流表
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    trigger_type VARCHAR(100),
    trigger_conditions JSONB,
    actions JSONB,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 活动日志表
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
    action VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 7. 数据抓取记录表
CREATE TABLE scraping_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(100),
    keywords TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    results_count INTEGER DEFAULT 0,
    results JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);

CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_lead_id ON emails(lead_id);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_created_at ON emails(created_at);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 启用行级安全 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_jobs ENABLE ROW LEVEL SECURITY;

-- RLS策略: 用户只能访问自己的数据
CREATE POLICY "Users can view own data" ON leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON leads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON leads
    FOR DELETE USING (auth.uid() = user_id);

-- 对其他表应用相同策略
CREATE POLICY "Users can view own emails" ON emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own templates" ON email_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON email_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own workflows" ON workflows
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflows" ON workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own scraping jobs" ON scraping_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scraping jobs" ON scraping_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
