"""
数据编排AI Agent - Data Orchestration Agent
2026年顶级获客策略核心模块

功能:
1. 实时抓取意图信号
2. 自动清洗并交叉比对工商/融资数据
3. 抓取关键决策者真实邮箱/社交账号
4. 根据近期动态生成针对性洞察报告
"""

import json
import time
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import re


@dataclass
class CompanyProfile:
    """公司画像"""
    company_name: str
    industry: str
    size: str  # 员工规模
    founded_year: Optional[int]
    funding_stage: Optional[str]  # 融资阶段
    funding_amount: Optional[str]  # 融资金额
    revenue_range: Optional[str]  # 营收范围
    growth_rate: Optional[float]  # 增长率
    tech_stack: List[str]  # 技术栈
    pain_points: List[str]  # 推断的痛点
    urgency_score: float  # 紧迫度评分 0-100

    def to_dict(self):
        return asdict(self)


@dataclass
class DecisionMaker:
    """决策者画像"""
    name: str
    title: str
    company: str
    email: Optional[str]
    phone: Optional[str]
    linkedin: Optional[str]
    wechat: Optional[str]
    recent_activities: List[str]  # 近期动态
    decision_power: float  # 决策权重 0-1
    contact_priority: int  # 联系优先级 1-5

    def to_dict(self):
        return asdict(self)


@dataclass
class EnrichedLead:
    """富化后的线索"""
    original_signal: Dict  # 原始信号
    company_profile: CompanyProfile
    decision_makers: List[DecisionMaker]
    insight_report: str  # 洞察报告
    recommended_approach: str  # 推荐话术
    contact_timing: str  # 最佳联系时机
    enriched_at: datetime

    def to_dict(self):
        return {
            'original_signal': self.original_signal,
            'company_profile': self.company_profile.to_dict(),
            'decision_makers': [dm.to_dict() for dm in self.decision_makers],
            'insight_report': self.insight_report,
            'recommended_approach': self.recommended_approach,
            'contact_timing': self.contact_timing,
            'enriched_at': self.enriched_at.isoformat()
        }


class CompanyDataEnricher:
    """公司数据富化器"""

    def __init__(self):
        # 模拟数据源API
        self.qichacha_api = "https://api.qichacha.com"  # 企查查
        self.tianyancha_api = "https://api.tianyancha.com"  # 天眼查
        self.itjuzi_api = "https://api.itjuzi.com"  # IT桔子

    def enrich_company(self, company_name: str) -> Optional[CompanyProfile]:
        """富化公司信息"""
        print(f"\n🔍 正在富化公司信息: {company_name}")

        # 1. 从企查查获取工商信息
        business_info = self._fetch_business_info(company_name)

        # 2. 从IT桔子获取融资信息
        funding_info = self._fetch_funding_info(company_name)

        # 3. 从技术社区推断技术栈
        tech_stack = self._infer_tech_stack(company_name)

        # 4. 综合分析痛点
        pain_points = self._analyze_pain_points(business_info, funding_info)

        # 5. 计算紧迫度评分
        urgency_score = self._calculate_urgency(business_info, funding_info)

        profile = CompanyProfile(
            company_name=company_name,
            industry=business_info.get('industry', '未知'),
            size=business_info.get('size', '未知'),
            founded_year=business_info.get('founded_year'),
            funding_stage=funding_info.get('stage'),
            funding_amount=funding_info.get('amount'),
            revenue_range=business_info.get('revenue_range'),
            growth_rate=business_info.get('growth_rate'),
            tech_stack=tech_stack,
            pain_points=pain_points,
            urgency_score=urgency_score
        )

        print(f"✅ 公司信息富化完成")
        return profile

    def _fetch_business_info(self, company_name: str) -> Dict:
        """从企查查/天眼查获取工商信息"""
        # 实际应调用API
        # 这里返回模拟数据
        return {
            'industry': 'B2B企业服务',
            'size': '50-200人',
            'founded_year': 2020,
            'revenue_range': '1000万-5000万',
            'growth_rate': 0.8  # 80%增长
        }

    def _fetch_funding_info(self, company_name: str) -> Dict:
        """从IT桔子获取融资信息"""
        # 实际应调用API
        return {
            'stage': 'A轮',
            'amount': '5000万人民币',
            'date': '2024-01-15',
            'investors': ['某知名VC']
        }

    def _infer_tech_stack(self, company_name: str) -> List[str]:
        """推断技术栈"""
        # 可以从招聘信息、技术博客等推断
        return ['Python', 'React', 'PostgreSQL', 'AWS']

    def _analyze_pain_points(self, business_info: Dict, funding_info: Dict) -> List[str]:
        """分析痛点"""
        pain_points = []

        # 根据融资阶段推断
        stage = funding_info.get('stage', '')
        if 'A轮' in stage or 'B轮' in stage:
            pain_points.append('融资后需要快速扩张,获客压力大')
            pain_points.append('新团队需要快速起量,线索需求急迫')

        # 根据增长率推断
        growth_rate = business_info.get('growth_rate', 0)
        if growth_rate > 0.5:
            pain_points.append('高速增长期,现有工具可能跟不上')

        # 根据规模推断
        size = business_info.get('size', '')
        if '50-200' in size:
            pain_points.append('中等规模,正在从手工转向自动化')

        return pain_points

    def _calculate_urgency(self, business_info: Dict, funding_info: Dict) -> float:
        """计算紧迫度评分"""
        score = 0.0

        # 融资时间越近,紧迫度越高
        funding_date = funding_info.get('date', '')
        if funding_date:
            # 简化计算,实际应根据日期差
            score += 30

        # 增长率越高,紧迫度越高
        growth_rate = business_info.get('growth_rate', 0)
        score += min(growth_rate * 50, 40)

        # 规模适中,紧迫度高
        size = business_info.get('size', '')
        if '50-200' in size or '200-500' in size:
            score += 30

        return min(score, 100)


