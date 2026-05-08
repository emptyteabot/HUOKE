# 🚀 Gemini获客快速开始指南

## 第一步: 用Gemini收集数据 (2-3小时)

### 1. 打开Gemini
访问: https://gemini.google.com

### 2. 复制第一个Prompt
打开 `Gemini获客Prompt工程.md`
复制 **Prompt 1: 寻找目标客户聚集地**
粘贴到Gemini

### 3. 等待Gemini返回结果
Gemini会返回:
- 20个平台列表
- 100+个搜索关键词
- 每个平台的获客策略

### 4. 依次使用Prompt 2-6
- **Prompt 2**: 挖掘小红书客户 (预计50个)
- **Prompt 3**: 挖掘知乎客户 (预计30个)
- **Prompt 4**: 挖掘豆瓣客户 (预计20个)
- **Prompt 5**: 挖掘微博客户 (预计25个)
- **Prompt 6**: 挖掘论坛客户 (预计40个)

**总计: 150-200个潜在客户**

### 5. 保存Gemini返回的数据
将Gemini返回的数据复制到文本文件:
- 如果是JSON格式 → 保存为 `gemini_leads.json`
- 如果是表格 → 复制到Excel → 保存为 `gemini_leads.xlsx`
- 如果是CSV → 保存为 `gemini_leads.csv`

---

## 第二步: 数据整合与清洗 (30分钟)

### 1. 使用Prompt 7去重和评分
复制 **Prompt 7: 综合分析与优先级排序**
粘贴到Gemini
上传你保存的数据文件

Gemini会:
- 自动去重
- 重新评分
- 按优先级排序(S/A/B)

### 2. 使用Prompt 9生成标准化数据库
复制 **Prompt 9: 生成最终客户数据库**
粘贴到Gemini

Gemini会返回标准化的JSON数据,复制保存为:
`gemini_leads_final.json`

---

## 第三步: 导入LeadPulse系统 (5分钟)

### 1. 运行导入脚本

```bash
cd C:\Users\陈盈桦\Desktop\LeadPulse

# 从JSON导入
python gemini_data_importer.py --input gemini_leads_final.json --output leadpulse_leads.json

# 或从Excel导入
python gemini_data_importer.py --input gemini_leads.xlsx --output leadpulse_leads.json

# 或从CSV导入
python gemini_data_importer.py --input gemini_leads.csv --output leadpulse_leads.json
```

### 2. 检查导入结果

脚本会显示:
```
✓ 读取到 165 条原始数据
✓ 成功导入: 142 条
⚠ 跳过: 23 条 (没有联系方式)

📊 导入摘要
✓ 成功导入: 142 条
  - S级: 28 条 (立即联系)
  - A级: 54 条 (3天内)
  - B级: 60 条 (1周内)

✅ 完成!数据已准备好导入LeadPulse系统
📁 输出文件: leadpulse_leads.json
```

---

## 第四步: 开始触达 (立即开始)

### 1. 先测试10个S级客户

```python
from email_auto_sender import EmailAutoSender
import json

# 加载数据
with open('leadpulse_leads.json', 'r', encoding='utf-8') as f:
    all_leads = json.load(f)

# 筛选S级客户
s_leads = [l for l in all_leads if l.get('priority') == 'S']
print(f"找到 {len(s_leads)} 个S级客户")

# 初始化邮件发送器
sender = EmailAutoSender(
    api_key="你的SendGrid密钥",
    from_email="advisor@studyabroad.com",
    deepseek_api_key="${DEEPSEEK_API_KEY}"
)

# 先测试10个
test_leads = s_leads[:10]
results = sender.send_batch(test_leads, sequence_day=1)

print(f"已发送: {len(results)} 封邮件")
```

### 2. 查看效果 (24小时后)

```python
# 查看打开率和回复率
report = sender.get_campaign_report()

print(f"""
发送: {report['total_sent']} 封
打开: {report['opens']} 封 ({report['open_rate']}%)
回复: {report['replies']} 人
""")

# 如果打开率>20%,回复率>3%,说明效果不错
# 继续发送剩余的S级客户
```

### 3. 扩大规模 (效果好的话)

