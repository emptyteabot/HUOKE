"""
信号驱动出击系统 - Signal Driven Outbound
2026年顶级获客策略核心模块

功能:
1. 基于意图信号生成针对性话术
2. 话术结构: [信号] + [痛点/损失] + [量化方案] + [无摩擦CTA]
3. 多渠道触达(邮件/微信/LinkedIn)
4. 实时追踪转化数据
"""

import time
from datetime import datetime
from typing import List, Dict, Optional
from dataclasses import dataclass
import pandas as pd


@dataclass
class OutreachMessage:
    """触达消息"""
    lead_company: str
    lead_name: str
    lead_email: str
    signal_detected: str  # 检测到的信号
    pain_point: str  # 痛点
    financial_loss: str  # 财务损失
    solution: str  # 解决方案
    social_proof: str  # 社会证明
    cta: str  # 行动号召
    subject: str  # 邮件主题
    body: str  # 邮件正文
    channel: str  # 触达渠道
    urgency: str  # 紧迫度

    def to_dict(self):
        return {
            'lead_company': self.lead_company,
            'lead_name': self.lead_name,
            'lead_email': self.lead_email,
            'signal_detected': self.signal_detected,
            'pain_point': self.pain_point,
            'financial_loss': self.financial_loss,
            'solution': self.solution,
            'social_proof': self.social_proof,
            'cta': self.cta,
            'subject': self.subject,
            'body': self.body,
            'channel': self.channel,
            'urgency': self.urgency
        }