class DecisionMakerFinder:
    """决策者查找器"""

    def __init__(self):
        self.linkedin_api = "https://api.linkedin.com"
        self.hunter_api = "https://api.hunter.io"  # 邮箱查找

    def find_decision_makers(self, company_name: str) -> List[DecisionMaker]:
        """查找决策者"""
        print(f"\n🔍 正在查找决策者: {company_name}")

        decision_makers = []

        # 1. 从LinkedIn查找高管
        linkedin_profiles = self._search_linkedin(company_name)

        for profile in linkedin_profiles:
            # 2. 查找邮箱
            email = self._find_email(profile['name'], company_name)

            # 3. 查找其他联系方式
            contacts = self._find_contacts(profile['name'], company_name)

            # 4. 获取近期动态
            activities = self._get_recent_activities(profile['linkedin_url'])

            # 5. 评估决策权重
            decision_power = self._evaluate_decision_power(profile['title'])

            # 6. 计算联系优先级
            priority = self._calculate_priority(profile, activities, decision_power)

            dm = DecisionMaker(
                name=profile['name'],
                title=profile['title'],
                company=company_name,
                email=email,
                phone=contacts.get('phone'),
                linkedin=profile['linkedin_url'],
                wechat=contacts.get('wechat'),
                recent_activities=activities,
                decision_power=decision_power,
                contact_priority=priority
            )

            decision_makers.append(dm)

        # 按优先级排序
        decision_makers.sort(key=lambda x: x.contact_priority)

        print(f"✅ 找到 {len(decision_makers)} 位决策者")
        return decision_makers

    def _search_linkedin(self, company_name: str) -> List[Dict]:
        """从LinkedIn搜索高管"""
        # 实际应调用LinkedIn API或爬虫
        # 返回模拟数据
        return [
            {
                'name': '张总',
                'title': 'VP of Sales',
                'linkedin_url': 'https://linkedin.com/in/zhang'
            },
            {
                'name': '李经理',
                'title': 'Sales Director',
                'linkedin_url': 'https://linkedin.com/in/li'
            }
        ]

    def _find_email(self, name: str, company: str) -> Optional[str]:
        """查找邮箱"""
        # 可以使用Hunter.io API
        # 或者根据公司域名推断
        company_domain = self._get_company_domain(company)
        if company_domain:
            # 常见格式: name@company.com, firstname.lastname@company.com
            name_pinyin = self._to_pinyin(name)
            return f"{name_pinyin}@{company_domain}"
        return None

    def _get_company_domain(self, company: str) -> Optional[str]:
        """获取公司域名"""
        # 实际应从企查查等获取
        # 简化处理
        return "example.com"

    def _to_pinyin(self, name: str) -> str:
        """中文转拼音"""
        # 实际应使用pypinyin库
        # 简化处理
        return "zhang"

    def _find_contacts(self, name: str, company: str) -> Dict:
        """查找其他联系方式"""
        # 可以从多个来源查找
        return {
            'phone': None,
            'wechat': None
        }

    def _get_recent_activities(self, linkedin_url: str) -> List[str]:
        """获取近期动态"""
        # 从LinkedIn获取最近的帖子、评论等
        return [
            '3天前发布了关于团队扩张的帖子',
            '1周前参加了销售峰会',
            '2周前分享了关于获客的文章'
        ]

    def _evaluate_decision_power(self, title: str) -> float:
        """评估决策权重"""
        title_lower = title.lower()

        if any(kw in title_lower for kw in ['ceo', 'founder', '创始人', '总裁']):
            return 1.0
        elif any(kw in title_lower for kw in ['cto', 'cmo', 'vp', '副总裁']):
            return 0.9
        elif any(kw in title_lower for kw in ['director', '总监']):
            return 0.7
        elif any(kw in title_lower for kw in ['manager', '经理']):
            return 0.5
        else:
            return 0.3

    def _calculate_priority(self, profile: Dict, activities: List[str], decision_power: float) -> int:
        """计算联系优先级 1-5 (1最高)"""
        score = 0

        # 决策权重越高,优先级越高
        score += (1 - decision_power) * 2

        # 近期活跃度越高,优先级越高
        if len(activities) >= 3:
            score -= 1

        # 职位相关性
        title = profile.get('title', '').lower()
        if any(kw in title for kw in ['sales', 'marketing', 'growth', '销售', '市场']):
            score -= 1

        return max(1, min(5, int(score + 3)))


