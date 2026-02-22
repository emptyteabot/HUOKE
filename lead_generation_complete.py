"""
完整获客系统 - 信号驱动版本 (留学行业专用)

功能:
1. 多平台抓取客户数据 (小红书、知乎、微博等)
2. 信号检测与意图识别 (行为/技术/人员信号)
3. AI智能线索评分与数据富化
4. 超个性化邮件生成 (信号驱动话术)
5. 量化淘汰机制 (200次触达止损线)
6. 多次触达序列自动化

使用方法:
python lead_generation_complete.py
"""

import time
import random
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import os
import sys
import re
import requests

# 导入已有模块
try:
    from lead_scoring import LeadScoringSystem
    from china_social_scraper import ChinaSocialScraper
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    SELENIUM_AVAILABLE = True
except ImportError as e:
    print(f"❌ 缺少依赖: {e}")
    print("请安装: pip install selenium undetected-chromedriver pandas openpyxl openai")
    SELENIUM_AVAILABLE = False


# ============================================================
# 信号驱动系统 - 留学行业专用
# ============================================================

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


class StudyAbroadSignalDetector:
    """留学行业信号检测器"""

    def __init__(self):
        # 留学行业特定信号模式
        self.signal_patterns = {
            '搜索留学申请': {
                'keywords': ['留学申请', '出国读研', '本科留学', '研究生申请', '博士申请'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '正在主动搜索留学信息,处于决策窗口期',
                'financial_loss': '错过申请季,延误一年时间成本'
            },
            '咨询语言考试': {
                'keywords': ['雅思', '托福', 'gre', 'gmat', '语言考试', '考试培训'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '语言成绩是申请门槛,急需提分',
                'financial_loss': '成绩不达标,无法申请目标院校'
            },
            '询问申请条件': {
                'keywords': ['申请条件', 'gpa要求', '录取要求', '能不能申请', '够不够'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '不确定自身条件,需要专业评估',
                'financial_loss': '盲目申请,浪费申请费和时间'
            },
            '费用焦虑': {
                'keywords': ['费用', '多少钱', '预算', '奖学金', '贷款', '负担得起'],
                'urgency': UrgencyLevel.MEDIUM,
                'pain_point': '担心留学费用过高,需要财务规划',
                'financial_loss': '没有合理规划,可能放弃留学机会'
            },
            '时间紧迫': {
                'keywords': ['来得及', '晚不晚', '什么时候开始', '截止时间', '赶不赶'],
                'urgency': UrgencyLevel.CRITICAL,
                'pain_point': '时间紧迫,需要快速规划',
                'financial_loss': '错过申请截止日期,延误一年'
            },
            '专业选择': {
                'keywords': ['什么专业', '专业推荐', '学什么好', '专业排名', '就业前景'],
                'urgency': UrgencyLevel.MEDIUM,
                'pain_point': '专业选择迷茫,需要职业规划',
                'financial_loss': '选错专业,影响未来职业发展'
            },
            '院校咨询': {
                'keywords': ['学校推荐', '大学排名', '哪个学校好', '院校选择'],
                'urgency': UrgencyLevel.HIGH,
                'pain_point': '不了解院校情况,需要专业建议',
                'financial_loss': '选择不匹配院校,影响录取率'
            },
            '成功案例': {
                'keywords': ['案例', '经验分享', '成功申请', '拿到offer', '录取'],
                'urgency': UrgencyLevel.MEDIUM,
                'pain_point': '需要参考成功案例,增强信心',
                'financial_loss': '缺乏经验指导,申请成功率低'
            }
        }

    def detect_from_content(self, content: str, author: str, platform: str, url: str = '') -> Optional[IntentSignal]:
        """从内容检测信号"""
        content_lower = content.lower()

        for signal_name, pattern in self.signal_patterns.items():
            # 关键词匹配
            matched_keywords = [kw for kw in pattern['keywords'] if kw in content_lower]

            if matched_keywords:
                confidence = min(len(matched_keywords) / len(pattern['keywords']), 1.0)

                return IntentSignal(
                    signal_type=SignalType.BEHAVIOR,
                    signal_name=f"{platform}-{signal_name}",
                    company=self._extract_institution(content),
                    contact_person=author,
                    detected_at=datetime.now(),
                    urgency=pattern['urgency'],
                    confidence=confidence,
                    raw_data={
                        'platform': platform,
                        'content': content[:200],
                        'url': url,
                        'matched_keywords': matched_keywords
                    },
                    pain_point=pattern['pain_point'],
                    financial_loss=pattern['financial_loss']
                )

        return None

    def _extract_institution(self, text: str) -> str:
        """从文本提取机构名"""
        # 简化版,实际应使用NER
        institution_keywords = ['留学机构', '中介', '咨询公司', '教育机构']
        for keyword in institution_keywords:
            if keyword in text:
                return "留学机构"
        return "个人学生"


class StrategyMetrics:
    """策略指标追踪"""

    def __init__(self, strategy_id: str):
        self.strategy_id = strategy_id
        self.total_sent = 0
        self.delivered = 0
        self.opened = 0
        self.replied = 0
        self.mql = 0
        self.sql = 0
        self.closed = 0

    @property
    def delivery_rate(self) -> float:
        return self.delivered / self.total_sent if self.total_sent > 0 else 0

    @property
    def open_rate(self) -> float:
        return self.opened / self.delivered if self.delivered > 0 else 0

    @property
    def reply_rate(self) -> float:
        return self.replied / self.delivered if self.delivered > 0 else 0

    def should_eliminate(self, stop_loss_threshold: float = 0.02, min_sample_size: int = 200) -> tuple:
        """判断是否应该淘汰"""
        # 样本量不足,继续观察
        if self.total_sent < min_sample_size:
            return False, f"样本量不足({self.total_sent}/{min_sample_size}),继续观察"

        # 回复率低于止损线
        if self.reply_rate < stop_loss_threshold:
            return True, f"回复率{self.reply_rate*100:.2f}%低于止损线{stop_loss_threshold*100}%"

        # 送达率过低
        if self.delivery_rate < 0.8:
            return True, f"送达率{self.delivery_rate*100:.1f}%过低"

        return False, "策略表现正常"


class DeepSeekEmailGenerator:
    """DeepSeek API邮件生成器"""

    def __init__(self, api_key: str = "sk-d86589fb80f248cea3f4a843eaebce5a"):
        self.api_key = api_key
        self.api_url = "https://api.deepseek.com/v1/chat/completions"

    def generate_signal_driven_email(self, signal: IntentSignal, lead: Dict) -> Dict:
        """基于信号生成个性化邮件"""

        name = lead.get('username', '同学')
        content = lead.get('content', '')

        # 构建prompt
        prompt = f"""你是一位专业的留学顾问,需要根据学生的意图信号生成一封个性化邮件。

【学生信息】
姓名: {name}
发布内容: {content[:200]}

【检测到的信号】
信号类型: {signal.signal_name}
紧迫度: {signal.urgency.value}
痛点: {signal.pain_point}
潜在损失: {signal.financial_loss}

【邮件要求】
1. 直接针对学生的痛点
2. 提供具体的解决方案
3. 使用真实数据和案例
4. 语气自然,不要营销感
5. 提供无风险的行动号召

请生成:
1. 邮件主题(简短有力)
2. 邮件正文(300字以内)

格式:
主题: [主题内容]

正文:
[正文内容]
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
                        {"role": "system", "content": "你是一位专业的留学顾问,擅长根据学生的具体需求生成个性化的咨询邮件。"},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 800
                },
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']

                # 解析主题和正文
                lines = content.strip().split('\n')
                subject = ""
                body = ""

                for i, line in enumerate(lines):
                    if line.startswith('主题:'):
                        subject = line.replace('主题:', '').strip()
                    elif line.startswith('正文:'):
                        body = '\n'.join(lines[i+1:]).strip()
                        break

                if not subject:
                    subject = f"关于{signal.pain_point}的建议"
                if not body:
                    body = content

                return {
                    'subject': subject,
                    'body': body,
                    'signal': signal.to_dict(),
                    'generated_by': 'deepseek',
                    'generated_at': datetime.now().isoformat()
                }
            else:
                print(f"⚠️ DeepSeek API调用失败: {response.status_code}")
                return self._generate_fallback_email(signal, lead)

        except Exception as e:
            print(f"⚠️ DeepSeek API异常: {e}")
            return self._generate_fallback_email(signal, lead)

    def _generate_fallback_email(self, signal: IntentSignal, lead: Dict) -> Dict:
        """备用邮件生成(当API失败时)"""
        name = lead.get('username', '同学')

        subject = f"关于{signal.pain_point}的专业建议"

        body = f"""你好{name},

注意到你在{signal.signal_name.split('-')[0]}上关于留学的咨询,特别是{signal.pain_point}。

【现状分析】
{signal.pain_point},这是很多学生都会遇到的问题。

【潜在风险】
{signal.financial_loss}

【我们的方案】
作为专注留学申请的顾问,我们可以为你提供:
• 免费背景评估
• 个性化申请规划
• 院校选择建议
• 时间节点提醒

【无风险测试】
我可以先免费帮你做一份初步评估,你看看是否有帮助再决定。

期待你的回复。

此致
留学顾问 李老师
"""

        return {
            'subject': subject,
            'body': body,
            'signal': signal.to_dict(),
            'generated_by': 'fallback',
            'generated_at': datetime.now().isoformat()
        }


class HyperPersonalizedEmailGenerator:
    """超个性化邮件生成器 - 真正的个性化,不是模板填空"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict:
        """加载多种邮件模板风格"""
        return {
            'professional': {
                'name': '专业顾问风格',
                'tone': '专业、权威、数据驱动',
                'suitable_for': ['高分学生', '理性决策者']
            },
            'friendly': {
                'name': '朋友聊天风格',
                'tone': '轻松、亲切、接地气',
                'suitable_for': ['年轻学生', '感性决策者']
            },
            'story': {
                'name': '故事案例风格',
                'tone': '故事化、场景化、代入感强',
                'suitable_for': ['犹豫不决者', '需要激励者']
            },
            'problem_solver': {
                'name': '问题解决风格',
                'tone': '直击痛点、提供方案',
                'suitable_for': ['有明确问题者', '急需帮助者']
            }
        }

    def extract_concerns_from_content(self, content: str) -> Dict:
        """深度提取关注点 - 不只是关键词匹配"""

        concerns = {
            'primary': [],      # 主要关注点
            'secondary': [],    # 次要关注点
            'emotions': [],     # 情绪状态
            'urgency': 'low',   # 紧迫程度
            'confidence': 'medium'  # 决策信心
        }

        content_lower = content.lower()

        # === 主要关注点分析 ===
        concern_patterns = {
            '费用焦虑': {
                'keywords': ['费用', '多少钱', '预算', '便宜', '贵', '负担', '经济', '奖学金', '贷款'],
                'weight': 0,
                'signals': []
            },
            '申请难度': {
                'keywords': ['难度', '要求', '条件', 'gpa', '托福', '雅思', '成绩', '够不够', '能不能'],
                'weight': 0,
                'signals': []
            },
            '时间压力': {
                'keywords': ['时间', '来得及', '晚不晚', '什么时候', '规划', '准备', '截止', '赶不赶'],
                'weight': 0,
                'signals': []
            },
            '专业迷茫': {
                'keywords': ['专业', '什么专业', '学什么', '方向', '选择', '不知道', '迷茫', '纠结'],
                'weight': 0,
                'signals': []
            },
            '院校选择': {
                'keywords': ['学校', '大学', '院校', '推荐', '排名', '哪个好', '选哪个'],
                'weight': 0,
                'signals': []
            },
            '就业前景': {
                'keywords': ['就业', '工作', '找工作', '回国', '留下', '前景', '薪资', '发展'],
                'weight': 0,
                'signals': []
            },
            '安全顾虑': {
                'keywords': ['安全', '治安', '危险', '担心', '害怕', '父母', '家人'],
                'weight': 0,
                'signals': []
            }
        }

        # 计算每个关注点的权重
        for concern, data in concern_patterns.items():
            for keyword in data['keywords']:
                if keyword in content_lower:
                    data['weight'] += 1
                    data['signals'].append(keyword)

        # 提取主要和次要关注点
        sorted_concerns = sorted(concern_patterns.items(), key=lambda x: x[1]['weight'], reverse=True)

        for concern, data in sorted_concerns:
            if data['weight'] >= 2:
                concerns['primary'].append({
                    'name': concern,
                    'weight': data['weight'],
                    'signals': data['signals']
                })
            elif data['weight'] == 1:
                concerns['secondary'].append({
                    'name': concern,
                    'weight': data['weight'],
                    'signals': data['signals']
                })

        # === 情绪状态分析 ===
        emotion_patterns = {
            '焦虑': ['担心', '害怕', '紧张', '焦虑', '不安', '压力'],
            '迷茫': ['不知道', '迷茫', '纠结', '困惑', '不确定'],
            '兴奋': ['想去', '期待', '梦想', '向往', '喜欢'],
            '犹豫': ['但是', '可是', '不过', '还是', '要不要', '值不值'],
            '急迫': ['急', '赶紧', '快', '马上', '立刻', '来不及']
        }

        for emotion, keywords in emotion_patterns.items():
            if any(kw in content_lower for kw in keywords):
                concerns['emotions'].append(emotion)

        # === 紧迫程度判断 ===
        urgency_signals = {
            'high': ['马上', '立刻', '急', '来不及', '截止', '最后'],
            'medium': ['尽快', '赶紧', '什么时候', '时间'],
            'low': ['考虑', '了解', '看看', '想想']
        }

        for level, keywords in urgency_signals.items():
            if any(kw in content_lower for kw in keywords):
                concerns['urgency'] = level
                break

        # === 决策信心判断 ===
        if any(kw in content_lower for kw in ['一定', '肯定', '决定了', '就去']):
            concerns['confidence'] = 'high'
        elif any(kw in content_lower for kw in ['不知道', '迷茫', '纠结', '犹豫']):
            concerns['confidence'] = 'low'

        return concerns

    def select_template_style(self, lead: Dict, concerns: Dict) -> str:
        """根据线索特征选择最合适的模板风格"""

        score = lead.get('score', 0)
        emotions = concerns.get('emotions', [])
        confidence = concerns.get('confidence', 'medium')

        # 高分理性学生 -> 专业风格
        if score >= 80 and confidence == 'high':
            return 'professional'

        # 迷茫犹豫 -> 故事风格
        if '迷茫' in emotions or '犹豫' in emotions:
            return 'story'

        # 有明确问题 -> 问题解决风格
        if len(concerns.get('primary', [])) >= 2:
            return 'problem_solver'

        # 默认友好风格
        return 'friendly'

    def generate_subject_line(self, lead: Dict, concerns: Dict, style: str) -> List[str]:
        """生成多个主题行供A/B测试"""

        name = lead.get('username', '同学')
        primary_concern = concerns['primary'][0]['name'] if concerns['primary'] else '留学规划'

        subjects = []

        # 风格1: 直接价值
        subjects.append({
            'text': f"关于{primary_concern}的3个建议",
            'type': 'value',
            'expected_open_rate': 0.25
        })

        # 风格2: 个性化
        subjects.append({
            'text': f"{name},看到你关心{primary_concern}",
            'type': 'personalized',
            'expected_open_rate': 0.30
        })

        # 风格3: 好奇心
        subjects.append({
            'text': f"为什么80%的人在{primary_concern}上踩坑?",
            'type': 'curiosity',
            'expected_open_rate': 0.28
        })

        # 风格4: 紧迫感 (仅在高紧迫度时使用)
        if concerns['urgency'] == 'high':
            subjects.append({
                'text': f"现在解决{primary_concern}还来得及",
                'type': 'urgency',
                'expected_open_rate': 0.32
            })

        # 风格5: 社交证明
        subjects.append({
            'text': f"帮300+学生解决{primary_concern}的经验",
            'type': 'social_proof',
            'expected_open_rate': 0.27
        })

        return subjects

    def generate_email_body(self, lead: Dict, concerns: Dict, style: str) -> str:
        """根据风格生成邮件正文"""

        name = lead.get('username', '同学')
        content = lead.get('content', '')
        primary_concerns = concerns.get('primary', [])

        if not primary_concerns:
            primary_concerns = [{'name': '留学规划', 'signals': []}]

        main_concern = primary_concerns[0]['name']
        signals = primary_concerns[0].get('signals', [])

        # 根据不同风格生成正文
        if style == 'professional':
            return self._generate_professional_email(name, main_concern, signals, content)
        elif style == 'friendly':
            return self._generate_friendly_email(name, main_concern, signals, content)
        elif style == 'story':
            return self._generate_story_email(name, main_concern, signals, content)
        else:  # problem_solver
            return self._generate_problem_solver_email(name, main_concern, signals, content)

    def _generate_professional_email(self, name: str, concern: str, signals: List, content: str) -> str:
        """专业顾问风格"""

        # 提取具体数字和细节
        specific_detail = signals[0] if signals else concern

        return f"""你好{name},

注意到你在讨论{concern}相关的问题,特别是提到了"{specific_detail}"。

作为专注留学申请的顾问,我想分享一些数据和经验:

【关于{concern}的3个关键数据】

1. 根据2025年录取数据,{concern}是影响申请成功率的TOP3因素
2. 提前规划的学生,成功率提升40%
3. 我们帮助过的学生中,85%在{concern}上有过困惑

【针对你的情况】

从你的描述来看,你目前处于[分析阶段]。建议:

→ 短期(1-2周): [具体行动]
→ 中期(1-2月): [具体行动]
→ 长期(3-6月): [具体行动]

如果需要,我可以给你发一份《{concern}完整规划表》,包含时间节点、注意事项、常见误区。

回复"需要"即可获取。

李老师
留学规划师"""

    def _generate_friendly_email(self, name: str, concern: str, signals: List, content: str) -> str:
        """朋友聊天风格"""

        return f"""嗨{name},

刚看到你在讨论{concern},感觉咱俩关心的问题挺像的😄

我之前也纠结过这个,后来发现其实没那么复杂。简单说就是:

1️⃣ 先搞清楚自己的情况(这个最重要)
2️⃣ 找到对标案例(看看别人怎么做的)
3️⃣ 制定可执行的计划(别想太多,先动起来)

关于{concern},我这边有一些实用的资料和案例,都是真实学生的经历,看完基本就清楚了。

需要的话我发给你?

对了,有啥问题随时问,不用客气~

李老师"""

    def _generate_story_email(self, name: str, concern: str, signals: List, content: str) -> str:
        """故事案例风格 - 根据不同关注点讲不同故事"""

        # 根据关注点定制故事
        stories = {
            '费用焦虑': {
                'student': '小陈',
                'background': 'GPA 3.5,家庭年收入30万',
                'problem': '担心留学费用太高,家里负担不起',
                'solution': '我们帮她规划了奖学金申请策略,最终拿到了50%学费减免',
                'result': '4年下来比预期少花了60万,还通过校内工作赚了10万',
                'quote': '原来留学没想象中那么贵,关键是要会规划'
            },
            '时间压力': {
                'student': '小王',
                'background': '大三下学期才开始准备,托福还没考',
                'problem': '觉得时间太紧张,来不及了',
                'solution': '我们给他制定了3个月冲刺计划,每周都有明确目标',
                'result': '3个月后托福105,GPA提到3.7,拿到了3个TOP30 offer',
                'quote': '时间紧不可怕,可怕的是没有清晰的计划'
            },
            '专业迷茫': {
                'student': '小刘',
                'background': '对商科和计算机都感兴趣,不知道选哪个',
                'problem': '纠结专业选择,担心选错了后悔',
                'solution': '我们用职业测评+行业分析+校友访谈,帮她找到了最适合的方向',
                'result': '最终选了商业分析,结合了两个兴趣,现在在Google做产品经理',
                'quote': '不是选对专业,而是让专业适合你'
            },
            '申请难度': {
                'student': '小张',
                'background': 'GPA 3.3,托福95,背景一般',
                'problem': '觉得自己条件不够,申不到好学校',
                'solution': '我们帮他挖掘了独特经历,打磨了文书,突出了个人特质',
                'result': '最终拿到了NYU、BU、UIUC的offer,证明了背景不是唯一标准',
                'quote': '申请看的不只是成绩,更看你的故事'
            }
        }

        # 选择最匹配的故事
        story = stories.get(concern, stories['时间压力'])

        return f"""你好{name},

看到你在讨论{concern},让我想起去年帮助过的一个学生——{story['student']}。

她当时的情况:{story['background']}。

她跟我说:"{story['problem']}"

听起来是不是和你现在的感受很像?

后来我们一起做了这几件事:

【第1步】深入分析
→ {story['solution']}

【第2步】制定方案
→ 不是泛泛而谈,而是针对她的具体情况
→ 每一步都有明确的时间节点和可衡量的目标

【第3步】执行落地
→ 每周check-in,及时调整
→ 遇到问题立刻解决,不拖延

结果:{story['result']}

她后来跟我说:"{story['quote']}"

{name},你现在的困惑,可能就是未来成功的起点。

如果需要,我可以给你发一份详细的规划方案,就像当时给{story['student']}做的那样。

期待你的回复。

李老师
留学规划师"""

    def _generate_problem_solver_email(self, name: str, concern: str, signals: List, content: str) -> str:
        """问题解决风格 - 根据不同关注点提供不同解决方案"""

        # 根据关注点定制解决方案
        solutions = {
            '费用焦虑': {
                'problems': [
                    ('信息不透明', '不知道真实费用是多少', '给你一份《美国TOP50大学费用明细表》,包含学费、生活费、隐藏成本'),
                    ('奖学金难拿', '不知道怎么申请奖学金', '分享《奖学金申请完整攻略》,包含10+种奖学金类型和申请技巧'),
                    ('没有规划', '不知道怎么控制预算', '提供《留学费用规划表》,教你如何省钱、如何打工、如何理财')
                ]
            },
            '时间压力': {
                'problems': [
                    ('任务不清晰', '不知道要做什么', '给你一份《申请任务清单》,列出所有要做的事'),
                    ('时间不够用', '感觉来不及了', '分享《3个月冲刺计划》,告诉你如何高效利用时间'),
                    ('容易拖延', '总是推迟行动', '提供《每周行动表》,把大目标拆成小任务')
                ]
            },
            '专业迷茫': {
                'problems': [
                    ('不了解专业', '不知道各专业学什么', '给你一份《热门专业详解》,包含课程设置、就业方向'),
                    ('不了解自己', '不知道自己适合什么', '分享《职业测评工具》,帮你找到兴趣和优势'),
                    ('担心就业', '不知道毕业后好不好找工作', '提供《专业就业数据报告》,包含薪资、就业率、发展前景')
                ]
            },
            '申请难度': {
                'problems': [
                    ('不知道要求', '不清楚学校要什么', '给你一份《TOP50录取要求表》,包含GPA、托福、软背景'),
                    ('背景不够', '担心自己条件不够', '分享《背景提升方案》,教你如何弥补短板'),
                    ('不会包装', '不知道怎么展示自己', '提供《文书写作指南》,教你讲好自己的故事')
                ]
            }
        }

        # 选择最匹配的解决方案
        solution_set = solutions.get(concern, solutions['时间压力'])

        problems_text = ""
        for i, (title, desc, solution) in enumerate(solution_set['problems'], 1):
            problems_text += f"""【问题{i}】{title}
→ 现状: {desc}
→ 解决方案: {solution}

"""

        return f"""你好{name},

直接说重点:关于{concern},你需要解决3个问题。

{problems_text}
这3个问题解决了,{concern}就不是问题了。

需要这些资料的话,回复"需要"。

我会在24小时内发给你。

李老师
留学规划师

P.S. 这些资料都是免费的,不用担心。"""

    def calculate_email_quality_score(self, email: Dict, lead: Dict, concerns: Dict) -> Dict:
        """计算邮件质量评分"""

        subject = email['subject']
        body = email['body']

        scores = {
            'personalization': 0,      # 个性化程度 (0-25)
            'relevance': 0,            # 相关性 (0-25)
            'value': 0,                # 价值感 (0-25)
            'naturalness': 0,          # 自然度 (0-25)
            'total': 0
        }

        # === 个性化评分 ===
        name = lead.get('username', '')
        if name and name in body:
            scores['personalization'] += 10

        # 是否提到具体关注点
        if concerns['primary']:
            concern_mentioned = sum(1 for c in concerns['primary'] if c['name'] in body)
            scores['personalization'] += min(concern_mentioned * 5, 15)

        # === 相关性评分 ===
        # 是否针对主要关注点
        if concerns['primary'] and concerns['primary'][0]['name'] in subject:
            scores['relevance'] += 10

        # 是否提到具体信号词
        signal_count = 0
        for concern in concerns['primary']:
            signal_count += sum(1 for sig in concern['signals'] if sig in body)
        scores['relevance'] += min(signal_count * 3, 15)

        # === 价值感评分 ===
        value_keywords = ['数据', '案例', '经验', '方案', '规划', '建议', '资料', '清单']
        value_count = sum(1 for kw in value_keywords if kw in body)
        scores['value'] += min(value_count * 3, 15)

        # 是否有具体的CTA
        if any(cta in body for cta in ['回复', '需要', '获取', '联系']):
            scores['value'] += 10

        # === 自然度评分 ===
        # 避免营销词汇
        spam_words = ['限时', '优惠', '折扣', '免费咨询', '立即', '马上']
        spam_count = sum(1 for word in spam_words if word in body)
        scores['naturalness'] += max(25 - spam_count * 5, 0)

        # 计算总分
        scores['total'] = sum([
            scores['personalization'],
            scores['relevance'],
            scores['value'],
            scores['naturalness']
        ])

        # 评级
        if scores['total'] >= 80:
            scores['grade'] = 'A'
            scores['comment'] = '优秀 - 高度个性化,自然真诚'
        elif scores['total'] >= 60:
            scores['grade'] = 'B'
            scores['comment'] = '良好 - 有一定个性化,可以发送'
        elif scores['total'] >= 40:
            scores['grade'] = 'C'
            scores['comment'] = '一般 - 建议优化后再发送'
        else:
            scores['grade'] = 'D'
            scores['comment'] = '较差 - 需要重新生成'

        return scores

    def generate_personalized_email(self, lead: Dict) -> Dict:
        """生成超个性化邮件 - 主入口"""

        # 1. 深度提取关注点
        content = lead.get('content', '') + ' ' + lead.get('notes', '')
        concerns = self.extract_concerns_from_content(content)

        # 2. 选择最合适的模板风格
        style = self.select_template_style(lead, concerns)

        # 3. 生成多个主题行(A/B测试)
        subjects = self.generate_subject_line(lead, concerns, style)

        # 4. 生成邮件正文
        body = self.generate_email_body(lead, concerns, style)

        # 5. 组装邮件
        email = {
            'subject': subjects[0]['text'],  # 默认使用第一个
            'subject_variants': subjects,     # 保存所有变体
            'body': body,
            'style': style,
            'concerns': concerns
        }

        # 6. 计算质量评分
        quality_score = self.calculate_email_quality_score(email, lead, concerns)
        email['quality_score'] = quality_score

        return email


class MultiTouchSequence:
    """多次触达序列"""

    def __init__(self):
        self.sequences = {
            'day_1': {
                'delay_days': 0,
                'type': '首次邮件',
                'goal': '建立联系 + 提供价值'
            },
            'day_3': {
                'delay_days': 3,
                'type': '跟进邮件',
                'goal': '补充信息 + 案例分享'
            },
            'day_7': {
                'delay_days': 7,
                'type': '价值邮件',
                'goal': '免费资料 + 限时优惠'
            },
            'day_14': {
                'delay_days': 14,
                'type': '最后跟进',
                'goal': '总结价值 + 紧迫感'
            }
        }

    def generate_sequence(self, lead: Dict) -> List[Dict]:
        """生成完整触达序列"""

        name = lead.get('name', '同学')
        target_country = lead.get('target_country', '美国')
        target_degree = lead.get('target_degree', '本科')
        major = lead.get('major', '商科')

        sequence = []

        # Day 1: 首次邮件
        sequence.append({
            'day': 1,
            'send_date': datetime.now(),
            'subject': f"关于您在小红书咨询的{target_country}{target_degree}申请",
            'body': f"""您好 {name},

看到您在小红书上关于{target_country}{target_degree}申请的咨询。

我是专注{target_country}{target_degree}申请的顾问,可以为您提供:
• 免费背景评估
• 院校选择建议
• 申请时间规划

如果方便,我可以给您发一份{target_country}TOP50大学录取要求表?

期待您的回复!

此致
留学顾问 李老师""",
            'condition': '立即发送'
        })

        # Day 3: 跟进邮件
        sequence.append({
            'day': 3,
            'send_date': datetime.now() + timedelta(days=3),
            'subject': f"Re: {target_country}{target_degree}申请时间规划表",
            'body': f"""您好 {name},

之前给您发过关于{target_country}{target_degree}申请的邮件,不知道您是否收到?

我整理了一份2026年{target_country}{target_degree}申请时间规划表,包括:
• 每个月需要完成的任务
• 标准化考试时间节点
• 网申截止日期

另外,我们最近帮助一位背景相似的学生拿到了哥伦比亚大学的offer,可以分享给您参考。

如果您感兴趣,回复这封邮件即可获取!

此致
留学顾问 李老师""",
            'condition': '如果Day1未打开'
        })

        # Day 7: 价值邮件
        sequence.append({
            'day': 7,
            'send_date': datetime.now() + timedelta(days=7),
            'subject': f"[资料] 2026{target_country}TOP50大学{major}专业录取要求",
            'body': f"""您好 {name},

我为您准备了一份{target_country}TOP50大学{major}专业录取要求表,包括:
• GPA/托福/GRE要求
• 申请截止日期
• 录取率和竞争情况
• 奖学金信息

【限时福利】
前20名咨询的学生可免费获得:
1. 背景评估报告 (价值¥1,000)
2. 文书修改服务 (价值¥2,000)
3. 模拟面试辅导 (价值¥1,500)

回复"领取资料"即可获得!

此致
留学顾问 李老师""",
            'condition': '如果Day1打开但未回复'
        })

        # Day 14: 最后跟进
        sequence.append({
            'day': 14,
            'send_date': datetime.now() + timedelta(days=14),
            'subject': f"最后一次联系 - 关于您的{target_country}{target_degree}规划",
            'body': f"""您好 {name},

这是我最后一次联系您。

过去两周,我给您发了:
• {target_country}{target_degree}申请时间规划表
• TOP50大学录取要求
• 成功案例分享
• 限时免费咨询福利

如果您现在还不需要,完全理解。

但如果您将来有任何关于{target_country}{target_degree}申请的问题,随时可以联系我。

祝您申请顺利!

此致
留学顾问 李老师

P.S. 如果您不希望再收到我的邮件,回复"退订"即可。""",
            'condition': '如果仍未回复'
        })

        return sequence


class CompleteLeadGenerationSystem:
    """完整获客系统 - 信号驱动版本"""

    def __init__(self):
        self.scraper = None
        self.scorer = LeadScoringSystem()
        self.signal_detector = StudyAbroadSignalDetector()
        self.email_generator = DeepSeekEmailGenerator()
        self.sequence_generator = MultiTouchSequence()
        self.leads = []
        self.signals = []
        self.strategy_metrics = {}  # 策略指标追踪

    def step1_scrape_leads(self, platform: str, keyword: str, limit: int = 10):
        """步骤1: 抓取线索"""
        print("\n" + "="*50)
        print("📱 步骤1: 抓取潜在客户数据")
        print("="*50)

        self.scraper = ChinaSocialScraper(platform, headless=False)
        self.scraper.run(keyword, limit)

        # 读取抓取结果
        excel_files = [f for f in os.listdir('.') if f.startswith(f'{platform}_leads_') and f.endswith('.xlsx')]
        if excel_files:
            latest_file = sorted(excel_files)[-1]
            df = pd.read_excel(latest_file)
            self.leads = df.to_dict('records')
            print(f"\n✅ 成功加载 {len(self.leads)} 条线索")
        else:
            print("\n❌ 未找到抓取数据")

    def step2_detect_signals(self):
        """步骤2: 检测意图信号"""
        print("\n" + "="*50)
        print("🎯 步骤2: 检测意图信号")
        print("="*50)

        if not self.leads:
            print("❌ 没有线索数据")
            return

        self.signals = []
        signal_stats = {}

        for lead in self.leads:
            content = lead.get('content', '')
            author = lead.get('username', '未知')
            platform = lead.get('platform', 'unknown')
            url = lead.get('url', '')

            # 检测信号
            signal = self.signal_detector.detect_from_content(content, author, platform, url)

            if signal:
                self.signals.append(signal)
                lead['signal'] = signal.to_dict()

                # 统计
                signal_type = signal.signal_name
                signal_stats[signal_type] = signal_stats.get(signal_type, 0) + 1
            else:
                lead['signal'] = None

        print(f"\n✅ 检测到 {len(self.signals)} 个意图信号")

        if signal_stats:
            print("\n信号分布:")
            for signal_type, count in sorted(signal_stats.items(), key=lambda x: x[1], reverse=True):
                print(f"  {signal_type}: {count}个")

        # 按紧迫度统计
        urgency_stats = {}
        for signal in self.signals:
            urgency = signal.urgency.value
            urgency_stats[urgency] = urgency_stats.get(urgency, 0) + 1

        if urgency_stats:
            print("\n紧迫度分布:")
            for urgency in ['极高', '高', '中', '低']:
                count = urgency_stats.get(urgency, 0)
                if count > 0:
                    print(f"  {urgency}: {count}个 ({count/len(self.signals)*100:.1f}%)")

    def step3_score_leads(self):
        """步骤3: AI评分"""
        print("\n" + "="*50)
        print("🎯 步骤3: AI智能线索评分")
        print("="*50)

        if not self.leads:
            print("❌ 没有线索数据")
            return

        # 批量评分
        scored_leads = self.scorer.batch_score(self.leads)
        self.leads = scored_leads

        # 显示评分结果
        print(f"\n评分完成:")
        grade_counts = {}
        for lead in self.leads:
            grade = lead.get('grade', 'D')
            grade_counts[grade] = grade_counts.get(grade, 0) + 1

        for grade in ['A', 'B', 'C', 'D']:
            count = grade_counts.get(grade, 0)
            print(f"  {grade}级: {count}个 ({count/len(self.leads)*100:.1f}%)")

        # 保存评分结果
        df = pd.DataFrame(self.leads)
        filename = f"scored_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        df.to_excel(filename, index=False)
        print(f"\n✅ 评分结果已保存: {filename}")

    def step4_generate_signal_driven_emails(self, grade_filter: str = 'A'):
        """步骤4: 生成信号驱动邮件"""
        print("\n" + "="*50)
        print("✉️ 步骤4: 生成信号驱动邮件")
        print("="*50)

        if not self.leads:
            print("❌ 没有线索数据")
            return []

        # 筛选有信号的高价值线索
        high_value_leads = [
            lead for lead in self.leads
            if lead.get('grade') == grade_filter and lead.get('signal') is not None
        ]

        print(f"\n找到 {len(high_value_leads)} 个{grade_filter}级且有信号的线索")

        if not high_value_leads:
            print("⚠️ 没有符合条件的线索,尝试降低筛选标准...")
            return []

        # 为每个线索生成邮件
        emails = []

        for idx, lead in enumerate(high_value_leads[:10]):  # 只处理前10个
            print(f"\n{'='*50}")
            print(f"进度: {idx+1}/{min(len(high_value_leads), 10)}")
            print(f"{'='*50}")
            print(f"线索: {lead.get('username', '未知')}")
            print(f"评分: {lead.get('score', 0)}")

            # 重建信号对象
            signal_dict = lead['signal']
            signal = IntentSignal(
                signal_type=SignalType.BEHAVIOR,
                signal_name=signal_dict['signal_name'],
                company=signal_dict['company'],
                contact_person=signal_dict['contact_person'],
                detected_at=datetime.fromisoformat(signal_dict['detected_at']),
                urgency=UrgencyLevel[signal_dict['urgency'].replace('极高', 'CRITICAL').replace('高', 'HIGH').replace('中', 'MEDIUM').replace('低', 'LOW')],
                confidence=signal_dict['confidence'],
                raw_data=signal_dict['raw_data'],
                pain_point=signal_dict['pain_point'],
                financial_loss=signal_dict['financial_loss']
            )

            print(f"信号: {signal.signal_name}")
            print(f"紧迫度: {signal.urgency.value}")
            print(f"痛点: {signal.pain_point}")

            # 生成邮件
            print("\n🤖 调用DeepSeek API生成邮件...")
            email = self.email_generator.generate_signal_driven_email(signal, lead)

            print(f"\n📧 主题: {email['subject']}")
            print(f"生成方式: {email['generated_by']}")

            # 保存到列表
            emails.append({
                'lead_name': lead.get('username', '未知'),
                'lead_score': lead.get('score', 0),
                'lead_grade': lead.get('grade', 'D'),
                'signal_type': signal.signal_name,
                'signal_urgency': signal.urgency.value,
                'pain_point': signal.pain_point,
                'subject': email['subject'],
                'body': email['body'],
                'generated_by': email['generated_by'],
                'generated_at': email['generated_at']
            })

            time.sleep(1)  # 避免API限流

        # 保存邮件
        df = pd.DataFrame(emails)
        filename = f"signal_driven_emails_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        df.to_excel(filename, index=False)
        print(f"\n✅ 邮件已保存: {filename}")

        return emails

    def step5_track_and_eliminate(self, emails: List[Dict]):
        """步骤5: 追踪与量化淘汰"""
        print("\n" + "="*50)
        print("📊 步骤5: 追踪与量化淘汰")
        print("="*50)

        if not emails:
            print("❌ 没有邮件数据")
            return

        print(f"\n开始追踪 {len(emails)} 封邮件的发送效果...")
        print("\n⚠️ 注意: 这是模拟追踪,实际使用时需要接入真实的邮件追踪系统")

        # 为每封邮件创建策略指标
        for email in emails:
            strategy_id = f"strategy_{email['lead_name']}"
            if strategy_id not in self.strategy_metrics:
                self.strategy_metrics[strategy_id] = StrategyMetrics(strategy_id)

            # 模拟发送
            metrics = self.strategy_metrics[strategy_id]
            metrics.total_sent += 1

            # 模拟送达率 90%
            if random.random() < 0.9:
                metrics.delivered += 1

                # 模拟打开率 25%
                if random.random() < 0.25:
                    metrics.opened += 1

                    # 模拟回复率 5%
                    if random.random() < 0.05:
                        metrics.replied += 1

        # 显示追踪结果
        print("\n📈 追踪结果:")
        total_sent = sum(m.total_sent for m in self.strategy_metrics.values())
        total_delivered = sum(m.delivered for m in self.strategy_metrics.values())
        total_opened = sum(m.opened for m in self.strategy_metrics.values())
        total_replied = sum(m.replied for m in self.strategy_metrics.values())

        print(f"  总发送: {total_sent}")
        print(f"  送达: {total_delivered} ({total_delivered/total_sent*100:.1f}%)")
        print(f"  打开: {total_opened} ({total_opened/total_delivered*100:.1f}%)")
        print(f"  回复: {total_replied} ({total_replied/total_delivered*100:.1f}%)")

        # 量化淘汰检查
        print("\n🔍 量化淘汰检查 (止损线: 200次触达, 回复率<2%):")
        for strategy_id, metrics in self.strategy_metrics.items():
            should_eliminate, reason = metrics.should_eliminate(
                stop_loss_threshold=0.02,
                min_sample_size=200
            )

            if should_eliminate:
                print(f"  ❌ {strategy_id}: {reason}")
            else:
                print(f"  ✅ {strategy_id}: {reason}")

    def run_complete_workflow(self):
        """运行完整工作流"""
        print("\n" + "="*50)
        print("🚀 信号驱动获客系统 - 留学行业专用")
        print("="*50)

        print("\n这个系统将帮您:")
        print("1. 从社交媒体抓取真实潜在客户")
        print("2. 检测意图信号(行为/技术/人员)")
        print("3. AI智能评分,识别高价值线索")
        print("4. 生成信号驱动的个性化邮件(DeepSeek API)")
        print("5. 追踪效果并执行量化淘汰(200次止损线)")

        # 输入参数
        print("\n" + "="*50)
        platform = input("\n请选择平台 (xiaohongshu/zhihu/weibo): ").strip().lower()
        if platform not in ['xiaohongshu', 'zhihu', 'weibo']:
            print("❌ 暂不支持该平台")
            return

        keyword = input("请输入搜索关键词 (例如: 美国留学): ").strip()
        if not keyword:
            keyword = "美国留学"

        limit = input("请输入要抓取的内容数量 (默认10): ").strip()
        limit = int(limit) if limit else 10

        # 执行完整流程
        try:
            # 步骤1: 抓取
            self.step1_scrape_leads(platform, keyword, limit)

            if not self.leads:
                print("\n❌ 抓取失败,退出")
                return

            # 步骤2: 检测信号
            self.step2_detect_signals()

            # 步骤3: 评分
            self.step3_score_leads()

            # 步骤4: 生成信号驱动邮件
            emails = self.step4_generate_signal_driven_emails(grade_filter='A')

            if not emails:
                print("\n⚠️ 没有A级线索,尝试B级...")
                emails = self.step4_generate_signal_driven_emails(grade_filter='B')

            if not emails:
                print("\n❌ 没有高价值线索")
                return

            # 步骤5: 追踪与淘汰
            self.step5_track_and_eliminate(emails)

            # 完成
            print("\n" + "="*50)
            print("🎉 完整流程执行完毕!")
            print("="*50)

            print("\n生成的文件:")
            print(f"1. scored_leads_*.xlsx - 评分后的线索(含信号)")
            print(f"2. signal_driven_emails_*.xlsx - 信号驱动邮件")

            print("\n下一步:")
            print("1. 查看Excel文件")
            print("2. 复制邮件内容")
            print("3. 发送邮件并追踪效果")
            print("4. 当触达200次且回复率<2%时,立即停止该策略")

        except Exception as e:
            print(f"\n❌ 执行出错: {e}")
            import traceback
            traceback.print_exc()


def main():
    """主函数"""
    if not SELENIUM_AVAILABLE:
        print("\n❌ 缺少依赖,无法运行")
        print("请安装: pip install selenium undetected-chromedriver pandas openpyxl")
        return

    system = CompleteLeadGenerationSystem()
    system.run_complete_workflow()


if __name__ == "__main__":
    main()
