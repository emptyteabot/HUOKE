"""
意图信号劫持引擎 - Intent Signal Hijacker
2026年顶级获客策略核心模块

功能:
1. 监控三大核心信号(行为/技术/人事)
2. 实时抓取意图数据
3. 交叉比对多源数据
4. 识别"此刻正在四处求医"的人
"""

import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum


class SignalType(Enum):
    """信号类型"""
    BEHAVIOR = "行为信号"      # 用户行为轨迹
    TECHNICAL = "技术信号"     # 技术栈变动
    PERSONNEL = "人事信号"     # 人事变动


class UrgencyLevel(Enum):
    """紧迫度等级"""
    CRITICAL = "极高"    # 立即出击
    HIGH = "高"          # 24小时内
    MEDIUM = "中"        # 3天内
    LOW = "低"           # 1周内


@dataclass
class IntentSignal:
    """意图信号数据结构"""
    signal_type: SignalType
    signal_name: str
    company: str
    contact_person: Optional[str]
    detected_at: datetime
    urgency: UrgencyLevel
    confidence: float  # 0-1
    raw_data: Dict
    pain_point: str    # 推断的痛点
    financial_loss: str  # 推断的财务损失

    def to_dict(self) -> Dict:
        return {
            'signal_type': self.signal_type.value,
            'signal_name': self.signal_name,
            'company': self.company,
            'contact_person': self.contact_person,
            'detected_at': self.detected_at.isoformat(),
            'urgency': self.urgency.value,
            'confidence': self.confidence,
            'raw_data': self.raw_data,
            'pain_point': self.pain_point,
            'financial_loss': self.financial_loss
        }