class SignalDrivenScriptGenerator:
    """信号驱动话术生成器"""

    def __init__(self):
        # 话术模板库
        self.templates = {
            '融资扩张': {
                'signal_phrase': '注意到贵司{timeframe}刚完成{round}融资',
                'pain_point': '按照行业均值,新团队头三个月的线索获取成本将激增40%',
                'financial_loss': '如果按照传统方式获客,每月将多花费¥{amount}',
                'solution': '我们的系统上个月刚帮同赛道的{competitor}将单条线索成本压降了{savings}元',
                'social_proof': '已帮助{count}家同规模企业实现获客成本降低50%',
                'cta': '我抓取了{leads}个符合你们ICP的精准买家名单,免费发给你测试'
            },
            '团队招聘': {
                'signal_phrase': '看到贵司正在招聘{position},准备扩充{team_type}团队',
                'pain_point': '新团队最大的挑战是前3个月没有足够的线索练手',
                'financial_loss': '空窗期每天损失¥{daily_loss},累计可能达到¥{total_loss}',
                'solution': '我们可以在新人入职第一天就提供{leads}个精准线索',
                'social_proof': '{competitor}的新团队用我们的系统,第一个月就完成了季度目标的60%',
                'cta': '要不要先给你们新团队准备一批测试线索?'
            },
            '产品上线': {
                'signal_phrase': '注意到贵司{product}即将上线',
                'pain_point': '新产品最怕的是上线后没有足够的种子用户',
                'financial_loss': '推广预算浪费在非精准用户上,转化率可能低于{rate}%',
                'solution': '我们可以帮你精准定位{count}个高意向种子用户',
                'social_proof': '{competitor}用我们的系统,产品上线首周就获得{users}个付费用户',
                'cta': '我可以先免费帮你找{sample}个种子用户,你看看质量如何?'
            },
            '竞品对比': {
                'signal_phrase': '看到你在{platform}上对比{product_type}',
                'pain_point': '选错工具最大的成本不是钱,而是时间和机会成本',
                'financial_loss': '如果选择不合适,3个月后重新选型,团队效率损失至少30%',
                'solution': '我们的系统专门针对{industry}优化,转化率比通用工具高{rate}%',
                'social_proof': '{competitor}从{old_tool}切换到我们,3个月ROI提升了{roi}倍',
                'cta': '要不要先免费试用{days}天,对比一下实际效果?'
            },
            '技术痛点': {
                'signal_phrase': '注意到你在{platform}上提到{tech_issue}',
                'pain_point': '这个问题如果不解决,会严重影响{business_impact}',
                'financial_loss': '每天因为这个问题,团队浪费{hours}小时,相当于¥{cost}',
                'solution': '我们的系统原生支持{feature},开箱即用',
                'social_proof': '{competitor}之前也遇到同样问题,用我们的方案{time}内就解决了',
                'cta': '我可以给你演示一下具体怎么实现,{duration}分钟就够'
            }
        }

    def generate_message(self, enriched_lead: Dict, template_type: str = None) -> OutreachMessage:
        """生成触达消息"""

        # 提取信息
        company = enriched_lead.get('company_profile', {}).get('company_name', '贵司')
        decision_maker = enriched_lead.get('decision_makers', [{}])[0]
        name = decision_maker.get('name', '您')
        email = decision_maker.get('email', '')
        signal = enriched_lead.get('original_signal', {})
        signal_name = signal.get('signal_name', '')
        pain_point = signal.get('pain_point', '')
        financial_loss = signal.get('financial_loss', '')

        # 自动选择模板
        if not template_type:
            template_type = self._select_template(signal_name)

        template = self.templates.get(template_type, self.templates['融资扩张'])

        # 填充变量
        variables = self._extract_variables(enriched_lead, template_type)

        # 生成各部分
        signal_phrase = template['signal_phrase'].format(**variables)
        pain_point_text = template['pain_point'].format(**variables)
        financial_loss_text = template['financial_loss'].format(**variables)
        solution_text = template['solution'].format(**variables)
        social_proof_text = template['social_proof'].format(**variables)
        cta_text = template['cta'].format(**variables)

        # 生成主题
        subject = self._generate_subject(company, signal_name, template_type)

        # 生成正文
        body = f"""{name}您好,

{signal_phrase}。

【现状分析】
{pain_point_text}

【财务影响】
{financial_loss_text}

【我们的方案】
{solution_text}

【成功案例】
{social_proof_text}

【无风险测试】
{cta_text}

期待您的回复。

此致
[您的名字]
[您的职位]
[联系方式]
"""

        return OutreachMessage(
            lead_company=company,
            lead_name=name,
            lead_email=email,
            signal_detected=signal_name,
            pain_point=pain_point,
            financial_loss=financial_loss,
            solution=solution_text,
            social_proof=social_proof_text,
            cta=cta_text,
            subject=subject,
            body=body,
            channel='email',
            urgency=signal.get('urgency', '中')
        )

    def _select_template(self, signal_name: str) -> str:
        """根据信号选择模板"""
        signal_lower = signal_name.lower()

        if '融资' in signal_lower or '扩张' in signal_lower:
            return '融资扩张'
        elif '招聘' in signal_lower or '团队' in signal_lower:
            return '团队招聘'
        elif '上线' in signal_lower or '发布' in signal_lower:
            return '产品上线'
        elif '对比' in signal_lower or '选型' in signal_lower:
            return '竞品对比'
        elif 'issue' in signal_lower or '技术' in signal_lower:
            return '技术痛点'
        else:
            return '融资扩张'

    def _extract_variables(self, enriched_lead: Dict, template_type: str) -> Dict:
        """提取变量"""
        company_profile = enriched_lead.get('company_profile', {})

        # 默认变量
        variables = {
            'timeframe': '上周',
            'round': 'A轮',
            'amount': '50,000',
            'competitor': '某知名SaaS公司',
            'savings': '300',
            'count': '100',
            'leads': '50',
            'position': '销售总监',
            'team_type': '销售',
            'daily_loss': '5,000',
            'total_loss': '150,000',
            'product': '新产品',
            'rate': '5',
            'users': '200',
            'sample': '20',
            'platform': '小红书',
            'product_type': '获客工具',
            'industry': company_profile.get('industry', 'B2B'),
            'roi': '3',
            'old_tool': '传统CRM',
            'days': '14',
            'tech_issue': '数据导入问题',
            'business_impact': '业务进度',
            'hours': '2',
            'cost': '2,000',
            'feature': '批量导入',
            'time': '1周',
            'duration': '15'
        }

        # 根据实际数据覆盖
        if company_profile.get('funding_stage'):
            variables['round'] = company_profile['funding_stage']

        if company_profile.get('funding_amount'):
            variables['amount'] = company_profile['funding_amount']

        return variables

    def _generate_subject(self, company: str, signal: str, template_type: str) -> str:
        """生成邮件主题"""
        subjects = {
            '融资扩张': f'关于{company}融资后的获客成本优化方案',
            '团队招聘': f'给{company}新团队准备的精准线索',
            '产品上线': f'{company}新产品的种子用户获取方案',
            '竞品对比': f'为什么{company}应该选择我们',
            '技术痛点': f'关于{company}技术问题的解决方案'
        }

        return subjects.get(template_type, f'关于{company}的获客优化方案')