class InsightReportGenerator:
    """洞察报告生成器"""

    def generate_report(self, company_profile: CompanyProfile,
                       decision_makers: List[DecisionMaker],
                       original_signal: Dict) -> str:
        """生成洞察报告"""
        print(f"\n📊 正在生成洞察报告...")

        report = f"""
# 🎯 客户洞察报告

## 公司概况
- **公司名称**: {company_profile.company_name}
- **行业**: {company_profile.industry}
- **规模**: {company_profile.size}
- **融资阶段**: {company_profile.funding_stage or '未知'}
- **融资金额**: {company_profile.funding_amount or '未知'}
- **增长率**: {company_profile.growth_rate*100 if company_profile.growth_rate else 0:.0f}%

## 技术栈
{', '.join(company_profile.tech_stack) if company_profile.tech_stack else '未知'}

## 核心痛点分析
"""
        for i, pain in enumerate(company_profile.pain_points, 1):
            report += f"{i}. {pain}\n"

        report += f"""
## 紧迫度评分
**{company_profile.urgency_score:.0f}/100** - {'🔴 极高' if company_profile.urgency_score >= 80 else '🟠 高' if company_profile.urgency_score >= 60 else '🟡 中'}

## 关键决策者
"""
        for i, dm in enumerate(decision_makers[:3], 1):
            report += f"""
### {i}. {dm.name} - {dm.title}
- **决策权重**: {dm.decision_power*100:.0f}%
- **联系优先级**: {'⭐' * dm.contact_priority}
- **联系方式**: {dm.email or '待查找'}
- **近期动态**:
"""
            for activity in dm.recent_activities[:2]:
                report += f"  - {activity}\n"

        report += f"""
## 触发信号
- **信号类型**: {original_signal.get('signal_type', '未知')}
- **信号名称**: {original_signal.get('signal_name', '未知')}
- **检测时间**: {original_signal.get('detected_at', '未知')}

## 推荐行动
1. **立即联系**: {decision_makers[0].name if decision_makers else '待识别'} ({decision_makers[0].title if decision_makers else ''})
2. **话术重点**: 针对"{company_profile.pain_points[0] if company_profile.pain_points else '业务增长'}"提供解决方案
3. **价值主张**: 量化ROI,展示同行案例
4. **最佳时机**: {self._recommend_timing(decision_makers[0] if decision_makers else None)}
"""

        print(f"✅ 洞察报告生成完成")
        return report

    def _recommend_timing(self, dm: Optional[DecisionMaker]) -> str:
        """推荐最佳联系时机"""
        if not dm:
            return "尽快联系"

        # 根据近期动态推荐
        if dm.recent_activities:
            latest = dm.recent_activities[0]
            if '天前' in latest:
                return "趁热打铁,立即联系"
            elif '周前' in latest:
                return "本周内联系"

        return "3天内联系"

    def generate_approach(self, company_profile: CompanyProfile,
                         decision_maker: DecisionMaker,
                         original_signal: Dict) -> str:
        """生成推荐话术"""
        print(f"\n💬 正在生成推荐话术...")

        # 提取关键信息
        company = company_profile.company_name
        name = decision_maker.name
        pain_point = company_profile.pain_points[0] if company_profile.pain_points else "业务增长"
        signal_name = original_signal.get('signal_name', '')

        approach = f"""
【邮件主题】
关于{company}的{pain_point}解决方案

【邮件正文】
{name}您好,

注意到贵司{signal_name},特别是{pain_point}方面的挑战。

根据我们的行业数据:
• {company_profile.industry}企业在这个阶段,平均获客成本会激增40%
• 头部企业通过精准获客,将单条线索成本压降了300元

【我们的方案】
我们刚帮助同赛道的X公司(规模:{company_profile.size}):
✓ 3个月内获取5000+精准线索
✓ 线索成本从¥500降至¥150
✓ 转化率提升2倍

【无风险测试】
我可以先免费提供50个符合贵司ICP的精准买家名单,您测试后再决定是否合作。

方便的话,本周找个时间简单聊10分钟?

期待您的回复。

此致
[您的名字]
[您的职位]
[联系方式]
"""

        print(f"✅ 推荐话术生成完成")
        return approach