```python
# 发送所有S级客户
sender.send_batch(s_leads, sequence_day=1)

# 3天后发送A级客户
import time
time.sleep(3 * 24 * 3600)  # 等待3天
a_leads = [l for l in all_leads if l.get('priority') == 'A']
sender.send_batch(a_leads, sequence_day=1)

# 7天后发送B级客户
time.sleep(4 * 24 * 3600)  # 再等4天
b_leads = [l for l in all_leads if l.get('priority') == 'B']
sender.send_batch(b_leads, sequence_day=1)
```

---

## 第五步: 持续优化 (每天10分钟)

### 1. 每天查看数据

```python
# 每天早上运行
report = sender.get_campaign_report()

print(f"""
=== 今日数据 ===
新增打开: {report['today_opens']}
新增回复: {report['today_replies']}
累计咨询: {report['total_consultations']}
预计成交: {report['estimated_conversions']}
""")
```

### 2. 优化文案 (如果效果不好)

```python
# 如果打开率<15%,优化主题行
# 如果回复率<2%,优化邮件正文

# 运行A/B测试
sender.run_ab_test(
    variant_a="原版文案",
    variant_b="优化后文案",
    test_size=20  # 各发20封测试
)

# 7天后查看哪个版本更好
ab_report = sender.get_ab_test_report()
print(ab_report)
```

### 3. 持续获客 (用Prompt 8)

```
每周用一次 Prompt 8: 设置实时监控
Gemini会帮你找到新的潜在客户
每周新增20-30个客户
持续发送邮件
```

---

## 📊 预期效果

### 第1周
- 收集客户: 150个
- 发送邮件: 30个 (S级)
- 打开率: 25% → 7-8人看了
- 回复率: 5% → 1-2人回复
- 咨询: 1人
- 成交: 0人 (太早)

### 第2周
- 发送邮件: 50个 (A级)
- 跟进Day 3邮件: 30个 (S级)
- 累计咨询: 3-5人
- 成交: 1人 (¥30,000)

### 第3周
- 发送邮件: 60个 (B级)
- 跟进Day 7邮件: 80个
- 累计咨询: 8-12人
- 成交: 2-3人 (¥60,000-90,000)

### 第4周
- 跟进Day 14邮件: 140个
- 新增客户: 30个 (持续监控)
- 累计咨询: 15-20人
- 成交: 4-5人 (¥120,000-150,000)

**30天总营收: ¥12万-15万**
**投入成本: ¥710 (邮件费用)**
**ROI: 169-211倍**

---

## ⚠️ 注意事项

### 1. 数据质量
- Gemini返回的数据可能不是100%准确
- 联系方式完整率约60-70%
- 需要人工验证高价值客户

### 2. 邮件发送限制
- SendGrid免费版: 每天100封
- 如果客户>100,需要分批发送
- 或升级到付费版(¥200/月,每天40,000封)

### 3. 合规性
- 确保邮件包含退订链接
- 不要发送垃圾邮件
- 尊重用户隐私

### 4. 效果追踪
- 每天查看数据
- 及时回复咨询
- 记录成交情况

---

## 🆘 常见问题

### Q: Gemini返回的数据格式不对怎么办?
A: 在Prompt结尾加上: "请以JSON格式输出,包含以下字段: name, email, phone..."

### Q: Gemini找不到联系方式怎么办?
A: 正常,很多平台不公开联系方式。可以:
1. 让Gemini提供用户主页链接
2. 你手动访问主页,私信要联系方式
3. 或直接在平台上私信触达

### Q: 导入脚本报错怎么办?
A: 检查:
1. 文件路径是否正确
2. 文件格式是否正确(JSON/CSV/Excel)
3. 数据字段是否完整

### Q: 邮件发送失败怎么办?
A: 检查:
1. SendGrid API密钥是否正确
2. 发件人邮箱是否验证
3. 收件人邮箱格式是否正确

---

## 🎯 成功关键

1. **数据质量>数量**: 50个高质量客户 > 200个低质量客户
2. **快速响应**: 收到回复后1小时内回复,转化率提升3倍
3. **持续跟进**: 不要发一封就放弃,至少跟进4次
4. **个性化**: 用DeepSeek生成个性化文案,不要群发模板
5. **数据驱动**: 每天看数据,持续优化

---

## 🚀 立即开始

**现在就打开Gemini,复制Prompt 1,开始你的获客之旅!**

**3天后,你将拥有150+个真实客户数据!**
**30天后,你将获得第一批付费客户!**

加油! 💪