class MultiChannelOutreach:
    """多渠道触达"""

    def __init__(self):
        self.channels = ['email', 'wechat', 'linkedin', 'phone']
        self.sent_messages = []

    def send_email(self, message: OutreachMessage, dry_run: bool = True) -> Dict:
        """发送邮件"""
        if dry_run:
            print(f"\n📧 [模拟发送] 邮件到 {message.lead_email}")
            print(f"   主题: {message.subject}")
            result = {'status': 'simulated', 'sent_at': datetime.now()}
        else:
            # 实际发送逻辑
            # 可以集成SendGrid, AWS SES等
            print(f"\n📧 [实际发送] 邮件到 {message.lead_email}")
            result = {'status': 'sent', 'sent_at': datetime.now()}

        # 记录
        self.sent_messages.append({
            'message': message.to_dict(),
            'result': result
        })

        return result

    def send_wechat(self, message: OutreachMessage, dry_run: bool = True) -> Dict:
        """发送微信"""
        if dry_run:
            print(f"\n💬 [模拟发送] 微信到 {message.lead_name}")
            result = {'status': 'simulated', 'sent_at': datetime.now()}
        else:
            # 实际发送逻辑
            print(f"\n💬 [实际发送] 微信到 {message.lead_name}")
            result = {'status': 'sent', 'sent_at': datetime.now()}

        self.sent_messages.append({
            'message': message.to_dict(),
            'result': result
        })

        return result

    def send_linkedin(self, message: OutreachMessage, dry_run: bool = True) -> Dict:
        """发送LinkedIn消息"""
        if dry_run:
            print(f"\n🔗 [模拟发送] LinkedIn到 {message.lead_name}")
            result = {'status': 'simulated', 'sent_at': datetime.now()}
        else:
            # 实际发送逻辑
            print(f"\n🔗 [实际发送] LinkedIn到 {message.lead_name}")
            result = {'status': 'sent', 'sent_at': datetime.now()}

        self.sent_messages.append({
            'message': message.to_dict(),
            'result': result
        })

        return result

    def get_sent_count(self) -> int:
        """获取已发送数量"""
        return len(self.sent_messages)

    def export_tracking(self, filename: str = None) -> str:
        """导出追踪数据"""
        if not filename:
            filename = f"outreach_tracking_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        data = []
        for item in self.sent_messages:
            msg = item['message']
            result = item['result']
            data.append({
                '公司': msg['lead_company'],
                '联系人': msg['lead_name'],
                '邮箱': msg['lead_email'],
                '检测信号': msg['signal_detected'],
                '紧迫度': msg['urgency'],
                '渠道': msg['channel'],
                '主题': msg['subject'],
                '发送状态': result['status'],
                '发送时间': result['sent_at'].strftime('%Y-%m-%d %H:%M:%S')
            })

        df = pd.DataFrame(data)
        df.to_excel(filename, index=False)

        print(f"\n✅ 追踪数据已导出: {filename}")
        return filename


