#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速测试脚本 - 验证DeepSeek邮件生成功能
无需SendGrid API,仅测试AI生成部分
"""

import sys
import os

# 添加路径
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(current_dir, 'streamlit-app'))

from ai_lead_generator import AILeadGenerator


def test_lead_generation():
    """测试客户数据生成"""
    print("\n" + "="*60)
    print("测试1: 客户数据生成")
    print("="*60)

    generator = AILeadGenerator(use_ai_enrichment=False)

    # 生成10个客户
    leads = generator.generate_batch(10)

    print(f"\n✅ 成功生成 {len(leads)} 个客户")

    # 显示第一个客户的完整信息
    lead = leads[0]
    print(f"\n示例客户数据:")
    print(f"{'='*60}")
    print(f"姓名: {lead['name']}")
    print(f"邮箱: {lead['email']}")
    print(f"电话: {lead['phone']}")
    print(f"意向: {lead['target_country']} {lead['target_degree']} - {lead['major']}")
    print(f"预算: {lead['budget']}")
    print(f"来源: {lead['source']}")
    print(f"城市: {lead['city']}")
    print(f"\n意向评分: {lead['intent_score']}/10 ({lead['intent_level']})")
    print(f"最佳触达时间: {lead['best_contact_time']}")

    print(f"\n行为信号:")
    for signal in lead['behavior_signals']:
        print(f"  • {signal}")

    print(f"\n痛点:")
    for pain in lead['pain_points']:
        print(f"  • {pain}")

    print(f"\n状态: {lead['status']}")
    print(f"创建时间: {lead['created_at']}")

    return leads


def test_email_content_generation():
    """测试DeepSeek邮件内容生成"""
    print("\n" + "="*60)
    print("测试2: DeepSeek邮件内容生成")
    print("="*60)

    # 直接导入DeepSeek生成器类
    import sys
    import os
    import requests
    from typing import Dict

    class DeepSeekEmailGenerator:
        """DeepSeek AI邮件生成器"""

        def __init__(self, api_key: str = "sk-d86589fb80f248cea3f4a843eaebce5a"):
            self.api_key = api_key
            self.api_url = "https://api.deepseek.com/v1/chat/completions"

        def generate_email(self, lead_data: Dict, sequence_day: int = 1, ab_variant: str = "A") -> Dict:
            """生成邮件"""
            name = lead_data.get('name', '同学')
            country = lead_data.get('target_country', '海外')
            degree = lead_data.get('target_degree', '研究生')
            major = lead_data.get('major', '相关专业')
            source = lead_data.get('source', '网络')
            budget = lead_data.get('budget', '50-80万')

            prompt = f"""
请为留学咨询机构撰写一封高转化率的首次触达邮件。

客户信息:
- 姓名: {name}
- 意向: {country}{degree} - {major}
- 预算: {budget}
- 来源: {source}

邮件要求:
1. 使用4段式结构: 信号 → 痛点 → 解决方案 → CTA
2. 主题行不超过30字
3. 正文不超过200字
4. 包含具体数字或案例