class DataOrchestrationAgent:
    """数据编排AI Agent - 主类"""

    def __init__(self):
        self.company_enricher = CompanyDataEnricher()
        self.dm_finder = DecisionMakerFinder()
        self.report_generator = InsightReportGenerator()

    def orchestrate(self, signal: Dict) -> EnrichedLead:
        """编排数据 - 主流程"""
        print("\n" + "="*60)
        print("🤖 数据编排AI Agent 启动")
        print("="*60)

        company_name = signal.get('company', '未知公司')

        # 1. 富化公司信息
        company_profile = self.company_enricher.enrich_company(company_name)

        # 2. 查找决策者
        decision_makers = self.dm_finder.find_decision_makers(company_name)

        # 3. 生成洞察报告
        insight_report = self.report_generator.generate_report(
            company_profile,
            decision_makers,
            signal
        )

        # 4. 生成推荐话术
        recommended_approach = ""
        if decision_makers:
            recommended_approach = self.report_generator.generate_approach(
                company_profile,
                decision_makers[0],
                signal
            )

        # 5. 推荐最佳联系时机
        contact_timing = self.report_generator._recommend_timing(
            decision_makers[0] if decision_makers else None
        )

        # 6. 组装富化线索
        enriched_lead = EnrichedLead(
            original_signal=signal,
            company_profile=company_profile,
            decision_makers=decision_makers,
            insight_report=insight_report,
            recommended_approach=recommended_approach,
            contact_timing=contact_timing,
            enriched_at=datetime.now()
        )

        print("\n" + "="*60)
        print("✅ 数据编排完成")
        print("="*60)

        return enriched_lead

    def batch_orchestrate(self, signals: List[Dict]) -> List[EnrichedLead]:
        """批量编排"""
        print(f"\n🔄 批量编排 {len(signals)} 个信号...")

        enriched_leads = []
        for i, signal in enumerate(signals, 1):
            print(f"\n进度: {i}/{len(signals)}")
            try:
                enriched = self.orchestrate(signal)
                enriched_leads.append(enriched)
            except Exception as e:
                print(f"❌ 编排失败: {e}")
                continue

        print(f"\n✅ 批量编排完成,成功 {len(enriched_leads)}/{len(signals)}")
        return enriched_leads

    def export_enriched_leads(self, enriched_leads: List[EnrichedLead], filename: str = None):
        """导出富化线索"""
        if not filename:
            filename = f"enriched_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        data = {
            'total': len(enriched_leads),
            'enriched_at': datetime.now().isoformat(),
            'leads': [lead.to_dict() for lead in enriched_leads]
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"\n✅ 富化线索已导出: {filename}")
        return filename


def demo():
    """演示"""
    print("="*60)
    print("🤖 数据编排AI Agent - 演示")
    print("="*60)

    # 模拟信号
    signal = {
        'signal_type': '行为信号',
        'signal_name': '小红书-评论区咨询',
        'company': 'ABC科技',
        'contact_person': '张总',
        'detected_at': datetime.now().isoformat(),
        'urgency': '极高',
        'confidence': 0.9,
        'pain_point': '融资后需要快速扩张,获客压力大',
        'financial_loss': '获客慢导致市场窗口期错失'
    }

    # 创建Agent
    agent = DataOrchestrationAgent()

    # 编排数据
    enriched_lead = agent.orchestrate(signal)

    # 显示结果
    print("\n" + "="*60)
    print("📊 富化结果")
    print("="*60)
    print(enriched_lead.insight_report)
    print("\n" + "="*60)
    print("💬 推荐话术")
    print("="*60)
    print(enriched_lead.recommended_approach)

    # 导出
    agent.export_enriched_leads([enriched_lead])


if __name__ == "__main__":
    demo()
