"""
AI生成潜在客户数据 - 信号驱动版

使用DeepSeek API生成高质量的留学客户数据
包含行为信号、意向等级、触达时机等关键信息
"""

import json
import random
import requests
from datetime import datetime, timedelta
from typing import List, Dict
import re


class DeepSeekLeadEnricher:
    """DeepSeek AI客户数据增强器"""

    def __init__(self, api_key: str = "sk-d86589fb80f248cea3f4a843eaebce5a"):
        self.api_key = api_key
        self.api_url = "https://api.deepseek.com/v1/chat/completions"

    def enrich_lead_with_signals(self, lead: Dict) -> Dict:
        """
        使用AI增强客户数据，添加行为信号

        Args:
            lead: 基础客户数据

        Returns:
            增强后的客户数据
        """
        prompt = f"""
请为以下留学潜在客户生成真实的行为信号和意向分析:

客户信息:
- 姓名: {lead['name']}
- 意向: {lead['target_country']} {lead['target_degree']} - {lead['major']}
- 来源: {lead['source']}
- 预算: {lead['budget']}

请生成:
1. 3-5个具体的行为信号 (例: "在小红书搜索'UCL计算机科学申请要求'")
2. 意向等级评分 (1-10分) 及理由
3. 最佳触达时机 (例: "工作日晚上8-9点")
4. 痛点分析 (2-3个具体痛点)
5. 推荐话术角度

以JSON格式输出:
{{
  "signals": ["信号1", "信号2", "信号3"],
  "intent_score": 8,
  "intent_reason": "理由",
  "best_contact_time": "时间",
  "pain_points": ["痛点1", "痛点2"],
  "recommended_angle": "话术角度"
}}
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
                        {"role": "system", "content": "你是一位专业的留学行业数据分析师。"},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 500
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']

                # 提取JSON
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    enriched_data = json.loads(json_match.group())
                    lead.update(enriched_data)
                    return lead

        except Exception as e:
            print(f"AI增强失败: {e}")

        # 返回原始数据
        return lead


class AILeadGenerator:
    """AI生成潜在客户 - 信号驱动版"""

    def __init__(self, use_ai_enrichment: bool = False):
        self.use_ai_enrichment = use_ai_enrichment
        if use_ai_enrichment:
            self.enricher = DeepSeekLeadEnricher()
        # 真实的留学相关数据
        self.countries = ["美国", "英国", "加拿大", "澳大利亚", "新加坡", "日本", "德国", "法国"]
        self.degrees = ["本科", "硕士", "博士", "高中", "语言课程"]
        self.majors = [
            "计算机科学", "商业管理", "金融", "会计", "市场营销",
            "数据科学", "人工智能", "电子工程", "机械工程", "生物医学",
            "心理学", "教育学", "法律", "医学", "建筑学",
            "艺术设计", "传媒", "经济学", "统计学", "物理学"
        ]
        self.cities = [
            "北京", "上海", "广州", "深圳", "杭州", "南京", "成都", "武汉",
            "西安", "重庆", "天津", "苏州", "长沙", "郑州", "青岛"
        ]
        self.budgets = ["20-30万", "30-50万", "50-80万", "80-100万", "100万以上"]

        # 真实的中文姓名
        self.surnames = ["王", "李", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴", "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "罗", "高"]
        self.given_names = [
            "明", "华", "强", "军", "磊", "洋", "勇", "艳", "娜", "静",
            "敏", "丽", "秀", "芳", "伟", "刚", "杰", "涛", "超", "鹏",
            "婷", "雪", "梅", "霞", "玲", "燕", "红", "莉", "萍", "颖"
        ]

        # 行为信号模板
        self.signal_templates = [
            "在{platform}搜索'{keyword}'",
            "浏览了{school}官网的{major}专业页面",
            "下载了'{document}'PDF文档",
            "在{platform}提问'{question}'",
            "收藏了{count}篇关于{topic}的文章",
            "加入了'{group}'微信群",
            "参加了{event}线上讲座",
            "咨询了{topic}相关问题"
        ]

        # 真实的来源渠道
        self.sources = [
            "小红书搜索", "知乎问答", "微信公众号", "朋友推荐",
            "教育展会", "学校讲座", "百度搜索", "抖音视频",
            "留学论坛", "家长群", "线下咨询", "电话咨询"
        ]

        # 痛点库
        self.pain_points = [
            "不知道如何选择合适的学校和专业",
            "担心申请时间规划不合理",
            "文书写作没有思路",
            "语言成绩不够理想",
            "预算有限，担心费用问题",
            "不了解申请流程和材料准备",
            "担心竞争太激烈，录取率低",
            "不确定是否需要中介服务"
        ]

    def generate_name(self) -> str:
        """生成真实的中文姓名"""
        surname = random.choice(self.surnames)
        given_name = random.choice(self.given_names)
        if random.random() > 0.5:
            given_name += random.choice(self.given_names)
        return surname + given_name

    def generate_phone(self) -> str:
        """生成真实的手机号"""
        prefixes = ["130", "131", "132", "133", "135", "136", "137", "138", "139",
                   "150", "151", "152", "153", "155", "156", "157", "158", "159",
                   "180", "181", "182", "183", "185", "186", "187", "188", "189"]
        prefix = random.choice(prefixes)
        suffix = ''.join([str(random.randint(0, 9)) for _ in range(8)])
        return prefix + suffix

    def generate_email(self, name: str) -> str:
        """生成邮箱"""
        # 转拼音(简化版)
        pinyin_map = {
            "王": "wang", "李": "li", "张": "zhang", "刘": "liu", "陈": "chen",
            "杨": "yang", "黄": "huang", "赵": "zhao", "周": "zhou", "吴": "wu",
            "徐": "xu", "孙": "sun", "马": "ma", "朱": "zhu", "胡": "hu",
            "郭": "guo", "何": "he", "林": "lin", "罗": "luo", "高": "gao"
        }

        surname_pinyin = pinyin_map.get(name[0], "user")
        number = random.randint(100, 999)

        domains = ["qq.com", "163.com", "126.com", "gmail.com", "outlook.com", "sina.com"]
        domain = random.choice(domains)

        return f"{surname_pinyin}{number}@{domain}"

    def generate_behavior_signals(self, country: str, degree: str, major: str, source: str) -> List[str]:
        """生成行为信号"""
        signals = []

        # 根据来源生成对应的信号
        if "小红书" in source:
            signals.append(f"在小红书搜索'{country}{degree}申请'")
            signals.append(f"收藏了5篇关于{major}专业的笔记")
        elif "知乎" in source:
            signals.append(f"在知乎提问'{country}{major}申请难度大吗?'")
            signals.append(f"关注了3个{country}留学相关话题")
        elif "微信" in source:
            signals.append(f"在公众号阅读了'{country}留学指南'文章")
            signals.append(f"加入了'{country}留学交流群'")
        else:
            signals.append(f"搜索了'{country}{degree}{major}'相关信息")

        # 添加通用信号
        schools = {
            "美国": ["MIT", "Stanford", "Harvard", "CMU"],
            "英国": ["UCL", "Imperial", "LSE", "KCL"],
            "加拿大": ["多伦多大学", "UBC", "麦吉尔"],
            "澳大利亚": ["墨尔本大学", "悉尼大学", "ANU"]
        }

        if country in schools:
            school = random.choice(schools[country])
            signals.append(f"浏览了{school}的{major}专业页面")

        signals.append(f"下载了'{country}留学申请时间规划表'")

        return random.sample(signals, min(3, len(signals)))

    def calculate_intent_score(self, lead: Dict) -> int:
        """计算意向评分 (1-10)"""
        score = 5  # 基础分

        # 根据来源调整
        high_intent_sources = ["线下咨询", "电话咨询", "朋友推荐"]
        if lead['source'] in high_intent_sources:
            score += 2

        # 根据预算调整
        if "100万以上" in lead['budget'] or "80-100万" in lead['budget']:
            score += 1

        # 根据时间调整 (最近创建的意向更高)
        days_ago = (datetime.now() - datetime.fromisoformat(lead['created_at'])).days
        if days_ago < 7:
            score += 2
        elif days_ago < 30:
            score += 1

        return min(10, score)

    def get_best_contact_time(self, source: str) -> str:
        """获取最佳触达时机"""
        time_map = {
            "小红书搜索": "工作日晚上8-10点",
            "知乎问答": "工作日晚上7-9点",
            "微信公众号": "周末上午10-12点",
            "朋友推荐": "工作日下午3-5点",
            "线下咨询": "工作日上午10-12点",
            "电话咨询": "工作日下午2-4点"
        }
        return time_map.get(source, "工作日晚上8-9点")

    def select_pain_points(self, lead: Dict) -> List[str]:
        """选择痛点"""
        selected = random.sample(self.pain_points, 2)

        # 根据预算添加特定痛点
        if "20-30万" in lead['budget']:
            selected.append("预算有限，担心费用问题")

        return selected[:3]

    def generate_lead(self) -> Dict:
        """生成一个潜在客户 - 信号驱动版"""
        name = self.generate_name()
        country = random.choice(self.countries)
        degree = random.choice(self.degrees)
        major = random.choice(self.majors)
        source = random.choice(self.sources)
        budget = random.choice(self.budgets)
        created_at = datetime.now() - timedelta(days=random.randint(0, 30))

        lead = {
            'name': name,
            'email': self.generate_email(name),
            'phone': self.generate_phone(),
            'target_country': country,
            'target_degree': degree,
            'major': major,
            'budget': budget,
            'city': random.choice(self.cities),
            'source': source,
            'created_at': created_at.isoformat(),

            # 信号驱动字段
            'behavior_signals': self.generate_behavior_signals(country, degree, major, source),
            'best_contact_time': self.get_best_contact_time(source),
            'pain_points': self.select_pain_points({'budget': budget}),

            # 状态字段
            'status': random.choice(['new', 'contacted', 'interested', 'qualified']),
            'email_sequence_day': 0,  # 当前邮件序列天数
            'last_contact_at': None,
            'next_contact_at': created_at.isoformat()  # 建议下次联系时间
        }

        # 计算意向评分
        lead['intent_score'] = self.calculate_intent_score(lead)
        lead['intent_level'] = 'high' if lead['intent_score'] >= 7 else ('medium' if lead['intent_score'] >= 4 else 'low')

        # 如果启用AI增强
        if self.use_ai_enrichment:
            lead = self.enricher.enrich_lead_with_signals(lead)

        return lead

    def generate_batch(self, count: int = 100, use_ai: bool = False) -> List[Dict]:
        """
        批量生成潜在客户

        Args:
            count: 生成数量
            use_ai: 是否使用AI增强

        Returns:
            客户列表
        """
        if use_ai:
            self.use_ai_enrichment = True

        leads = []
        for i in range(count):
            lead = self.generate_lead()
            leads.append(lead)

            if (i + 1) % 10 == 0:
                print(f"已生成 {i + 1}/{count} 个客户...")

        return leads

    def export_for_email_campaign(self, leads: List[Dict], output_file: str = "email_campaign_leads.json"):
        """
        导出用于邮件营销的客户数据

        Args:
            leads: 客户列表
            output_file: 输出文件名
        """
        # 按意向等级排序
        sorted_leads = sorted(leads, key=lambda x: x['intent_score'], reverse=True)

        # 添加营销建议
        for lead in sorted_leads:
            if lead['intent_score'] >= 7:
                lead['campaign_priority'] = 'high'
                lead['recommended_sequence'] = [1, 3, 7]  # 高意向客户用短序列
            elif lead['intent_score'] >= 4:
                lead['campaign_priority'] = 'medium'
                lead['recommended_sequence'] = [1, 3, 7, 14]  # 中意向用完整序列
            else:
                lead['campaign_priority'] = 'low'
                lead['recommended_sequence'] = [1, 7]  # 低意向只发2次

        # 保存
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(sorted_leads, f, ensure_ascii=False, indent=2)

        print(f"✅ 已导出 {len(sorted_leads)} 个客户到 {output_file}")
        print(f"   - 高意向: {sum(1 for l in sorted_leads if l['campaign_priority'] == 'high')}")
        print(f"   - 中意向: {sum(1 for l in sorted_leads if l['campaign_priority'] == 'medium')}")
        print(f"   - 低意向: {sum(1 for l in sorted_leads if l['campaign_priority'] == 'low')}")

        return output_file

    def generate_xiaohongshu_posts(self, keywords: str, count: int = 20) -> List[Dict]:
        """生成小红书笔记数据"""
        titles = [
            f"{keywords}经验分享 | 从申请到拿offer全过程",
            f"超详细!{keywords}保姆级攻略",
            f"{keywords}避坑指南!这些错误千万别犯",
            f"我是如何拿到{keywords}offer的?",
            f"{keywords}费用清单 | 真实花费大公开",
            f"{keywords}选校攻略 | 这些学校值得申请",
            f"{keywords}文书写作技巧分享",
            f"{keywords}面试经验 | 高频问题汇总",
            f"{keywords}时间规划 | 什么时候开始准备?",
            f"{keywords}成功案例 | GPA3.0也能逆袭"
        ]

        posts = []
        for i in range(count):
            post = {
                'title': random.choice(titles),
                'author': self.generate_name(),
                'content': f"分享一下我的{keywords}经验...(点击查看全文)",
                'likes': random.randint(100, 5000),
                'comments': random.randint(20, 500),
                'url': f"https://www.xiaohongshu.com/note/{random.randint(100000, 999999)}",
                'published_at': (datetime.now() - timedelta(days=random.randint(0, 90))).isoformat(),
                'source': 'xiaohongshu',
                'keywords': keywords
            }
            posts.append(post)

        return posts

    def generate_zhihu_questions(self, keywords: str, count: int = 20) -> List[Dict]:
        """生成知乎问题数据"""
        questions = [
            f"{keywords}需要准备什么?",
            f"{keywords}的申请难度大吗?",
            f"{keywords}一年费用大概多少?",
            f"{keywords}哪些学校比较好申请?",
            f"{keywords}值得吗?就业前景如何?",
            f"普通本科可以申请{keywords}吗?",
            f"{keywords}需要什么语言成绩?",
            f"{keywords}DIY还是找中介?",
            f"{keywords}什么时候开始准备比较好?",
            f"{keywords}有哪些奖学金可以申请?"
        ]

        results = []
        for i in range(count):
            question = {
                'title': random.choice(questions),
                'author': self.generate_name(),
                'answer_count': random.randint(5, 200),
                'follower_count': random.randint(50, 2000),
                'url': f"https://www.zhihu.com/question/{random.randint(100000000, 999999999)}",
                'created_at': (datetime.now() - timedelta(days=random.randint(0, 180))).isoformat(),
                'source': 'zhihu',
                'keywords': keywords
            }
            results.append(question)

        return results


# 使用示例
if __name__ == "__main__":
    generator = AILeadGenerator(use_ai_enrichment=False)  # 设为True启用AI增强

    # 示例1: 生成100个潜在客户
    print("🚀 生成潜在客户数据...")
    leads = generator.generate_batch(100)

    print(f"\n✅ 生成了 {len(leads)} 个潜在客户")
    print("\n示例数据 (前3个):")
    for lead in leads[:3]:
        print(f"\n{'='*60}")
        print(f"姓名: {lead['name']}")
        print(f"邮箱: {lead['email']}")
        print(f"电话: {lead['phone']}")
        print(f"意向: {lead['target_country']} {lead['target_degree']} {lead['major']}")
        print(f"预算: {lead['budget']}")
        print(f"来源: {lead['source']}")
        print(f"意向评分: {lead['intent_score']}/10 ({lead['intent_level']})")
        print(f"最佳触达时间: {lead['best_contact_time']}")
        print(f"\n行为信号:")
        for signal in lead['behavior_signals']:
            print(f"  • {signal}")
        print(f"\n痛点:")
        for pain in lead['pain_points']:
            print(f"  • {pain}")

    # 示例2: 导出用于邮件营销
    print(f"\n{'='*60}")
    print("📧 导出邮件营销数据...")
    output_file = generator.export_for_email_campaign(leads)

    # 示例3: 生成小红书数据
    print(f"\n{'='*60}")
    print("🚀 生成小红书数据...")
    posts = generator.generate_xiaohongshu_posts("美国留学", 20)
    print(f"✅ 生成了 {len(posts)} 条小红书笔记")

    # 示例4: 生成知乎数据
    print(f"\n{'='*60}")
    print("🚀 生成知乎数据...")
    questions = generator.generate_zhihu_questions("英国研究生", 20)
    print(f"✅ 生成了 {len(questions)} 个知乎问题")

    # 保存所有数据
    print(f"\n{'='*60}")
    print("�� 保存数据...")
    with open('generated_leads_full.json', 'w', encoding='utf-8') as f:
        json.dump({
            'leads': leads,
            'xiaohongshu_posts': posts,
            'zhihu_questions': questions
        }, f, ensure_ascii=False, indent=2)

    print("✅ 所有数据已保存到 generated_leads_full.json")

