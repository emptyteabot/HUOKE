"""
线索评分系统 - AI智能评分 (优化版)

根据多个维度自动评分,识别高价值线索
支持批量处理、详细解释、性能优化
"""

import re
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
from collections import defaultdict


class LeadScoringSystem:
    """线索评分系统 - 优化版"""

    def __init__(self):
        # === 意向强度关键词 (扩展版) ===
        self.high_intent_keywords = [
            # 咨询类
            "想咨询", "咨询一下", "详细咨询", "深度咨询", "求咨询",
            # 推荐类
            "求推荐", "推荐一下", "帮忙推荐", "有推荐吗", "推荐个",
            # 申请类
            "怎么申请", "如何申请", "申请流程", "想申请", "准备申请", "马上申请",
            # 行动类
            "马上", "尽快", "立刻", "立即", "现在就", "今天", "明天",
            # 联系类
            "加微信", "加vx", "加wx", "私信", "私聊", "联系方式", "电话", "手机号",
            # 求助类
            "求助", "帮帮忙", "求帮助", "帮我", "救命",
            # 询问类
            "请问", "想问", "问一下", "请教", "求教",
            # 意向类
            "想去", "打算", "准备", "考虑", "有意向", "感兴趣", "很想", "特别想",
            # 介绍类
            "求介绍", "介绍一下", "帮忙介绍", "有介绍吗",
            # 决策类
            "决定了", "就选", "确定", "定了", "选择",
            # 对比类
            "对比一下", "比较一下", "哪个好", "选哪个",
            # 紧急类
            "急需", "急求", "着急", "赶时间", "来不及了",
        ]

        self.medium_intent_keywords = [
            # 了解类
            "了解一下", "了解下", "想了解", "想知道", "知道吗",
            # 查看类
            "看看", "瞧瞧", "查一下", "查查", "搜一下",
            # 询问类
            "有没有", "有吗", "存在吗", "可以吗", "行吗",
            # 求问类
            "求问", "问问", "请问下", "有人知道吗", "谁知道",
            # 分享类
            "求分享", "分享一下", "分享下", "有分享吗",
            # 经验类
            "有经验吗", "有人试过吗", "有案例吗", "有例子吗",
            # 建议类
            "给点建议", "有建议吗", "建议一下", "意见",
        ]

        self.low_intent_keywords = [
            # 观望类
            "随便看看", "先看看", "了解了解", "研究研究",
            # 犹豫类
            "再说", "再看", "考虑考虑", "想想", "犹豫",
            # 未来类
            "以后", "将来", "未来", "有空再", "有时间再",
        ]

        # === 预算能力关键词 (扩展版) ===
        self.budget_keywords = {
            'high': [
                # 直接表述
                "不差钱", "预算充足", "预算足够", "预算不是问题", "钱不是问题",
                "不限预算", "无预算限制", "预算宽裕", "资金充足",
                # 高额预算
                "100万", "150万", "200万", "300万", "500万", "上百万", "几百万",
                "100w", "150w", "200w", "300w", "500w",
                # 高端需求
                "要最好的", "要顶级的", "高端", "奢华", "豪华", "VIP", "定制",
                "不在乎价格", "只要好的", "质量第一",
            ],
            'medium': [
                # 中等预算
                "50万", "60万", "70万", "80万", "90万",
                "50w", "60w", "70w", "80w", "90w",
                # 正常预算
                "正常预算", "一般预算", "中等预算", "合理预算", "标准预算",
                "主流价格", "市场价", "正常价位",
            ],
            'low': [
                # 低预算
                "20万", "30万", "40万", "20w", "30w", "40w",
                # 省钱类
                "便宜", "省钱", "实惠", "划算", "经济", "节省",
                "性价比", "高性价比", "物美价廉", "价格低",
                # 优惠类
                "打折", "优惠", "促销", "特价", "降价", "便宜点",
                "有折扣吗", "能便宜吗", "最低价",
            ]
        }

        # === 时间紧迫度关键词 (扩展版) ===
        self.urgency_keywords = {
            'high': [
                # 立即类
                "马上", "尽快", "急", "立刻", "立即", "现在", "赶紧",
                "今天", "明天", "这两天", "最近两天",
                # 紧急类
                "紧急", "着急", "很急", "特别急", "非常急", "火烧眉毛",
                "来不及", "赶不上", "快来不及了", "时间紧",
                # 截止类
                "deadline", "截止", "最后期限", "来不及了",
            ],
            'medium': [
                # 近期类
                "这周", "本周", "下周", "这个月", "本月", "下个月",
                "近期", "最近", "不久", "快了", "很快",
                # 计划类
                "计划中", "安排中", "准备中", "筹备中",
            ],
            'low': [
                # 未来类
                "以后", "将来", "未来", "有空", "有时间",
                # 犹豫类
                "考虑中", "再看看", "再说", "不着急", "慢慢来",
                "先了解", "先看看", "研究一下",
            ]
        }

        # === 行为特征关键词 (新增) ===
        self.behavior_keywords = {
            'decision_maker': [
                # 决策者标识
                "我是老板", "我是CEO", "我是总经理", "我是负责人", "我负责",
                "我决定", "我来定", "我说了算", "我拍板",
                "公司", "企业", "团队", "部门",
            ],
            'influencer': [
                # 影响者标识
                "我推荐", "我建议", "我觉得", "我认为",
                "帮朋友问", "帮同事问", "帮家人问",
            ],
            'researcher': [
                # 研究者标识
                "对比", "比较", "分析", "研究", "调研",
                "看了很多", "查了很多", "了解了很多",
            ]
        }

        # === 联系方式模式 (新增) ===
        self.contact_patterns = {
            'wechat': r'(微信|vx|wx|weixin|wechat)[：:号]?\s*([a-zA-Z0-9_-]+)',
            'phone': r'(电话|手机|tel|phone)[：:号]?\s*(\d{11}|\d{3}-\d{8}|\d{4}-\d{7})',
            'email': r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            'qq': r'(qq|QQ)[：:号]?\s*(\d{5,12})',
        }

        # === 负面关键词 (新增) ===
        self.negative_keywords = [
            "骗子", "假的", "不靠谱", "不信", "怀疑", "质疑",
            "太贵", "贵死了", "抢钱", "黑心",
            "不考虑", "不需要", "不想", "算了", "放弃",
        ]

        # 编译正则表达式 (性能优化)
        self._compile_patterns()

    def _compile_patterns(self):
        """编译正则表达式 (性能优化)"""
        self.compiled_patterns = {}
        for name, pattern in self.contact_patterns.items():
            self.compiled_patterns[name] = re.compile(pattern, re.IGNORECASE)

    def score_intent(self, content: str) -> Tuple[int, List[str]]:
        """
        评分意向强度 (0-40分)

        Args:
            content: 评论内容

        Returns:
            Tuple[int, List[str]]: (意向分数, 匹配的关键词列表)
        """
        score = 0
        matched_keywords = []
        content_lower = content.lower()

        # 高意向关键词 +8分/个 (最多3个)
        high_count = 0
        for keyword in self.high_intent_keywords:
            if keyword in content_lower and high_count < 3:
                score += 8
                matched_keywords.append(f"高意向:{keyword}")
                high_count += 1

        # 中意向关键词 +4分/个 (最多3个)
        medium_count = 0
        for keyword in self.medium_intent_keywords:
            if keyword in content_lower and medium_count < 3:
                score += 4
                matched_keywords.append(f"中意向:{keyword}")
                medium_count += 1

        # 低意向关键词 -5分/个
        for keyword in self.low_intent_keywords:
            if keyword in content_lower:
                score -= 5
                matched_keywords.append(f"低意向:{keyword}")

        # 最高40分,最低0分
        return max(0, min(score, 40)), matched_keywords

    def score_budget(self, lead: Dict) -> Tuple[int, List[str]]:
        """
        评分预算能力 (0-25分)

        Args:
            lead: 线索数据

        Returns:
            Tuple[int, List[str]]: (预算分数, 匹配的关键词列表)
        """
        score = 0
        matched_keywords = []

        # 从预算字段评分
        budget = lead.get('budget', '').lower()
        content = lead.get('content', '').lower() + lead.get('notes', '').lower()
        full_text = budget + content

        # 高预算 25分
        for kw in self.budget_keywords['high']:
            if kw in full_text:
                score = 25
                matched_keywords.append(f"高预算:{kw}")
                break

        # 中预算 15分
        if score == 0:
            for kw in self.budget_keywords['medium']:
                if kw in full_text:
                    score = 15
                    matched_keywords.append(f"中预算:{kw}")
                    break

        # 低预算 5分
        if score == 0:
            for kw in self.budget_keywords['low']:
                if kw in full_text:
                    score = 5
                    matched_keywords.append(f"低预算:{kw}")
                    break

        return score, matched_keywords

    def score_urgency(self, lead: Dict) -> Tuple[int, List[str]]:
        """
        评分时间紧迫度 (0-20分)

        Args:
            lead: 线索数据

        Returns:
            Tuple[int, List[str]]: (紧迫度分数, 匹配的关键词列表)
        """
        score = 0
        matched_keywords = []
        content = lead.get('content', '').lower() + lead.get('notes', '').lower()

        # 高紧迫度 20分
        for kw in self.urgency_keywords['high']:
            if kw in content:
                score = 20
                matched_keywords.append(f"高紧迫:{kw}")
                break

        # 中紧迫度 12分
        if score == 0:
            for kw in self.urgency_keywords['medium']:
                if kw in content:
                    score = 12
                    matched_keywords.append(f"中紧迫:{kw}")
                    break

        # 低紧迫度 3分
        if score == 0:
            for kw in self.urgency_keywords['low']:
                if kw in content:
                    score = 3
                    matched_keywords.append(f"低紧迫:{kw}")
                    break

        return score, matched_keywords

    def score_engagement(self, lead: Dict) -> Tuple[int, List[str]]:
        """
        评分互动活跃度 (0-15分)

        Args:
            lead: 线索数据

        Returns:
            Tuple[int, List[str]]: (活跃度分数, 匹配的特征列表)
        """
        score = 0
        features = []
        content = lead.get('content', '') + lead.get('notes', '')

        # 评论长度 (越长越认真)
        content_length = len(lead.get('content', ''))
        if content_length > 150:
            score += 5
            features.append(f"长评论:{content_length}字")
        elif content_length > 80:
            score += 3
            features.append(f"中评论:{content_length}字")
        elif content_length > 30:
            score += 1
            features.append(f"短评论:{content_length}字")

        # 是否留联系方式 (重要!)
        contact_found = False
        for contact_type, pattern in self.compiled_patterns.items():
            if pattern.search(content):
                score += 5
                features.append(f"留{contact_type}")
                contact_found = True
                break

        # 简单联系方式检测
        if not contact_found:
            if any(kw in content for kw in ['微信', '电话', '邮箱', 'wx', 'vx', 'qq']):
                score += 3
                features.append("提及联系方式")

        # 问号数量 (表示询问意愿)
        question_count = content.count('?') + content.count('?')
        if question_count >= 2:
            score += 2
            features.append(f"多次询问:{question_count}次")
        elif question_count == 1:
            score += 1
            features.append("有询问")

        return min(score, 15), features

    def score_behavior(self, lead: Dict) -> Tuple[int, List[str]]:
        """
        评分行为特征 (0-10分) - 新增维度

        Args:
            lead: 线索数据

        Returns:
            Tuple[int, List[str]]: (行为分数, 匹配的特征列表)
        """
        score = 0
        features = []
        content = lead.get('content', '').lower() + lead.get('notes', '').lower()

        # 决策者 +10分 (最重要!)
        for kw in self.behavior_keywords['decision_maker']:
            if kw in content:
                score = 10
                features.append(f"决策者:{kw}")
                return score, features

        # 影响者 +6分
        for kw in self.behavior_keywords['influencer']:
            if kw in content:
                score = max(score, 6)
                features.append(f"影响者:{kw}")

        # 研究者 +4分
        for kw in self.behavior_keywords['researcher']:
            if kw in content:
                score = max(score, 4)
                features.append(f"研究者:{kw}")

        return score, features

    def score_negative(self, lead: Dict) -> Tuple[int, List[str]]:
        """
        负面因素扣分 (0到-20分) - 新增维度

        Args:
            lead: 线索数据

        Returns:
            Tuple[int, List[str]]: (负面分数, 匹配的关键词列表)
        """
        score = 0
        matched_keywords = []
        content = lead.get('content', '').lower() + lead.get('notes', '').lower()

        # 负面关键词 -5分/个
        for keyword in self.negative_keywords:
            if keyword in content:
                score -= 5
                matched_keywords.append(f"负面:{keyword}")

        return max(score, -20), matched_keywords

    def score_time_decay(self, lead: Dict) -> Tuple[float, str]:
        """
        时间衰减系数 (0.5-1.0) - 新增维度

        Args:
            lead: 线索数据

        Returns:
            Tuple[float, str]: (时间系数, 说明)
        """
        # 如果没有时间字段,默认为当前时间
        created_at = lead.get('created_at')
        if not created_at:
            return 1.0, "无时间信息"

        try:
            if isinstance(created_at, str):
                created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            else:
                created_time = created_at

            now = datetime.now(created_time.tzinfo) if created_time.tzinfo else datetime.now()
            days_ago = (now - created_time).days

            # 时间衰减规则
            if days_ago <= 1:
                return 1.0, "24小时内"
            elif days_ago <= 3:
                return 0.95, "3天内"
            elif days_ago <= 7:
                return 0.90, "1周内"
            elif days_ago <= 14:
                return 0.80, "2周内"
            elif days_ago <= 30:
                return 0.70, "1月内"
            else:
                return 0.50, f"{days_ago}天前"

        except Exception:
            return 1.0, "时间解析失败"

    def calculate_total_score(self, lead: Dict) -> Dict:
        """
        计算总分 (优化版 - 详细解释)

        Args:
            lead: 线索数据

        Returns:
            Dict: 评分结果 (包含详细解释)
        """
        content = lead.get('content', '') + lead.get('notes', '')

        # === 各维度评分 ===
        intent_score, intent_keywords = self.score_intent(content)
        budget_score, budget_keywords = self.score_budget(lead)
        urgency_score, urgency_keywords = self.score_urgency(lead)
        engagement_score, engagement_features = self.score_engagement(lead)
        behavior_score, behavior_features = self.score_behavior(lead)
        negative_score, negative_keywords = self.score_negative(lead)
        time_coefficient, time_desc = self.score_time_decay(lead)

        # === 基础分计算 ===
        base_score = (
            intent_score +      # 意向强度 40分
            budget_score +      # 预算能力 25分
            urgency_score +     # 时间紧迫度 20分
            engagement_score +  # 互动活跃度 15分
            behavior_score +    # 行为特征 10分
            negative_score      # 负面因素 -20到0分
        )

        # === 应用时间衰减 ===
        total_score = base_score * time_coefficient

        # === 分级 (更细致) ===
        if total_score >= 80:
            grade = 'S'
            priority = 'critical'
            recommendation = '🔥 超级线索!立即联系,优先级最高!'
            action = '立即打电话或加微信,30分钟内必须跟进'
        elif total_score >= 65:
            grade = 'A'
            priority = 'high'
            recommendation = '⭐ 高价值线索!今天必须跟进'
            action = '2小时内联系,准备详细方案'
        elif total_score >= 50:
            grade = 'B'
            priority = 'medium'
            recommendation = '👍 优质线索,24小时内跟进'
            action = '今天或明天联系,发送初步资料'
        elif total_score >= 35:
            grade = 'C'
            priority = 'low'
            recommendation = '📋 潜力线索,3天内跟进'
            action = '本周内联系,加入培育流程'
        elif total_score >= 20:
            grade = 'D'
            priority = 'very_low'
            recommendation = '📝 低优先级,批量触达'
            action = '加入邮件营销列表,定期触达'
        else:
            grade = 'F'
            priority = 'ignore'
            recommendation = '❌ 无效线索,暂不跟进'
            action = '暂时忽略,或加入长期培育'

        # === 生成详细解释 ===
        explanation = self._generate_explanation(
            intent_keywords, budget_keywords, urgency_keywords,
            engagement_features, behavior_features, negative_keywords,
            time_desc, total_score, grade
        )

        return {
            'total_score': round(total_score, 2),
            'base_score': round(base_score, 2),
            'time_coefficient': time_coefficient,
            'grade': grade,
            'priority': priority,
            'recommendation': recommendation,
            'action': action,
            'explanation': explanation,
            'breakdown': {
                'intent_score': intent_score,
                'budget_score': budget_score,
                'urgency_score': urgency_score,
                'engagement_score': engagement_score,
                'behavior_score': behavior_score,
                'negative_score': negative_score,
            },
            'details': {
                'intent_keywords': intent_keywords,
                'budget_keywords': budget_keywords,
                'urgency_keywords': urgency_keywords,
                'engagement_features': engagement_features,
                'behavior_features': behavior_features,
                'negative_keywords': negative_keywords,
                'time_desc': time_desc,
            }
        }

    def _generate_explanation(self, intent_kw, budget_kw, urgency_kw,
                             engagement_ft, behavior_ft, negative_kw,
                             time_desc, score, grade) -> str:
        """生成详细的评分解释"""
        parts = []

        # 总体评价
        parts.append(f"【总体评价】{grade}级线索,得分{score:.1f}分")

        # 意向强度
        if intent_kw:
            parts.append(f"【意向强度】{', '.join(intent_kw[:3])}")
        else:
            parts.append("【意向强度】未检测到明确意向")

        # 预算能力
        if budget_kw:
            parts.append(f"【预算能力】{', '.join(budget_kw[:2])}")
        else:
            parts.append("【预算能力】未提及预算信息")

        # 时间紧迫度
        if urgency_kw:
            parts.append(f"【时间紧迫度】{', '.join(urgency_kw[:2])}")
        else:
            parts.append("【时间紧迫度】无明确时间要求")

        # 互动活跃度
        if engagement_ft:
            parts.append(f"【互动活跃度】{', '.join(engagement_ft[:3])}")

        # 行为特征
        if behavior_ft:
            parts.append(f"【行为特征】{', '.join(behavior_ft)}")

        # 负面因素
        if negative_kw:
            parts.append(f"【负面因素】{', '.join(negative_kw)}")

        # 时间因素
        parts.append(f"【时间因素】{time_desc}")

        return " | ".join(parts)

    def batch_score(self, leads: List[Dict], show_progress: bool = False) -> List[Dict]:
        """
        批量评分 (性能优化版)

        Args:
            leads: 线索列表
            show_progress: 是否显示进度

        Returns:
            List[Dict]: 评分后的线索列表
        """
        scored_leads = []
        total = len(leads)

        for idx, lead in enumerate(leads):
            # 显示进度
            if show_progress and (idx + 1) % 100 == 0:
                print(f"处理进度: {idx + 1}/{total} ({(idx + 1) / total * 100:.1f}%)")

            # 计算评分
            scoring_result = self.calculate_total_score(lead)

            # 添加评分信息
            lead['score'] = scoring_result['total_score']
            lead['base_score'] = scoring_result['base_score']
            lead['grade'] = scoring_result['grade']
            lead['priority'] = scoring_result['priority']
            lead['recommendation'] = scoring_result['recommendation']
            lead['action'] = scoring_result['action']
            lead['explanation'] = scoring_result['explanation']
            lead['score_breakdown'] = scoring_result['breakdown']
            lead['score_details'] = scoring_result['details']

            scored_leads.append(lead)

        # 按分数排序
        scored_leads.sort(key=lambda x: x['score'], reverse=True)

        if show_progress:
            print(f"✅ 完成! 共处理 {total} 条线索")

        return scored_leads

    def get_statistics(self, scored_leads: List[Dict]) -> Dict:
        """
        获取评分统计信息

        Args:
            scored_leads: 已评分的线索列表

        Returns:
            Dict: 统计信息
        """
        if not scored_leads:
            return {}

        grade_count = defaultdict(int)
        priority_count = defaultdict(int)
        total_score = 0

        for lead in scored_leads:
            grade_count[lead['grade']] += 1
            priority_count[lead['priority']] += 1
            total_score += lead['score']

        return {
            'total_leads': len(scored_leads),
            'average_score': round(total_score / len(scored_leads), 2),
            'grade_distribution': dict(grade_count),
            'priority_distribution': dict(priority_count),
            'top_score': scored_leads[0]['score'] if scored_leads else 0,
            'lowest_score': scored_leads[-1]['score'] if scored_leads else 0,
        }