class BehaviorSignalDetector:
    """行为信号检测器"""

    def __init__(self):
        self.signal_patterns = {
            '频繁访问竞品': {
                'keywords': ['竞品', '对比', '评测', '哪个好', 'vs'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '正在选型,决策窗口期短',
                'financial_loss': '选错工具导致团队效率损失30%'
            },
            '开源仓库提Issue': {
                'keywords': ['issue', 'bug', '问题', '不支持', '怎么实现'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '现有方案无法满足需求,急需替代',
                'financial_loss': '开发时间延误,每天损失¥5,000'
            },
            '社交媒体求助': {
                'keywords': ['求推荐', '有没有', '谁知道', '急', '帮忙'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '遇到具体问题,四处求医',
                'financial_loss': '问题未解决,业务停滞'
            },
            '知识平台搜索': {
                'keywords': ['怎么做', '如何', '教程', '方法', '解决方案'],
                'urgency': UrgencyLevel.MEDIUM,
                'pain_point': '正在学习和调研阶段',
                'financial_loss': '自己摸索浪费时间成本'
            },
            '评论区咨询': {
                'keywords': ['多少钱', '价格', '费用', '联系方式', '加微信'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '已有购买意向,正在询价',
                'financial_loss': '被竞品抢先成交'
            }
        }

    def detect_xiaohongshu(self, content: str, author: str, post_url: str) -> Optional[IntentSignal]:
        """检测小红书行为信号"""
        content_lower = content.lower()

        for signal_name, pattern in self.signal_patterns.items():
            # 关键词匹配
            matched_keywords = [kw for kw in pattern['keywords'] if kw in content_lower]

            if matched_keywords:
                confidence = min(len(matched_keywords) / len(pattern['keywords']), 1.0)

                return IntentSignal(
                    signal_type=SignalType.BEHAVIOR,
                    signal_name=f"小红书-{signal_name}",
                    company=self._extract_company(content),
                    contact_person=author,
                    detected_at=datetime.now(),
                    urgency=pattern['urgency'],
                    confidence=confidence,
                    raw_data={
                        'platform': 'xiaohongshu',
                        'content': content,
                        'url': post_url,
                        'matched_keywords': matched_keywords
                    },
                    pain_point=pattern['pain_point'],
                    financial_loss=pattern['financial_loss']
                )

        return None

    def detect_zhihu(self, question: str, answer: str, author: str) -> Optional[IntentSignal]:
        """检测知乎行为信号"""
        combined_text = f"{question} {answer}".lower()

        # 问题类型判断
        if any(kw in question for kw in ['求推荐', '哪个好', '怎么选']):
            return IntentSignal(
                signal_type=SignalType.BEHAVIOR,
                signal_name="知乎-选型咨询",
                company=self._extract_company(combined_text),
                contact_person=author,
                detected_at=datetime.now(),
                urgency=UrgencyLevel.HIGH,
                confidence=0.8,
                raw_data={
                    'platform': 'zhihu',
                    'question': question,
                    'answer': answer
                },
                pain_point='正在对比多个方案,决策中',
                financial_loss='选错方案导致后续迁移成本高'
            )

        return None

    def detect_github(self, repo: str, issue_title: str, issue_body: str, author: str) -> Optional[IntentSignal]:
        """检测GitHub Issue信号"""
        combined = f"{issue_title} {issue_body}".lower()

        # 高价值Issue特征
        high_value_keywords = ['不支持', '无法', 'bug', '错误', '失败', '怎么实现']

        if any(kw in combined for kw in high_value_keywords):
            return IntentSignal(
                signal_type=SignalType.BEHAVIOR,
                signal_name="GitHub-技术痛点",
                company=self._extract_company_from_github(author),
                contact_person=author,
                detected_at=datetime.now(),
                urgency=UrgencyLevel.CRITICAL,
                confidence=0.9,
                raw_data={
                    'platform': 'github',
                    'repo': repo,
                    'issue_title': issue_title,
                    'issue_body': issue_body
                },
                pain_point='技术方案遇到瓶颈,急需解决',
                financial_loss='开发进度受阻,每天损失¥10,000+'
            )

        return None

    def _extract_company(self, text: str) -> str:
        """从文本提取公司名"""
        # 简化版,实际应使用NER
        company_keywords = ['公司', '企业', '团队', '我们']
        for keyword in company_keywords:
            if keyword in text:
                # 提取公司名逻辑
                return "待识别公司"
        return "个人用户"

    def _extract_company_from_github(self, username: str) -> str:
        """从GitHub用户名推断公司"""
        # 可以调用GitHub API获取用户profile
        return f"GitHub用户-{username}"


class TechnicalSignalDetector:
    """技术信号检测器"""

    def __init__(self):
        self.signal_patterns = {
            '技术栈变动': {
                'indicators': ['迁移', '升级', '替换', '从...到...', '改用'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '技术架构调整,需要新工具支持',
                'financial_loss': '技术债累积,维护成本每月增加¥50,000'
            },
            '接入新SaaS': {
                'indicators': ['接入', '集成', '对接', 'API', 'webhook'],
                'urgency': UrgencyLevel.MEDIUM,
                'pain_point': '业务扩张,需要更多工具',
                'financial_loss': '工具不配套,数据孤岛导致效率损失'
            },
            '新产品发布': {
                'indicators': ['上线', '发布', 'launch', '推出', '新版本'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '新产品需要快速获客',
                'financial_loss': '获客慢导致市场窗口期错失'
            },
            '技术招聘': {
                'indicators': ['招聘', 'hiring', '寻找', '技术负责人', 'CTO'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '团队扩张,技术能力不足',
                'financial_loss': '人力成本高,产出低'
            }
        }

    def detect_from_job_posting(self, job_title: str, job_desc: str, company: str) -> Optional[IntentSignal]:
        """从招聘信息检测技术信号"""
        combined = f"{job_title} {job_desc}".lower()

        for signal_name, pattern in self.signal_patterns.items():
            matched = [ind for ind in pattern['indicators'] if ind in combined]

            if matched:
                return IntentSignal(
                    signal_type=SignalType.TECHNICAL,
                    signal_name=f"招聘-{signal_name}",
                    company=company,
                    contact_person=None,
                    detected_at=datetime.now(),
                    urgency=pattern['urgency'],
                    confidence=0.7,
                    raw_data={
                        'source': 'job_posting',
                        'job_title': job_title,
                        'job_desc': job_desc,
                        'matched_indicators': matched
                    },
                    pain_point=pattern['pain_point'],
                    financial_loss=pattern['financial_loss']
                )

        return None

    def detect_from_tech_blog(self, blog_title: str, blog_content: str, company: str) -> Optional[IntentSignal]:
        """从技术博客检测信号"""
        combined = f"{blog_title} {blog_content}".lower()

        # 技术博客通常透露技术栈变化
        if any(kw in combined for kw in ['迁移', '升级', '重构', '架构']):
            return IntentSignal(
                signal_type=SignalType.TECHNICAL,
                signal_name="技术博客-架构变动",
                company=company,
                contact_person=None,
                detected_at=datetime.now(),
                urgency=UrgencyLevel.MEDIUM,
                confidence=0.6,
                raw_data={
                    'source': 'tech_blog',
                    'title': blog_title,
                    'content': blog_content[:500]
                },
                pain_point='技术架构升级,需要配套工具',
                financial_loss='架构不合理,性能损失20%'
            )

        return None


class PersonnelSignalDetector:
    """人事信号检测器"""

    def __init__(self):
        self.signal_patterns = {
            '高管入职': {
                'titles': ['CEO', 'CTO', 'CMO', 'VP', '总监', '负责人'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '新官上任,急需出成绩',
                'financial_loss': '前3个月是黄金窗口期'
            },
            '团队扩张': {
                'keywords': ['扩招', '招聘', '团队扩大', '人员增加'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '业务增长,需要工具支持',
                'financial_loss': '新团队效率低,培训成本高'
            },
            '融资完成': {
                'keywords': ['融资', '获投', '完成', '轮', '估值'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '拿到钱后急需扩张',
                'financial_loss': '资金使用效率低,烧钱速度快'
            },
            '组织架构调整': {
                'keywords': ['调整', '重组', '新部门', '事业部'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '组织变革,流程需要优化',
                'financial_loss': '内部协作混乱,效率下降'
            }
        }

    def detect_from_linkedin(self, profile_change: Dict) -> Optional[IntentSignal]:
        """从LinkedIn职位变动检测信号"""
        new_title = profile_change.get('new_title', '').lower()
        company = profile_change.get('company', '')
        person = profile_change.get('name', '')

        for signal_name, pattern in self.signal_patterns.items():
            if 'titles' in pattern:
                if any(title.lower() in new_title for title in pattern['titles']):
                    return IntentSignal(
                        signal_type=SignalType.PERSONNEL,
                        signal_name=f"LinkedIn-{signal_name}",
                        company=company,
                        contact_person=person,
                        detected_at=datetime.now(),
                        urgency=pattern['urgency'],
                        confidence=0.9,
                        raw_data={
                            'source': 'linkedin',
                            'profile_change': profile_change
                        },
                        pain_point=pattern['pain_point'],
                        financial_loss=pattern['financial_loss']
                    )

        return None

    def detect_from_news(self, news_title: str, news_content: str, company: str) -> Optional[IntentSignal]:
        """从新闻检测人事信号"""
        combined = f"{news_title} {news_content}".lower()

        for signal_name, pattern in self.signal_patterns.items():
            if 'keywords' in pattern:
                matched = [kw for kw in pattern['keywords'] if kw in combined]

                if matched:
                    return IntentSignal(
                        signal_type=SignalType.PERSONNEL,
                        signal_name=f"新闻-{signal_name}",
                        company=company,
                        contact_person=None,
                        detected_at=datetime.now(),
                        urgency=pattern['urgency'],
                        confidence=0.8,
                        raw_data={
                            'source': 'news',
                            'title': news_title,
                            'content': news_content[:500],
                            'matched_keywords': matched
                        },
                        pain_point=pattern['pain_point'],
                        financial_loss=pattern['financial_loss']
                    )

        return None


class IntentSignalHijacker:
    """意图信号劫持引擎 - 主类"""

    def __init__(self):
        self.behavior_detector = BehaviorSignalDetector()
        self.technical_detector = TechnicalSignalDetector()
        self.personnel_detector = PersonnelSignalDetector()
        self.signal_queue = []  # 信号队列

    def monitor_xiaohongshu(self, keyword: str, limit: int = 50) -> List[IntentSignal]:
        """监控小红书"""
        print(f"\n🔍 监控小红书关键词: {keyword}")

        # 这里应该调用实际的爬虫
        # 示例数据
        mock_posts = [
            {
                'content': '求推荐好用的获客工具,我们公司刚完成A轮融资,准备扩充销售团队',
                'author': '张总',
                'url': 'https://xiaohongshu.com/xxx'
            },
            {
                'content': '有没有人知道怎么快速找到精准客户?我们的获客成本太高了,急!',
                'author': '李经理',
                'url': 'https://xiaohongshu.com/yyy'
            }
        ]

        signals = []
        for post in mock_posts:
            signal = self.behavior_detector.detect_xiaohongshu(
                post['content'],
                post['author'],
                post['url']
            )
            if signal:
                signals.append(signal)
                self.signal_queue.append(signal)

        print(f"✅ 检测到 {len(signals)} 个行为信号")
        return signals

    def monitor_zhihu(self, keyword: str, limit: int = 50) -> List[IntentSignal]:
        """监控知乎"""
        print(f"\n🔍 监控知乎关键词: {keyword}")

        # 示例数据
        mock_questions = [
            {
                'question': '如何快速获取B2B客户?',
                'answer': '我们公司正在找解决方案...',
                'author': '王总'
            }
        ]

        signals = []
        for q in mock_questions:
            signal = self.behavior_detector.detect_zhihu(
                q['question'],
                q['answer'],
                q['author']
            )
            if signal:
                signals.append(signal)
                self.signal_queue.append(signal)

        print(f"✅ 检测到 {len(signals)} 个行为信号")
        return signals

    def monitor_github(self, repo_keywords: List[str]) -> List[IntentSignal]:
        """监控GitHub Issues"""
        print(f"\n🔍 监控GitHub仓库: {', '.join(repo_keywords)}")

        # 示例数据
        mock_issues = [
            {
                'repo': '某开源CRM',
                'title': '不支持批量导入客户',
                'body': '我们有10000个客户需要导入,现在只能手动...',
                'author': 'tech_lead'
            }
        ]

        signals = []
        for issue in mock_issues:
            signal = self.behavior_detector.detect_github(
                issue['repo'],
                issue['title'],
                issue['body'],
                issue['author']
            )
            if signal:
                signals.append(signal)
                self.signal_queue.append(signal)

        print(f"✅ 检测到 {len(signals)} 个技术信号")
        return signals

    def monitor_job_postings(self, company_list: List[str]) -> List[IntentSignal]:
        """监控招聘信息"""
        print(f"\n🔍 监控招聘信息: {len(company_list)} 家公司")

        # 示例数据
        mock_jobs = [
            {
                'company': 'ABC科技',
                'title': '销售总监',
                'desc': '负责搭建销售团队,制定获客策略...'
            }
        ]

        signals = []
        for job in mock_jobs:
            signal = self.technical_detector.detect_from_job_posting(
                job['title'],
                job['desc'],
                job['company']
            )
            if signal:
                signals.append(signal)
                self.signal_queue.append(signal)

        print(f"✅ 检测到 {len(signals)} 个技术信号")
        return signals

    def monitor_linkedin_changes(self, target_companies: List[str]) -> List[IntentSignal]:
        """监控LinkedIn职位变动"""
        print(f"\n🔍 监控LinkedIn: {len(target_companies)} 家公司")

        # 示例数据
        mock_changes = [
            {
                'name': '赵总',
                'company': 'XYZ企业',
                'new_title': 'VP of Sales',
                'old_title': 'Sales Director'
            }
        ]

        signals = []
        for change in mock_changes:
            signal = self.personnel_detector.detect_from_linkedin(change)
            if signal:
                signals.append(signal)
                self.signal_queue.append(signal)

        print(f"✅ 检测到 {len(signals)} 个人事信号")
        return signals

    def monitor_news(self, keywords: List[str]) -> List[IntentSignal]:
        """监控新闻"""
        print(f"\n🔍 监控新闻关键词: {', '.join(keywords)}")

        # 示例数据
        mock_news = [
            {
                'title': 'ABC科技完成B轮5000万融资',
                'content': '本轮融资将用于团队扩张和市场推广...',
                'company': 'ABC科技'
            }
        ]

        signals = []
        for news in mock_news:
            signal = self.personnel_detector.detect_from_news(
                news['title'],
                news['content'],
                news['company']
            )
            if signal:
                signals.append(signal)
                self.signal_queue.append(signal)

        print(f"✅ 检测到 {len(signals)} 个人事信号")
        return signals

    def get_critical_signals(self) -> List[IntentSignal]:
        """获取极高紧迫度信号 - 立即出击"""
        return [s for s in self.signal_queue if s.urgency == UrgencyLevel.CRITICAL]

    def get_high_priority_signals(self) -> List[IntentSignal]:
        """获取高优先级信号"""
        return [s for s in self.signal_queue
                if s.urgency in [UrgencyLevel.CRITICAL, UrgencyLevel.HIGH]]

    def export_signals(self, filename: str = None):
        """导出信号数据"""
        if not filename:
            filename = f"intent_signals_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        data = {
            'total_signals': len(self.signal_queue),
            'critical': len([s for s in self.signal_queue if s.urgency == UrgencyLevel.CRITICAL]),
            'high': len([s for s in self.signal_queue if s.urgency == UrgencyLevel.HIGH]),
            'medium': len([s for s in self.signal_queue if s.urgency == UrgencyLevel.MEDIUM]),
            'low': len([s for s in self.signal_queue if s.urgency == UrgencyLevel.LOW]),
            'signals': [s.to_dict() for s in self.signal_queue]
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"\n✅ 信号数据已导出: {filename}")
        return filename

    def show_dashboard(self):
        """显示监控Dashboard"""
        print("\n" + "="*60)
        print("📊 意图信号监控Dashboard")
        print("="*60)

        total = len(self.signal_queue)
        if total == 0:
            print("\n暂无信号数据")
            return

        # 按紧迫度统计
        critical = len([s for s in self.signal_queue if s.urgency == UrgencyLevel.CRITICAL])
        high = len([s for s in self.signal_queue if s.urgency == UrgencyLevel.HIGH])
        medium = len([s for s in self.signal_queue if s.urgency == UrgencyLevel.MEDIUM])
        low = len([s for s in self.signal_queue if s.urgency == UrgencyLevel.LOW])

        print(f"\n总信号数: {total}")
        print(f"  🔴 极高紧迫: {critical} ({critical/total*100:.1f}%) - 立即出击")
        print(f"  🟠 高紧迫: {high} ({high/total*100:.1f}%) - 24小时内")
        print(f"  🟡 中紧迫: {medium} ({medium/total*100:.1f}%) - 3天内")
        print(f"  🟢 低紧迫: {low} ({low/total*100:.1f}%) - 1周内")

        # 按信号类型统计
        behavior = len([s for s in self.signal_queue if s.signal_type == SignalType.BEHAVIOR])
        technical = len([s for s in self.signal_queue if s.signal_type == SignalType.TECHNICAL])
        personnel = len([s for s in self.signal_queue if s.signal_type == SignalType.PERSONNEL])

        print(f"\n信号类型分布:")
        print(f"  👤 行为信号: {behavior} ({behavior/total*100:.1f}%)")
        print(f"  💻 技术信号: {technical} ({technical/total*100:.1f}%)")
        print(f"  🏢 人事信号: {personnel} ({personnel/total*100:.1f}%)")

        # 显示最新的极高紧迫信号
        critical_signals = self.get_critical_signals()
        if critical_signals:
            print(f"\n🔴 最新极高紧迫信号 (前5条):")
            for i, signal in enumerate(critical_signals[:5], 1):
                print(f"\n  {i}. {signal.signal_name}")
                print(f"     公司: {signal.company}")
                print(f"     联系人: {signal.contact_person or '待识别'}")
                print(f"     痛点: {signal.pain_point}")
                print(f"     财务损失: {signal.financial_loss}")
                print(f"     置信度: {signal.confidence*100:.0f}%")


def demo():
    """演示"""
    print("="*60)
    print("🎯 意图信号劫持引擎 - 演示")
    print("="*60)

    hijacker = IntentSignalHijacker()

    # 1. 监控小红书
    hijacker.monitor_xiaohongshu("获客工具", limit=50)

    # 2. 监控知乎
    hijacker.monitor_zhihu("B2B获客", limit=50)

    # 3. 监控GitHub
    hijacker.monitor_github(["crm", "sales", "lead-generation"])

    # 4. 监控招聘
    hijacker.monitor_job_postings(["ABC科技", "XYZ企业"])

    # 5. 监控LinkedIn
    hijacker.monitor_linkedin_changes(["ABC科技", "XYZ企业"])

    # 6. 监控新闻
    hijacker.monitor_news(["融资", "上市", "扩张"])

    # 显示Dashboard
    hijacker.show_dashboard()

    # 导出数据
    hijacker.export_signals()

    print("\n" + "="*60)
    print("✅ 演示完成!")
    print("="*60)


if __name__ == "__main__":
    demo()
