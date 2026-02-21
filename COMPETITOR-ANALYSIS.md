# 🔥 AI获客竞品分析 + 可直接借鉴的代码

## 📊 GitHub高星竞品分析

### 🎯 AI销售自动化类

#### 1. **Twenty CRM** (39.9k⭐) - 最强竞品
- **项目**: https://github.com/twentyhq/twenty
- **定位**: Salesforce的开源替代品
- **技术栈**:
  - 前端: React + TypeScript
  - 后端: NestJS + PostgreSQL
  - 实时: GraphQL subscriptions
- **核心功能**:
  - 完整的CRM系统
  - 销售管道管理
  - 邮件集成
  - 任务自动化
- **可借鉴**:
  - UI设计非常现代化
  - 数据库Schema设计
  - GraphQL API架构
  - 实时更新机制

#### 2. **Krayin Laravel CRM** (21.5k⭐) - 开源CRM
- **项目**: https://github.com/krayin/laravel-crm
- **定位**: 中小企业CRM
- **技术栈**: Laravel + Vue.js
- **核心功能**:
  - Lead管理
  - 销售自动化
  - 邮件追踪
  - 报表分析
- **可借鉴**:
  - Lead生命周期管理
  - 邮件模板系统
  - 权限管理

#### 3. **EspoCRM** (2.8k⭐) - 邮件营销强
- **项目**: https://github.com/espocrm/espocrm
- **定位**: 开源CRM + 邮件营销
- **核心功能**:
  - **邮件营销** ✅
  - **邮件追踪** ✅
  - Lead评分
  - 客户门户
- **可借鉴**:
  - 邮件追踪实现
  - 营销自动化工作流
  - 客户门户设计

---

### 🤖 AI + 销售自动化

#### 4. **awesome-llm-apps** (多个AI销售项目)
- **项目**: https://github.com/Shubhamsaboo/awesome-llm-apps
- **包含**: AI Sales Intelligence Agent Team
- **技术栈**:
  - LangChain / CrewAI
  - OpenAI GPT-4
  - RAG (向量数据库)
- **核心功能**:
  - 多Agent协作
  - 客户对话
  - 产品推荐
  - 销售策略生成
- **可借鉴**:
  - Multi-Agent架构
  - RAG实现
  - 对话管理

---

### 🔍 LinkedIn数据抓取

#### 5. **linkedin_scraper** (3.7k⭐) - Python爬虫
- **项目**: https://github.com/joeyism/linkedin_scraper
- **技术栈**:
  - Playwright (异步)
  - Pydantic (数据模型)
- **核心功能**:
  - 个人资料抓取
  - 公司信息抓取
  - 职位搜索
  - 会话持久化
- **关键代码**:
```python
# 登录
await login_with_credentials(
    browser.page,
    username=os.getenv("LINKEDIN_EMAIL"),
    password=os.getenv("LINKEDIN_PASSWORD")
)

# 抓取个人资料
scraper = PersonScraper(browser.page)
person = await scraper.scrape("https://linkedin.com/in/username/")

# 数据结构
class Person:
    name: str
    headline: str
    location: str
    about: str
    experiences: List[Experience]
    educations: List[Education]
    skills: List[str]
```

#### 6. **JobSpy** (2.8k⭐) - 多平台职位抓取
- **项目**: https://github.com/Bunsly/JobSpy
- **支持平台**: LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter
- **可借鉴**: 多平台抓取架构

#### 7. **CrossLinked** (1.5k⭐) - 员工信息枚举
- **项目**: https://github.com/m8sec/CrossLinked
- **功能**: 从公司提取员工名单
- **可借鉴**: 批量数据提取

---

## 🎓 留学行业可借鉴的项目

### 教育CRM类

#### 8. **ERPNext** (31.9k⭐) - 包含教育模块
- **项目**: https://github.com/frappe/erpnext
- **包含**:
  - 学生管理
  - 课程管理
  - 招生管理
  - 费用管理
- **可借鉴**:
  - 学生生命周期管理
  - 招生流程设计
  - 费用计算逻辑

---

## 💡 直接可用的代码片段

### 1. LinkedIn自动登录 (Python)