# 使用示例
if __name__ == "__main__":
    import time

    scorer = LeadScoringSystem()

    # === 测试线索 (更真实的场景) ===
    test_leads = [
        {
            'name': '张总',
            'content': '我是公司CEO,想咨询一下美国留学项目,预算充足不差钱,马上就要申请了,求推荐!加微信:zhangceo123详聊',
            'budget': '100万以上',
            'notes': '家长很着急,预算不是问题,决策者本人',
            'created_at': datetime.now().isoformat()
        },
        {
            'name': '李女士',
            'content': '想了解一下英国留学,孩子明年9月入学,预算50-80万,请问有什么好的方案吗?电话:13800138000',
            'budget': '50-80万',
            'notes': '比较了几家机构,还在对比中',
            'created_at': (datetime.now() - timedelta(days=2)).isoformat()
        },
        {
            'name': '王先生',
            'content': '有没有便宜的留学方案?性价比高的,以后再看看吧,不着急',
            'budget': '20-30万',
            'notes': '预算有限,只是了解一下',
            'created_at': (datetime.now() - timedelta(days=15)).isoformat()
        },
        {
            'name': '赵同学',
            'content': '急!急!急!我要申请今年秋季入学,来不及了,求帮助!不限预算,只要能成功!微信:zhao999',
            'budget': '不限',
            'notes': '非常紧急,愿意支付加急费用',
            'created_at': datetime.now().isoformat()
        },
        {
            'name': '刘小姐',
            'content': '帮朋友问一下,想了解澳洲留学,有推荐吗?',
            'budget': '未知',
            'notes': '不是本人,是帮朋友咨询',
            'created_at': (datetime.now() - timedelta(days=5)).isoformat()
        },
        {
            'name': '陈先生',
            'content': '你们这是骗子吧?太贵了,不考虑了',
            'budget': '低',
            'notes': '态度不好,有负面情绪',
            'created_at': (datetime.now() - timedelta(days=1)).isoformat()
        },
    ]

    print("="*80)
    print("🎯 LeadPulse 线索评分系统 - 优化版")
    print("="*80)

    # === 性能测试 ===
    print("\n【性能测试】批量处理1000条线索...")
    large_batch = test_leads * 167  # 约1000条
    start_time = time.time()
    scored_large = scorer.batch_score(large_batch, show_progress=False)
    end_time = time.time()
    processing_time = end_time - start_time
    throughput = len(large_batch) / processing_time

    print(f"✅ 处理完成!")
    print(f"   总数量: {len(large_batch)} 条")
    print(f"   耗时: {processing_time:.2f} 秒")
    print(f"   吞吐量: {throughput:.0f} 条/秒")

    # === 详细评分展示 ===
    print("\n" + "="*80)
    print("【详细评分结果】")
    print("="*80)

    scored_leads = scorer.batch_score(test_leads)

    for idx, lead in enumerate(scored_leads, 1):
        print(f"\n{'='*80}")
        print(f"排名 #{idx} - {lead['name']}")
        print(f"{'='*80}")
        print(f"📊 总分: {lead['score']:.1f} 分 (基础分: {lead['base_score']:.1f})")
        print(f"🏆 等级: {lead['grade']} 级")
        print(f"⚡ 优先级: {lead['priority']}")
        print(f"💡 建议: {lead['recommendation']}")
        print(f"🎯 行动: {lead['action']}")

        print(f"\n📈 评分明细:")
        breakdown = lead['score_breakdown']
        print(f"   • 意向强度: {breakdown['intent_score']}/40 分")
        print(f"   • 预算能力: {breakdown['budget_score']}/25 分")
        print(f"   • 时间紧迫度: {breakdown['urgency_score']}/20 分")
        print(f"   • 互动活跃度: {breakdown['engagement_score']}/15 分")
        print(f"   • 行为特征: {breakdown['behavior_score']}/10 分")
        if breakdown['negative_score'] < 0:
            print(f"   • 负面因素: {breakdown['negative_score']} 分")

        print(f"\n📝 详细解释:")
        print(f"   {lead['explanation']}")

        print(f"\n💬 原始内容:")
        print(f"   {lead['content'][:100]}...")

    # === 统计信息 ===
    print("\n" + "="*80)
    print("【统计信息】")
    print("="*80)

    stats = scorer.get_statistics(scored_leads)
    print(f"总线索数: {stats['total_leads']}")
    print(f"平均分: {stats['average_score']:.1f}")
    print(f"最高分: {stats['top_score']:.1f}")
    print(f"最低分: {stats['lowest_score']:.1f}")

    print(f"\n等级分布:")
    for grade, count in sorted(stats['grade_distribution'].items()):
        percentage = count / stats['total_leads'] * 100
        print(f"   {grade}级: {count} 条 ({percentage:.1f}%)")

    print(f"\n优先级分布:")
    priority_order = ['critical', 'high', 'medium', 'low', 'very_low', 'ignore']
    for priority in priority_order:
        count = stats['priority_distribution'].get(priority, 0)
        if count > 0:
            percentage = count / stats['total_leads'] * 100
            print(f"   {priority}: {count} 条 ({percentage:.1f}%)")

    print("\n" + "="*80)
    print("✅ 测试完成!")
    print("="*80)
