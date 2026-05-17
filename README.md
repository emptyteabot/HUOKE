# LeadPulse - AI驱动的留学获客系统

> 使用Gemini Deep Research + DeepSeek AI,实现信号驱动的精准获客

## 2026-05-17 当前商业方向

- LeadPulse 当前定位：AI 驱动的线索供应商。
- 官网主张：只交付能跟进的高意向客户。
- 当前只盯四个平台：小红书、抖音、推特和 Reddit。
- 当前目标客户：雅思机构、留学中介、跨境电商代运营、出海 B2B、AI 初创、独立开发者和自动化服务团队。
- 吃自己狗粮原则：LeadPulse 必须先给自己找客户；目标从本地快照和已清洗队列里自动筛，不靠人工临时手喂。
- 私信安全原则：任何首触达、回复、跟进、样本交付都必须先通过 `sales/llm_copy_gate.py` 的实时 LLM JSON 审核，再由真人低频发送。
- 详细执行记录见 [`docs/LEADPULSE_EYODF_OUTREACH_PROTOCOL_2026-05-17.md`](./docs/LEADPULSE_EYODF_OUTREACH_PROTOCOL_2026-05-17.md)。

## 🎯 核心功能

### 1. Gemini智能获客
- 使用Gemini Deep Research自动搜索潜在客户
- 从小红书/知乎/豆瓣/微博/论坛抓取真实数据
- 自动提取联系方式(邮箱/微信/手机号)
- 智能评分和优先级排序(S/A/B级)

### 2. 信号驱动触达
- 检测8种留学行业买入信号
- 基于行为信号生成个性化邮件
- 4段式破防文案(信号+痛点+解决方案+CTA)
- 多触点序列营销(Day 1/3/7/14)

### 3. AI邮件营销
- DeepSeek自动生成个性化邮件
- A/B测试优化转化率
- 实时追踪打开率/回复率
- 量化淘汰机制(200次触达止损线)

## 🚀 快速开始

### 第一步: 用Gemini收集客户数据

1. 打开 [Gemini](https://gemini.google.com)
2. 复制 `Gemini获客Prompt工程.md` 中的Prompt
3. 等待Gemini返回150-200个真实客户数据
4. 保存为 `gemini_leads.json`

详细步骤见: [Gemini获客快速开始.md](./Gemini获客快速开始.md)

### 第二步: 导入数据到系统

```bash
# 安装依赖
pip install -r requirements.txt

# 导入Gemini数据
python gemini_data_importer.py --input gemini_leads.json --output leadpulse_leads.json

# 输出:
# ✓ 成功导入: 142 条
#   - S级: 28 条 (立即联系)
#   - A级: 54 条 (3天内)
#   - B级: 60 条 (1周内)
```

### 第三步: 开始发送邮件

```python
from email_auto_sender import EmailAutoSender
import json

# 加载数据
with open('leadpulse_leads.json') as f:
    leads = json.load(f)

# 初始化发送器
sender = EmailAutoSender(
    api_key="你的SendGrid密钥",
    from_email="advisor@studyabroad.com",
    deepseek_api_key="${DEEPSEEK_API_KEY}"
)

# 发送给S级客户
s_leads = [l for l in leads if l['priority'] == 'S']
sender.send_batch(s_leads[:10], sequence_day=1)  # 先测试10个

# 查看效果
report = sender.get_campaign_report()
print(f"打开率: {report['open_rate']}%")
print(f"回复率: {report['reply_rate']}%")
```

## 📊 预期效果

### 30天数据

| 指标 | 数值 |
|------|------|
| 收集客户 | 150-200个 |
| 发送邮件 | 140封 |
| 打开率 | 25-35% |
| 回复率 | 3-5% |
| 咨询人数 | 15-20人 |
| 成交客户 | 4-5人 |
| 营收 | ¥12-15万 |
| 投入成本 | ¥710 |
| ROI | 169-211倍 |

## 📁 核心文件

### Gemini获客系统
- `Gemini获客Prompt工程.md` - 9个专业Prompt模板
- `Gemini获客快速开始.md` - 完整操作指南
- `gemini_data_importer.py` - 数据导入工具

### 邮件营销系统
- `email_auto_sender.py` - 邮件发送引擎(DeepSeek集成)
- `streamlit-app/ai_lead_generator.py` - 客户数据生成器

### 信号驱动系统
- `intent_signal_hijacker.py` - 意图信号检测器
- `signal_driven_outbound.py` - 信号驱动触达引擎
- `data_orchestration_agent.py` - 数据编排代理
- `quantitative_elimination.py` - 量化淘汰机制

### 完整获客流程
- `lead_generation_complete.py` - 端到端获客系统
- `scraper_manager.py` - 多平台爬虫调度器
- `streamlit-app/lead_scoring.py` - AI线索评分系统

### 测试脚本
- `test_signal_system.py` - 测试信号检测
- `test_email_system.py` - 测试邮件发送

### 文档
- `使用说明.md` - 完整使用手册
- `快速开始.md` - 快速入门指南

## 🔧 配置

### 必需配置

1. **DeepSeek API** (已提供)
```bash
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
```

2. **SendGrid API** (需要注册)
```bash
# 访问: https://sendgrid.com
# 免费版每天100封邮件
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

3. **发件人邮箱**
```python
from_email = "advisor@studyabroad.com"  # 必须在SendGrid验证
```

## 💡 核心优势

### 对比传统获客方式

| 项目 | 传统方式 | LeadPulse |
|------|---------|-----------|
| 数据来源 | 购买数据/手动收集 | Gemini自动搜索 |
| 数据质量 | 参差不齐 | AI筛选,质量高 |
| 触达方式 | 群发模板 | 信号驱动个性化 |
| 转化率 | 0.5-1% | 1-2% |
| 时间成本 | 5-10天 | 2-3天 |
| 金钱成本 | ¥5,000-10,000 | ¥710 |
| ROI | 10-20倍 | 169-211倍 |

## 🎓 适用行业

虽然当前聚焦留学行业,但系统可快速适配到:
- 教育培训(语言/职业培训)
- B2B SaaS(企业软件)
- 高端服务(法律/财务咨询)
- 医疗健康(医美/体检)
- 金融服务(保险/理财)

只需修改:
1. Gemini Prompt中的关键词
2. 信号检测规则
3. 邮件文案模板

## 📖 详细文档

- [Gemini获客Prompt工程](./Gemini获客Prompt工程.md) - 9个专业Prompt
- [Gemini获客快速开始](./Gemini获客快速开始.md) - 5步完整流程
- [使用说明](./使用说明.md) - 完整功能手册
- [快速开始](./快速开始.md) - 快速入门

## 🤝 技术支持

遇到问题?
1. 查看 `使用说明.md` 的常见问题部分
2. 运行测试脚本诊断: `python test_signal_system.py`
3. 查看日志: `tail -f logs/system.log`

## 📜 许可证

MIT License

## 🚀 立即开始

```bash
# 1. 克隆项目
git clone https://github.com/你的用户名/LeadPulse.git
cd LeadPulse

# 2. 安装依赖
pip install -r requirements.txt

# 3. 用Gemini收集数据
# 打开 Gemini获客Prompt工程.md,复制Prompt到Gemini

# 4. 导入数据
python gemini_data_importer.py --input gemini_leads.json --output leadpulse_leads.json

# 5. 开始获客!
python lead_generation_complete.py
```

**3天后,你将拥有150+个真实客户数据!**
**30天后,你将获得第一批付费客户!**

---

Made with ❤️ for 留学行业获客