```python
from playwright.async_api import async_playwright
import json

async def linkedin_login(email, password):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 访问登录页
        await page.goto('https://www.linkedin.com/login')

        # 输入凭证
        await page.fill('#username', email)
        await page.fill('#password', password)
        await page.click('button[type="submit"]')

        # 等待登录完成
        await page.wait_for_url('**/feed/**')

        # 保存会话
        cookies = await page.context.cookies()
        with open('linkedin_session.json', 'w') as f:
            json.dump(cookies, f)

        return browser, page

# 使用
browser, page = await linkedin_login('your@email.com', 'password')
```

### 2. 搜索潜在客户 (Python)

```python
async def search_leads(page, keywords, location, limit=50):
    # 构建搜索URL
    search_url = f"https://www.linkedin.com/search/results/people/?keywords={keywords}&location={location}"
    await page.goto(search_url)

    leads = []

    # 滚动加载
    for _ in range(limit // 10):
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        await page.wait_for_timeout(2000)

    # 提取数据
    results = await page.query_selector_all('.reusable-search__result-container')

    for result in results[:limit]:
        name = await result.query_selector('.entity-result__title-text')
        title = await result.query_selector('.entity-result__primary-subtitle')
        company = await result.query_selector('.entity-result__secondary-subtitle')

        leads.append({
            'name': await name.inner_text() if name else '',
            'title': await title.inner_text() if title else '',
            'company': await company.inner_text() if company else ''
        })

    return leads
```

### 3. AI邮件生成 (Python + OpenAI)

```python
from openai import OpenAI

def generate_email(lead_info, product_info):
    client = OpenAI(api_key='your-key')

    prompt = f"""
    生成一封留学咨询邮件:

    学生信息:
    - 姓名: {lead_info['name']}
    - 目标国家: {lead_info['country']}
    - 目标学历: {lead_info['degree']}
    - 专业: {lead_info['major']}

    机构信息:
    - 名称: {product_info['institution']}
    - 优势: {product_info['advantages']}

    要求:
    1. 专业、友好的语气
    2. 突出机构优势
    3. 包含明确的CTA
    4. 200字左右
    """

    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "你是一个专业的留学顾问"},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message.content
```

### 4. 邮件追踪 (Node.js)

```javascript
// 追踪像素
app.get('/track/:emailId/open', async (req, res) => {
  const { emailId } = req.params;

  // 记录打开
  await db.email.update({
    where: { id: emailId },
    data: {
      openedAt: new Date(),
      opens: { increment: 1 }
    }
  });

  // 返回1x1透明像素
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length
  });
  res.end(pixel);
});

// 链接追踪
app.get('/track/:emailId/click', async (req, res) => {
  const { emailId } = req.params;
  const { url } = req.query;

  // 记录点击
  await db.email.update({
    where: { id: emailId },
    data: {
      clickedAt: new Date(),
      clicks: { increment: 1 }
    }
  });

  // 重定向
  res.redirect(url);
});
```

### 5. 批量发送邮件 (Node.js + Nodemailer)

```javascript
const nodemailer = require('nodemailer');

async function sendBulkEmails(leads, template) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });

  for (const lead of leads) {
    // 个性化邮件
    const email = template
      .replace('{{name}}', lead.name)
      .replace('{{country}}', lead.country);

    // 添加追踪
    const trackingPixel = `<img src="${process.env.BACKEND_URL}/track/${lead.id}/open" width="1" height="1" />`;

    await transporter.sendMail({
      from: 'noreply@yourdomain.com',
      to: lead.email,
      subject: '关于您的留学申请规划',
      html: email + trackingPixel
    });

    // 延迟避免被标记为垃圾邮件
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

---

## 🎯 针对留学机构的实战方案

### 方案1: 小红书/知乎数据抓取

**目标**: 抓取留学相关帖子下的评论用户

```python
# 小红书爬虫 (需要处理反爬)
import requests
from bs4 import BeautifulSoup

