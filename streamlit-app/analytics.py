"""
高级数据分析模块

提供:
1. 转化漏斗分析
2. ROI计算
3. 时间趋势分析
4. 客户分群分析
5. 邮件效果对比
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd

def calculate_conversion_funnel(leads: List[Dict], emails: List[Dict]) -> Dict:
    """
    计算转化漏斗

    Args:
        leads: 线索列表
        emails: 邮件列表

    Returns:
        Dict: 漏斗数据
    """
    total_leads = len(leads)

    # 统计各阶段数量
    leads_with_email = len(set(e['lead_id'] for e in emails if e.get('status') == 'sent'))
    leads_opened = len(set(e['lead_id'] for e in emails if e.get('opened_at')))
    leads_clicked = len(set(e['lead_id'] for e in emails if e.get('clicked_at')))
    leads_converted = len([l for l in leads if l.get('status') in ['converted', 'signed']])

    # 计算转化率
    funnel = {
        'stages': [
            {
                'name': '总线索',
                'count': total_leads,
                'rate': 100.0
            },
            {
                'name': '已发送邮件',
                'count': leads_with_email,
                'rate': (leads_with_email / total_leads * 100) if total_leads > 0 else 0
            },
            {
                'name': '已打开邮件',
                'count': leads_opened,
                'rate': (leads_opened / leads_with_email * 100) if leads_with_email > 0 else 0
            },
            {
                'name': '已点击链接',
                'count': leads_clicked,
                'rate': (leads_clicked / leads_opened * 100) if leads_opened > 0 else 0
            },
            {
                'name': '已转化',
                'count': leads_converted,
                'rate': (leads_converted / leads_clicked * 100) if leads_clicked > 0 else 0
            }
        ],
        'overall_conversion_rate': (leads_converted / total_leads * 100) if total_leads > 0 else 0
    }

    return funnel

def calculate_roi(leads: List[Dict], emails: List[Dict], cost_per_lead: float = 50, revenue_per_conversion: float = 10000) -> Dict:
    """
    计算ROI

    Args:
        leads: 线索列表
        emails: 邮件列表
        cost_per_lead: 每个线索成本(元)
        revenue_per_conversion: 每个转化收入(元)

    Returns:
        Dict: ROI数据
    """
    total_leads = len(leads)
    total_emails = len([e for e in emails if e.get('status') == 'sent'])
    conversions = len([l for l in leads if l.get('status') in ['converted', 'signed']])

    # 成本计算
    lead_acquisition_cost = total_leads * cost_per_lead
    email_cost = total_emails * 0.5  # 假设每封邮件成本0.5元
    total_cost = lead_acquisition_cost + email_cost

    # 收入计算
    total_revenue = conversions * revenue_per_conversion

    # ROI计算
    roi = ((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0

    return {
        'total_cost': total_cost,
        'lead_acquisition_cost': lead_acquisition_cost,
        'email_cost': email_cost,
        'total_revenue': total_revenue,
        'net_profit': total_revenue - total_cost,
        'roi': roi,
        'cost_per_conversion': (total_cost / conversions) if conversions > 0 else 0,
        'conversions': conversions
    }

def analyze_time_trends(emails: List[Dict], days: int = 30) -> Dict:
    """
    分析时间趋势

    Args:
        emails: 邮件列表
        days: 分析天数

    Returns:
        Dict: 趋势数据
    """
    cutoff_date = datetime.now() - timedelta(days=days)

    # 按日期分组
    daily_stats = {}

    for email in emails:
        if email.get('sent_at'):
            try:
                sent_date = datetime.fromisoformat(email['sent_at'].replace('Z', '+00:00'))

                if sent_date >= cutoff_date:
                    date_key = sent_date.strftime('%Y-%m-%d')

                    if date_key not in daily_stats:
                        daily_stats[date_key] = {
                            'sent': 0,
                            'opened': 0,
                            'clicked': 0
                        }

                    daily_stats[date_key]['sent'] += 1

                    if email.get('opened_at'):
                        daily_stats[date_key]['opened'] += 1

                    if email.get('clicked_at'):
                        daily_stats[date_key]['clicked'] += 1
            except:
                pass

    # 转换为列表并排序
    trends = []
    for date_key in sorted(daily_stats.keys()):
        stats = daily_stats[date_key]
        trends.append({
            'date': date_key,
            'sent': stats['sent'],
            'opened': stats['opened'],
            'clicked': stats['clicked'],
            'open_rate': (stats['opened'] / stats['sent'] * 100) if stats['sent'] > 0 else 0,
            'click_rate': (stats['clicked'] / stats['sent'] * 100) if stats['sent'] > 0 else 0
        })

    return {
        'trends': trends,
        'period_days': days
    }

def segment_leads(leads: List[Dict], emails: List[Dict]) -> Dict:
    """
    客户分群分析

    Args:
        leads: 线索列表
        emails: 邮件列表

    Returns:
        Dict: 分群数据
    """
    from email_tracking import get_email_engagement_score

    # 按互动分数分群
    high_engagement = []
    medium_engagement = []
    low_engagement = []
    no_engagement = []

    # 为每个线索计算平均互动分数
    lead_scores = {}
    for email in emails:
        lead_id = email.get('lead_id')
        if lead_id:
            score = get_email_engagement_score(email)['score']
            if lead_id not in lead_scores:
                lead_scores[lead_id] = []
            lead_scores[lead_id].append(score)

    for lead in leads:
        lead_id = lead['id']
        if lead_id in lead_scores:
            avg_score = sum(lead_scores[lead_id]) / len(lead_scores[lead_id])

            if avg_score >= 70:
                high_engagement.append(lead)
            elif avg_score >= 40:
                medium_engagement.append(lead)
            else:
                low_engagement.append(lead)
        else:
            no_engagement.append(lead)

    # 按国家分群
    by_country = {}
    for lead in leads:
        country = lead.get('target_country', '未知')
        if country not in by_country:
            by_country[country] = []
        by_country[country].append(lead)

    # 按学历分群
    by_degree = {}
    for lead in leads:
        degree = lead.get('target_degree', '未知')
        if degree not in by_degree:
            by_degree[degree] = []
        by_degree[degree].append(lead)

    return {
        'by_engagement': {
            'high': {'count': len(high_engagement), 'leads': high_engagement},
            'medium': {'count': len(medium_engagement), 'leads': medium_engagement},
            'low': {'count': len(low_engagement), 'leads': low_engagement},
            'none': {'count': len(no_engagement), 'leads': no_engagement}
        },
        'by_country': {country: len(leads_list) for country, leads_list in by_country.items()},
        'by_degree': {degree: len(leads_list) for degree, leads_list in by_degree.items()}
    }

def compare_email_templates(emails: List[Dict]) -> Dict:
    """
    对比不同邮件模板的效果

    Args:
        emails: 邮件列表

    Returns:
        Dict: 对比数据
    """
    # 按主题关键词分组
    template_stats = {}

    for email in emails:
        if email.get('status') != 'sent':
            continue

        subject = email.get('subject', '')

        # 简单的模板识别(基于主题关键词)
        template_key = 'other'
        if '首次' in subject or '欢迎' in subject:
            template_key = '首次咨询'
        elif '规划' in subject or '方案' in subject:
            template_key = '留学规划'
        elif '推荐' in subject or '院校' in subject:
            template_key = '院校推荐'
        elif '优惠' in subject or '折扣' in subject:
            template_key = '优惠活动'
        elif '跟进' in subject or '回复' in subject:
            template_key = '跟进邮件'

        if template_key not in template_stats:
            template_stats[template_key] = {
                'sent': 0,
                'opened': 0,
                'clicked': 0,
                'opens_total': 0,
                'clicks_total': 0
            }

        stats = template_stats[template_key]
        stats['sent'] += 1

        if email.get('opened_at'):
            stats['opened'] += 1
            stats['opens_total'] += email.get('opens', 0)

        if email.get('clicked_at'):
            stats['clicked'] += 1
            stats['clicks_total'] += email.get('clicks', 0)

    # 计算各模板的指标
    comparison = []
    for template_key, stats in template_stats.items():
        comparison.append({
            'template': template_key,
            'sent': stats['sent'],
            'open_rate': (stats['opened'] / stats['sent'] * 100) if stats['sent'] > 0 else 0,
            'click_rate': (stats['clicked'] / stats['sent'] * 100) if stats['sent'] > 0 else 0,
            'avg_opens': (stats['opens_total'] / stats['opened']) if stats['opened'] > 0 else 0,
            'avg_clicks': (stats['clicks_total'] / stats['clicked']) if stats['clicked'] > 0 else 0
        })

    # 按打开率排序
    comparison.sort(key=lambda x: x['open_rate'], reverse=True)

    return {
        'templates': comparison,
        'best_template': comparison[0]['template'] if comparison else None,
        'worst_template': comparison[-1]['template'] if comparison else None
    }

def generate_insights(leads: List[Dict], emails: List[Dict]) -> List[str]:
    """
    生成数据洞察

    Args:
        leads: 线索列表
        emails: 邮件列表

    Returns:
        List[str]: 洞察列表
    """
    insights = []

    # 分析打开率
    sent_emails = [e for e in emails if e.get('status') == 'sent']
    if sent_emails:
        opened = len([e for e in sent_emails if e.get('opened_at')])
        open_rate = opened / len(sent_emails) * 100

        if open_rate < 20:
            insights.append("⚠️ 邮件打开率较低(<20%),建议优化邮件主题,使用更吸引人的标题")
        elif open_rate > 40:
            insights.append("✅ 邮件打开率很好(>40%),继续保持!")

    # 分析点击率
    if sent_emails:
        clicked = len([e for e in sent_emails if e.get('clicked_at')])
        click_rate = clicked / len(sent_emails) * 100

        if click_rate < 5:
            insights.append("⚠️ 邮件点击率较低(<5%),建议在邮件中添加更明确的CTA按钮")
        elif click_rate > 15:
            insights.append("✅ 邮件点击率很好(>15%),内容很有吸引力!")

    # 分析最佳发送时间
    from email_tracking import analyze_email_performance
    performance = analyze_email_performance(sent_emails)
    if performance['best_time']:
        insights.append(f"💡 最佳发送时间是 {performance['best_time']},建议在这个时段发送邮件")

    # 分析转化率
    conversions = len([l for l in leads if l.get('status') in ['converted', 'signed']])
    if leads:
        conversion_rate = conversions / len(leads) * 100
        if conversion_rate < 5:
            insights.append("⚠️ 转化率较低(<5%),建议加强跟进和优化话术")
        elif conversion_rate > 15:
            insights.append("✅ 转化率很好(>15%),团队表现优秀!")

    # 分析客户分群
    segments = segment_leads(leads, emails)
    high_engagement_count = segments['by_engagement']['high']['count']
    if high_engagement_count > 0:
        insights.append(f"🎯 发现 {high_engagement_count} 个高意向客户,建议优先跟进!")

    # 分析邮件模板
    template_comparison = compare_email_templates(emails)
    if template_comparison['best_template']:
        insights.append(f"📧 '{template_comparison['best_template']}' 类型的邮件效果最好,建议多使用")

    return insights

def export_report(leads: List[Dict], emails: List[Dict]) -> pd.DataFrame:
    """
    导出数据报表

    Args:
        leads: 线索列表
        emails: 邮件列表

    Returns:
        pd.DataFrame: 报表数据
    """
    report_data = []

    for lead in leads:
        # 获取该线索的所有邮件
        lead_emails = [e for e in emails if e.get('lead_id') == lead['id']]

        total_emails = len(lead_emails)
        opened_emails = len([e for e in lead_emails if e.get('opened_at')])
        clicked_emails = len([e for e in lead_emails if e.get('clicked_at')])

        report_data.append({
            '学生姓名': lead.get('name', ''),
            '邮箱': lead.get('email', ''),
            '目标国家': lead.get('target_country', ''),
            '目标学历': lead.get('target_degree', ''),
            '专业': lead.get('major', ''),
            '预算': lead.get('budget', ''),
            '状态': lead.get('status', ''),
            '发送邮件数': total_emails,
            '打开邮件数': opened_emails,
            '点击邮件数': clicked_emails,
            '打开率': f"{(opened_emails / total_emails * 100):.1f}%" if total_emails > 0 else "0%",
            '点击率': f"{(clicked_emails / total_emails * 100):.1f}%" if total_emails > 0 else "0%",
            '创建时间': lead.get('created_at', '')[:10] if lead.get('created_at') else ''
        })

    return pd.DataFrame(report_data)