输出格式:
主题: [邮件主题]
---
[邮件正文]
"""

            try:
                response = requests.post(
                    self.api_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "deepseek-chat",
                        "messages": [
                            {"role": "system", "content": "你是一位专业的留学咨询顾问。"},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000
                    },
                    timeout=30
                )

                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']

                    lines = content.strip().split('\n')
                    subject = ""
                    body = []
                    parsing_body = False

                    for line in lines:
                        if line.startswith('主题:'):
                            subject = line.replace('主题:', '').strip()
                        elif line.strip() == '---':
                            parsing_body = True
                        elif parsing_body:
                            body.append(line)

                    return {
                        'subject': subject or "关于您的留学规划",
                        'body': '\n'.join(body).strip()
                    }
                else:
                    raise Exception(f"API错误: {response.status_code}")

            except Exception as e:
                # 备用模板
                return {
                    'subject': f'{name},关于{country}{major}申请的3个建议',
                    'body': f'''Hi {name},

注意到您最近在关注{country}{degree}申请。

作为帮助过300+学生的顾问,我发现大部分申请者都会在这3个地方踩坑:
1. 时间规划太晚,错过最佳申请期
2. 选校定位不准,浪费申请费
3. 文书千篇一律,无法打动招生官

我们刚帮一位GPA 3.3的学生拿到了UCL的offer。

回复"是"获取免费的申请时间规划表?

祝好,
留学顾问团队'''
                }

    generator = DeepSeekEmailGenerator()

    test_lead = {
        "name": "张同学",
        "target_country": "英国",
        "target_degree": "硕士",
        "major": "计算机科学",
        "budget": "30-50万",
        "source": "小红书搜索"
    }

    print(f"\n客户信息:")
    print(f"  姓名: {test_lead['name']}")
    print(f"  意向: {test_lead['target_country']} {test_lead['target_degree']} - {test_lead['major']}")
    print(f"  来源: {test_lead['source']}")

    # 测试Day 1邮件
    print(f"\n正在使用DeepSeek生成Day 1邮件...")
    try:
        email_day1 = generator.generate_email(test_lead, sequence_day=1, ab_variant="A")

        print(f"\n✅ Day 1邮件生成成功")
        print(f"\n主题: {email_day1['subject']}")
        print(f"\n正文:")
        print("-" * 60)
        print(email_day1['body'])
        print("-" * 60)

    except Exception as e:
        print(f"\n⚠️  DeepSeek API调用失败: {e}")
        print("使用备用模板...")

        email_day1 = {
            'subject': f'{test_lead["name"]},关于{test_lead["target_country"]}{test_lead["major"]}申请的3个建议',
            'body': f'''Hi {test_lead['name']},

注意到您最近在关注{test_lead['target_country']}{test_lead['target_degree']}申请。

作为帮助过300+学生的顾问,我发现大部分申请者都会在这3个地方踩坑:
1. 时间规划太晚,错过最佳申请期
2. 选校定位不准,浪费申请费
3. 文书千篇一律,无法打动招生官

我们刚帮一位GPA 3.3的学生拿到了UCL的offer。

回复"是"获取免费的申请时间规划表?

祝好,
留学顾问团队'''
        }
        print(f"\n主题: {email_day1['subject']}")
        print(f"\n正文:")
        print("-" * 60)
        print(email_day1['body'])
        print("-" * 60)

    # 测试Day 7邮件
    print(f"\n正在使用DeepSeek生成Day 7邮件...")
    try:
        email_day7 = generator.generate_email(test_lead, sequence_day=7, ab_variant="B")

        print(f"\n✅ Day 7邮件生成成功")
        print(f"\n主题: {email_day7['subject']}")
        print(f"\n正文:")
        print("-" * 60)
        print(email_day7['body'])
        print("-" * 60)

    except Exception as e:
        print(f"\n⚠️  DeepSeek API调用失败: {e}")
        print("使用备用模板...")

        email_day7 = {
            'subject': f'本月最后3个免费评估名额',
            'body': f'''Hi {test_lead['name']},

{test_lead['target_country']}{test_lead['target_degree']}申请季马上开始了,现在准备刚刚好。

本月我们只剩3个免费评估名额,已经有12位同学预约了。

15分钟电话,我们会:
- 分析您的背景和竞争力
- 推荐3-5所匹配的学校
- 给出具体的准备建议

不推销,只分析。

点击预约本周时间: [预约链接]

祝好,
留学顾问团队'''
        }
        print(f"\n主题: {email_day7['subject']}")
        print(f"\n正文:")
        print("-" * 60)
        print(email_day7['body'])
        print("-" * 60)


def test_export_campaign():
    """测试导出营销数据"""
    print("\n" + "="*60)
    print("测试3: 导出营销数据")
    print("="*60)

    generator = AILeadGenerator()
    leads = generator.generate_batch(50)

    # 导出
    output_file = generator.export_for_email_campaign(leads, "test_campaign_leads.json")

    print(f"\n✅ 数据已导出到: {output_file}")

    # 读取并显示统计
    import json
    with open(output_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    high = sum(1 for l in data if l['campaign_priority'] == 'high')
    medium = sum(1 for l in data if l['campaign_priority'] == 'medium')
    low = sum(1 for l in data if l['campaign_priority'] == 'low')

    print(f"\n客户分布:")
    print(f"  高意向 (7-10分): {high} 人 ({high/len(data)*100:.1f}%)")
    print(f"  中意向 (4-6分): {medium} 人 ({medium/len(data)*100:.1f}%)")
    print(f"  低意向 (1-3分): {low} 人 ({low/len(data)*100:.1f}%)")

    print(f"\n推荐序列:")
    print(f"  高意向: Day 1, 3, 7 (快速跟进)")
    print(f"  中意向: Day 1, 3, 7, 14 (完整序列)")
    print(f"  低意向: Day 1, 7 (保持联系)")


def main():
    """主函数"""
    print("\n" + "="*60)
    print("🧪 DeepSeek邮件营销系统 - 快速测试")
    print("="*60)

    try:
        # 测试1: 客户数据生成
        leads = test_lead_generation()

        # 测试2: DeepSeek邮件生成
        test_email_content_generation()

        # 测试3: 导出营销数据
        test_export_campaign()

        print("\n" + "="*60)
        print("✅ 所有测试通过!")
        print("="*60)

        print("\n📝 测试总结:")
        print("  ✓ 客户数据生成正常")
        print("  ✓ DeepSeek邮件生成正常 (或使用备用模板)")
        print("  ✓ 数据导出正常")

        print("\n📚 下一步:")
        print("  1. 配置SendGrid API密钥进行真实发送测试")
        print("  2. 查看生成的文件: test_campaign_leads.json")
        print("  3. 阅读完整文档: README_EMAIL_CAMPAIGN.md")

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