class SignalDrivenOutboundSystem:
    """信号驱动出击系统 - 主类"""

    def __init__(self):
        self.script_generator = SignalDrivenScriptGenerator()
        self.outreach = MultiChannelOutreach()

    def process_enriched_lead(self, enriched_lead: Dict, channel: str = 'email',
                             dry_run: bool = True) -> Dict:
        """处理富化线索"""

        # 1. 生成触达消息
        message = self.script_generator.generate_message(enriched_lead)

        # 2. 发送消息
        if channel == 'email':
            result = self.outreach.send_email(message, dry_run=dry_run)
        elif channel == 'wechat':
            result = self.outreach.send_wechat(message, dry_run=dry_run)
        elif channel == 'linkedin':
            result = self.outreach.send_linkedin(message, dry_run=dry_run)
        else:
            result = {'status': 'unsupported_channel'}

        return {
            'message': message,
            'result': result
        }

    def batch_process(self, enriched_leads: List[Dict], channel: str = 'email',
                     dry_run: bool = True) -> Dict:
        """批量处理"""
        print(f"\n🚀 批量处理 {len(enriched_leads)} 个线索...")

        results = []
        success = 0
        failed = 0

        for i, lead in enumerate(enriched_leads, 1):
            print(f"\n进度: {i}/{len(enriched_leads)}")
            try:
                result = self.process_enriched_lead(lead, channel=channel, dry_run=dry_run)
                results.append(result)
                success += 1
            except Exception as e:
                print(f"❌ 处理失败: {e}")
                failed += 1

        print(f"\n✅ 批量处理完成")
        print(f"   成功: {success}")
        print(f"   失败: {failed}")

        return {
            'total': len(enriched_leads),
            'success': success,
            'failed': failed,
            'results': results
        }

    def show_dashboard(self):
        """显示Dashboard"""
        print("\n" + "="*60)
        print("📊 信号驱动出击Dashboard")
        print("="*60)

        total = self.outreach.get_sent_count()
        if total == 0:
            print("\n暂无发送记录")
            return

        print(f"\n总发送数: {total}")

        # 按渠道统计
        channels = {}
        urgency_stats = {}

        for item in self.outreach.sent_messages:
            msg = item['message']
            channel = msg['channel']
            urgency = msg['urgency']

            channels[channel] = channels.get(channel, 0) + 1
            urgency_stats[urgency] = urgency_stats.get(urgency, 0) + 1

        print(f"\n渠道分布:")
        for channel, count in channels.items():
            print(f"  {channel}: {count} ({count/total*100:.1f}%)")

        print(f"\n紧迫度分布:")
        for urgency, count in urgency_stats.items():
            print(f"  {urgency}: {count} ({count/total*100:.1f}%)")

    def export_tracking_data(self) -> str:
        """导出追踪数据"""
        return self.outreach.export_tracking()


def demo():
    """演示"""
    print("="*60)
    print("🎯 信号驱动出击系统 - 演示")
    print("="*60)

    # 模拟富化线索
    enriched_lead = {
        'company_profile': {
            'company_name': 'ABC科技',
            'industry': 'B2B企业服务',
            'size': '50-200人',
            'funding_stage': 'A轮',
            'funding_amount': '5000万人民币'
        },
        'decision_makers': [
            {
                'name': '张总',
                'title': 'VP of Sales',
                'email': 'zhang@abc.com'
            }
        ],
        'original_signal': {
            'signal_name': '小红书-融资扩张',
            'pain_point': '融资后需要快速扩张,获客压力大',
            'financial_loss': '获客慢导致市场窗口期错失',
            'urgency': '极高'
        }
    }

    # 创建系统
    system = SignalDrivenOutboundSystem()

    # 处理线索
    result = system.process_enriched_lead(enriched_lead, channel='email', dry_run=True)

    # 显示消息
    message = result['message']
    print("\n" + "="*60)
    print("📧 生成的触达消息")
    print("="*60)
    print(f"\n主题: {message.subject}")
    print(f"\n正文:\n{message.body}")

    # 显示Dashboard
    system.show_dashboard()

    # 导出追踪数据
    system.export_tracking_data()


if __name__ == "__main__":
    demo()
