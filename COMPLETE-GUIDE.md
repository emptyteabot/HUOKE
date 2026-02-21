# 🚀 GuestSeek 完整部署指南

## 📋 已完成功能

### ✅ 第1阶段 (已完成)
1. **Supabase数据库集成** - 数据持久化 ✅
2. **用户认证系统** - 注册/登录/JWT ✅
3. **学生线索管理** - CRUD操作 ✅
4. **AI邮件生成** - GPT-5.2集成 ✅
5. **数据统计** - 基础Dashboard ✅
6. **真实邮件发送** - SendGrid集成 ✅
7. **批量邮件发送** - 一键群发 ✅

### 🔄 第2阶段 (进行中)
8. **邮件追踪** - 打开率/点击率
9. **自动化工作流** - 自动跟进
10. **多平台获客** - LinkedIn/小红书/知乎
11. **桌面应用打包** - Electron

---

## 🎯 部署步骤

### 第1步: 配置Supabase数据库

1. **访问**: https://supabase.com/
2. **登录**: 使用GitHub账号
3. **创建项目**:
   - Project name: `guestseek`
   - Database Password: 设置强密码(记住!)
   - Region: `Singapore`
4. **创建数据库表**:
   - 左侧菜单 → SQL Editor
   - 复制 `database-schema.sql` 的内容
   - 点击 "Run"
5. **获取连接信息**:
   - Settings → API
   - 复制 `Project URL`: `https://xxx.supabase.co`
   - 复制 `anon public key`: `eyJxxx...`

---

### 第2步: 配置Streamlit Secrets

在Streamlit Cloud部署设置中,添加Secrets:

```toml
# Supabase配置
SUPABASE_URL = "https://xxx.supabase.co"
SUPABASE_KEY = "eyJxxx..."

# OpenAI配置
OPENAI_API_KEY = "sk-MRhl7sGPXCYtqtDx49fxuzv3SjbxrJlUza9ylZjlMTHYz0wu"
OPENAI_BASE_URL = "https://oneapi.gemiaude.com/v1"

# JWT配置
JWT_SECRET = "guestseek-super-secret-key-2024-change-this"

# SendGrid配置 (必填 - 用于发送邮件)
SENDGRID_API_KEY = "SG.xxxx"
FROM_EMAIL = "noreply@yourdomain.com"
```

**重要**:
1. 访问 https://sendgrid.com/ 注册账号
2. 创建API Key: Settings → API Keys → Create API Key
3. 验证发件人邮箱: Settings → Sender Authentication
4. 免费版每天可发送100封邮件

---

### 第3步: 部署到Streamlit Cloud

1. **访问**: https://streamlit.io/cloud
2. **New app**:
   - Repository: `emptyteabot/HUOKE`
   - Branch: `main`
   - Main file: `streamlit-app/Home.py`
3. **Advanced settings** → 添加上面的Secrets
4. **Deploy!**

---

## 📱 使用指南

### 1. 注册账号

1. 访问你的Streamlit应用
2. 点击"注册"
3. 填写:
   - 姓名: 你的名字
   - 公司: 你的留学机构名称
   - 邮箱: 你的邮箱
   - 密码: 至少8位
4. 点击"注册"

### 2. 登录

1. 使用注册的邮箱和密码登录
2. 进入主界面

### 3. 添加学生

1. 点击"学生管理"卡片
2. 填写学生信息:
   - 姓名、邮箱、电话
   - 目标国家、学历、专业
   - 预算范围
3. 点击"添加学生"
4. 学生信息会保存到Supabase数据库

### 4. AI生成邮件

1. 点击"AI生成邮件"卡片
2. 选择学生
3. 选择邮件类型
4. 填写机构信息
5. 点击"生成邮件"
6. AI会自动生成个性化邮件
7. 可以选择:
   - **📋 复制**: 复制邮件内容
   - **💾 保存草稿**: 保存到数据库
   - **📧 立即发送**: 直接发送给家长

### 5. 批量发送邮件

1. 点击"批量发送"卡片
2. 勾选要发送的学生(可多选)
3. 填写邮件模板:
   - 支持变量: {name}, {institution}, {consultant}, {target_country}, {target_degree}
4. 点击"批量发送"
5. 系统会自动:
   - 为每个学生生成个性化邮件
   - 发送邮件
   - 保存发送记录
   - 显示发送结果

### 6. 查看数据

1. 点击"数据分析"卡片
2. 查看:
   - 学生线索数量
   - 生成邮件数量
   - 打开率、点击率(即将上线)

---

## 🎯 下一步开发计划

### 本周完成 (2-3天)

1. ✅ **真实邮件发送**
   - ✅ 集成SendGrid
   - ✅ 一键发送邮件
   - ✅ 批量发送

2. **邮件追踪**
   - 追踪打开率
   - 追踪点击率
   - 实时通知

3. **优化UI**
   - 更流畅的动画
   - 更好的交互
   - 移动端适配

### 下周完成 (3-5天)

4. **自动化工作流**
   - 3天未回复自动跟进
   - 7天未回复发优惠
   - 高意向自动提醒

5. **数据分析增强**
   - 转化漏斗
   - ROI计算
   - 导出报表

6. **团队协作**
   - 多账号管理
   - 权限控制
   - 任务分配

### 下下周完成 (5-7天)

7. **多平台获客**
   - LinkedIn自动抓取
   - 小红书监控
   - 知乎监控

8. **桌面应用**
   - 打包成Windows应用
   - 打包成Mac应用
   - 离线使用

---

## 💰 定价策略

### 免费版 (当前)
- ✅ 50个学生线索
- ✅ 100封AI邮件/月
- ✅ 基础数据分析

### 专业版 (¥999/月)
- ✅ 500个学生线索
- ✅ 2,000封AI邮件/月
- ✅ 邮件追踪
- ✅ 自动化工作流
- ✅ 高级数据分析

### 企业版 (¥2,999/月)
- ✅ 无限学生线索
- ✅ 无限AI邮件
- ✅ 多平台获客
- ✅ 团队协作
- ✅ 优先支持

---

## 🎯 给你的留学机构使用

### 场景1: 日常咨询

```
1. 家长在小红书留言咨询
2. 你添加学生信息到GuestSeek
3. AI生成"首次咨询邮件"
4. 复制邮件发送给家长
5. 系统自动追踪打开率
6. 3天未回复自动提醒你跟进
```

### 场景2: 批量营销

```
1. 从LinkedIn抓取100个潜在客户
2. 批量导入到GuestSeek
3. AI为每个客户生成个性化邮件
4. 一键批量发送
5. 实时查看打开率/点击率
6. 高意向客户自动标记
```

### 场景3: 数据分析

```
1. 查看本月新增学生数
2. 查看邮件打开率趋势
3. 计算ROI
4. 导出报表给老板
```

---

## 📞 技术支持

### 遇到问题?

1. **数据库连接失败**
   - 检查Supabase URL和Key是否正确
   - 检查数据库表是否创建成功

2. **AI生成失败**
   - 检查OpenAI API Key是否正确
   - 检查API额度是否充足

3. **登录失败**
   - 检查邮箱密码是否正确
   - 尝试重新注册

---

## 🚀 下一步

1. **完成注册和登录**
2. **添加5-10个学生测试**
3. **生成几封邮件测试**
4. **给我反馈,我继续优化**

---

**开始使用GuestSeek,让AI帮你10倍提升获客效率! 🎉**