def scrape_xiaohongshu_comments(post_url):
    # 使用代理和headers
    headers = {
        'User-Agent': 'Mozilla/5.0...',
        'Cookie': 'your_cookies'
    }

    response = requests.get(post_url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')

    # 提取评论用户
    comments = soup.find_all('div', class_='comment-item')

    leads = []
    for comment in comments:
        username = comment.find('span', class_='username').text
        content = comment.find('div', class_='content').text

        # 判断是否有留学意向
        if any(keyword in content for keyword in ['留学', '申请', '托福', '雅思']):
            leads.append({
                'username': username,
                'platform': '小红书',
                'interest': '留学'
            })

    return leads
```

### 方案2: 微信公众号自动回复

```python
# 使用itchat或wechaty
import itchat

@itchat.msg_register(itchat.content.TEXT)
def text_reply(msg):
    keywords = ['留学', '出国', '申请']

    if any(keyword in msg['Text'] for keyword in keywords):
        # 自动回复
        return """
        您好!我是XX留学的顾问老师。

        看到您对留学感兴趣,我们可以为您提供:
        • 免费背景评估
        • 院校推荐
        • 申请规划

        添加微信: xxx 获取详细咨询
        """

itchat.auto_login()
itchat.run()
```

### 方案3: 抖音/B站评论区挖掘

```python
# 使用Selenium抓取视频评论
from selenium import webdriver

def scrape_douyin_comments(video_url):
    driver = webdriver.Chrome()
    driver.get(video_url)

    # 滚动加载评论
    for _ in range(10):
        driver.execute_script('window.scrollTo(0, document.body.scrollHeight)')
        time.sleep(2)

    # 提取评论
    comments = driver.find_elements_by_class_name('comment-item')

    leads = []
    for comment in comments:
        text = comment.text
        if '留学' in text or '申请' in text:
            leads.append({
                'content': text,
                'platform': '抖音'
            })

    return leads
```

---

## 🚀 立即可用的完整方案

### 留学机构获客自动化流程

```python
# main.py - 完整流程

import asyncio
from linkedin_scraper import search_leads
from ai_email import generate_email
from email_sender import send_bulk_emails

async def main():
    # 1. 从LinkedIn搜索潜在客户
    leads = await search_leads(
        keywords="留学 OR study abroad",
        location="中国",
        limit=100
    )

    # 2. 过滤和评分
    qualified_leads = []
    for lead in leads:
        # 简单评分逻辑
        score = 0
        if '学生' in lead['title']: score += 10
        if '家长' in lead['title']: score += 15
        if lead['location'] in ['北京', '上海', '深圳']: score += 5

        if score >= 10:
            qualified_leads.append(lead)

    # 3. AI生成个性化邮件
    emails = []
    for lead in qualified_leads:
        email_content = generate_email(
            lead_info=lead,
            product_info={
                'institution': 'XX留学',
                'advantages': '300+成功案例, TOP30录取率85%'
            }
        )
        emails.append({
            'to': lead['email'],
            'subject': f"关于{lead['name']}的留学规划",
            'body': email_content
        })

    # 4. 批量发送
    await send_bulk_emails(emails)

    print(f"✅ 成功发送 {len(emails)} 封邮件")

if __name__ == '__main__':
    asyncio.run(main())
```

---

## 📚 推荐学习资源

### GitHub项目
1. **Twenty CRM**: https://github.com/twentyhq/twenty
2. **linkedin_scraper**: https://github.com/joeyism/linkedin_scraper
3. **awesome-llm-apps**: https://github.com/Shubhamsaboo/awesome-llm-apps
4. **EspoCRM**: https://github.com/espocrm/espocrm

### 技术文档
- Playwright文档: https://playwright.dev/
- LangChain文档: https://python.langchain.com/
- Nodemailer文档: https://nodemailer.com/

---

## ⚠️ 法律和道德注意事项

1. **LinkedIn抓取**:
   - 遵守LinkedIn服务条款
   - 不要过度频繁请求
   - 使用代理和延迟

2. **邮件发送**:
   - 遵守反垃圾邮件法
   - 提供退订选项
   - 不要购买邮件列表

3. **数据隐私**:
   - 遵守GDPR/个人信息保护法
   - 安全存储用户数据
   - 获得必要的同意

---

**Sources:**
- [Twenty CRM GitHub](https://github.com/twentyhq/twenty)
- [Krayin Laravel CRM](https://github.com/krayin/laravel-crm)
- [EspoCRM](https://github.com/espocrm/espocrm)
- [linkedin_scraper](https://github.com/joeyism/linkedin_scraper)
- [awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps)
- [JobSpy](https://github.com/Bunsly/JobSpy)
- [CrossLinked](https://github.com/m8sec/CrossLinked)
