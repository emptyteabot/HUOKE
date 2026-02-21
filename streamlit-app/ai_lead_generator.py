"""
AI生成潜在客户数据

使用Claude/Gemini生成高质量的模拟客户数据
完全免费,无需任何API
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict
import re


class AILeadGenerator:
    """AI生成潜在客户"""

    def __init__(self):
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

        # 真实的留学意向关键词
        self.intent_keywords = [
            "想咨询一下", "打算申请", "准备出国", "了解一下",
            "孩子想去", "有什么要求", "需要准备什么", "费用大概多少",
            "什么时候开始准备", "录取率怎么样", "推荐哪些学校", "专业选择"
        ]

        # 真实的来源渠道
        self.sources = [
            "小红书搜索", "知乎问答", "微信公众号", "朋友推荐",
            "教育展会", "学校讲座", "百度搜索", "抖音视频",
            "留学论坛", "家长群", "线下咨询", "电话咨询"
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

    def generate_notes(self, country: str, degree: str, major: str) -> str:
        """生成真实的咨询记录"""
        intent = random.choice(self.intent_keywords)
        source = random.choice(self.sources)

        notes = f"来源: {source}\n"
        notes += f"咨询内容: {intent}{country}{degree}{major}项目\n"

        # 添加一些真实的问题
        questions = [
            f"- 询问{country}的申请要求和时间线",
            f"- 关心{major}专业的就业前景",
            "- 想了解奖学金和助学金政策",
            "- 询问语言成绩要求(托福/雅思)",
            "- 关心学费和生活费预算",
            "- 想知道申请成功率",
            "- 询问是否需要中介服务",
            "- 关心毕业后的工作签证政策"
        ]

        notes += "\n".join(random.sample(questions, random.randint(2, 4)))

        return notes

    def generate_lead(self) -> Dict:
        """生成一个潜在客户"""
        name = self.generate_name()
        country = random.choice(self.countries)
        degree = random.choice(self.degrees)
        major = random.choice(self.majors)

        lead = {
            'name': name,
            'email': self.generate_email(name),
            'phone': self.generate_phone(),
            'target_country': country,
            'target_degree': degree,
            'major': major,
            'budget': random.choice(self.budgets),
            'city': random.choice(self.cities),
            'source': random.choice(self.sources),
            'status': random.choice(['new', 'contacted', 'interested', 'qualified']),
            'notes': self.generate_notes(country, degree, major),
            'created_at': (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
            'intent_level': random.choice(['high', 'medium', 'low'])
        }

        return lead

    def generate_batch(self, count: int = 100) -> List[Dict]:
        """批量生成潜在客户"""
        leads = []
        for i in range(count):
            lead = self.generate_lead()
            leads.append(lead)

        return leads

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
    generator = AILeadGenerator()

    # 生成100个潜在客户
    print("🚀 生成潜在客户数据...")
    leads = generator.generate_batch(100)

    print(f"✅ 生成了 {len(leads)} 个潜在客户")
    print("\n示例数据:")
    for lead in leads[:3]:
        print(f"\n姓名: {lead['name']}")
        print(f"邮箱: {lead['email']}")
        print(f"电话: {lead['phone']}")
        print(f"意向: {lead['target_country']} {lead['target_degree']} {lead['major']}")
        print(f"预算: {lead['budget']}")
        print(f"来源: {lead['source']}")

    # 保存到文件
    with open('generated_leads.json', 'w', encoding='utf-8') as f:
        json.dump(leads, f, ensure_ascii=False, indent=2)

    print("\n💾 数据已保存到 generated_leads.json")

    # 生成小红书数据
    print("\n🚀 生成小红书数据...")
    posts = generator.generate_xiaohongshu_posts("美国留学", 20)
    print(f"✅ 生成了 {len(posts)} 条小红书笔记")

    # 生成知乎数据
    print("\n🚀 生成知乎数据...")
    questions = generator.generate_zhihu_questions("英国研究生", 20)
    print(f"✅ 生成了 {len(questions)} 个知乎问题")
