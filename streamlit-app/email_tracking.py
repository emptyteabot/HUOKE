import os
from typing import Dict, Optional
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image

def generate_tracking_pixel(email_id: str) -> str:
    """
    生成追踪像素的HTML代码

    Args:
        email_id: 邮件ID

    Returns:
        str: 追踪像素的HTML代码
    """
    # 创建1x1透明像素
    img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_data = base64.b64encode(buffer.getvalue()).decode()

    # 返回内嵌的base64图片(避免需要外部服务器)
    return f'<img src="data:image/png;base64,{img_data}" width="1" height="1" alt="" />'

def add_tracking_to_email(html_body: str, email_id: str, tracking_url: Optional[str] = None) -> str:
    """
    在邮件HTML中添加追踪代码

    Args:
        html_body: 邮件HTML内容
        email_id: 邮件ID
        tracking_url: 追踪服务器URL(可选)

    Returns:
        str: 添加了追踪代码的HTML
    """
    # 如果提供了追踪URL,使用外部追踪像素
    if tracking_url:
        tracking_pixel = f'<img src="{tracking_url}/track/open/{email_id}" width="1" height="1" alt="" />'
    else:
        # 使用内嵌追踪像素
        tracking_pixel = generate_tracking_pixel(email_id)

    # 在</body>标签前插入追踪像素
    if '</body>' in html_body:
        html_body = html_body.replace('</body>', f'{tracking_pixel}</body>')
    else:
        html_body += tracking_pixel

    return html_body

def wrap_links_with_tracking(html_body: str, email_id: str, tracking_url: Optional[str] = None) -> str:
    """
    将邮件中的链接包装为追踪链接

    Args:
        html_body: 邮件HTML内容
        email_id: 邮件ID
        tracking_url: 追踪服务器URL(可选)

    Returns:
        str: 包装了追踪链接的HTML
    """
    import re

    if not tracking_url:
        return html_body

    # 查找所有<a>标签
    def replace_link(match):
        full_tag = match.group(0)
        href = match.group(1)

        # 跳过已经是追踪链接的
        if tracking_url in href:
            return full_tag

        # 跳过mailto和tel链接
        if href.startswith(('mailto:', 'tel:', '#')):
            return full_tag

        # 创建追踪链接
        tracked_href = f"{tracking_url}/track/click/{email_id}?url={href}"

        # 替换href
        return full_tag.replace(f'href="{href}"', f'href="{tracked_href}"')

    # 匹配<a href="...">
    pattern = r'<a\s+[^>]*href="([^"]+)"[^>]*>'
    html_body = re.sub(pattern, replace_link, html_body)

    return html_body

def get_email_engagement_score(email_data: Dict) -> Dict:
    """
    计算邮件互动分数

    Args:
        email_data: 邮件数据 {
            'opens': int,
            'clicks': int,
            'opened_at': str,
            'clicked_at': str,
            'sent_at': str
        }

    Returns:
        Dict: {
            'score': int (0-100),
            'level': str ('低', '中', '高'),
            'details': Dict
        }
    """
    score = 0
    details = {}

    # 打开邮件 +30分
    if email_data.get('opened_at'):
        score += 30
        details['opened'] = True

        # 多次打开 +10分
        opens = email_data.get('opens', 0)
        if opens > 1:
            score += min(10, opens * 2)
            details['multiple_opens'] = opens

    # 点击链接 +40分
    if email_data.get('clicked_at'):
        score += 40
        details['clicked'] = True

        # 多次点击 +20分
        clicks = email_data.get('clicks', 0)
        if clicks > 1:
            score += min(20, clicks * 5)
            details['multiple_clicks'] = clicks

    # 快速响应 +10分
    if email_data.get('opened_at') and email_data.get('sent_at'):
        try:
            sent_time = datetime.fromisoformat(email_data['sent_at'].replace('Z', '+00:00'))
            opened_time = datetime.fromisoformat(email_data['opened_at'].replace('Z', '+00:00'))
            response_hours = (opened_time - sent_time).total_seconds() / 3600

            if response_hours < 1:
                score += 10
                details['quick_response'] = True
        except:
            pass

    # 确定互动等级
    if score >= 70:
        level = '高'
    elif score >= 40:
        level = '中'
    else:
        level = '低'

    return {
        'score': min(100, score),
        'level': level,
        'details': details
    }

def analyze_email_performance(emails: list) -> Dict:
    """
    分析邮件整体表现

    Args:
        emails: 邮件列表

    Returns:
        Dict: 分析结果
    """
    if not emails:
        return {
            'total': 0,
            'sent': 0,
            'opened': 0,
            'clicked': 0,
            'open_rate': 0,
            'click_rate': 0,
            'engagement_rate': 0,
            'avg_opens': 0,
            'avg_clicks': 0,
            'best_time': None,
            'worst_time': None
        }

    total = len(emails)
    sent = sum(1 for e in emails if e.get('status') == 'sent')
    opened = sum(1 for e in emails if e.get('opened_at'))
    clicked = sum(1 for e in emails if e.get('clicked_at'))

    total_opens = sum(e.get('opens', 0) for e in emails)
    total_clicks = sum(e.get('clicks', 0) for e in emails)

    # 计算最佳发送时间
    time_performance = {}
    for email in emails:
        if email.get('sent_at') and email.get('opened_at'):
            try:
                sent_time = datetime.fromisoformat(email['sent_at'].replace('Z', '+00:00'))
                hour = sent_time.hour

                if hour not in time_performance:
                    time_performance[hour] = {'sent': 0, 'opened': 0}

                time_performance[hour]['sent'] += 1
                time_performance[hour]['opened'] += 1
            except:
                pass

    best_time = None
    worst_time = None
    if time_performance:
        # 计算每个小时的打开率
        hour_rates = {
            hour: data['opened'] / data['sent'] if data['sent'] > 0 else 0
            for hour, data in time_performance.items()
        }
        if hour_rates:
            best_time = max(hour_rates, key=hour_rates.get)
            worst_time = min(hour_rates, key=hour_rates.get)

    return {
        'total': total,
        'sent': sent,
        'opened': opened,
        'clicked': clicked,
        'open_rate': (opened / sent * 100) if sent > 0 else 0,
        'click_rate': (clicked / sent * 100) if sent > 0 else 0,
        'engagement_rate': (clicked / opened * 100) if opened > 0 else 0,
        'avg_opens': total_opens / sent if sent > 0 else 0,
        'avg_clicks': total_clicks / sent if sent > 0 else 0,
        'best_time': f"{best_time}:00" if best_time is not None else None,
        'worst_time': f"{worst_time}:00" if worst_time is not None else None
    }

def get_lead_engagement_history(emails: list) -> Dict:
    """
    获取线索的互动历史

    Args:
        emails: 该线索的所有邮件

    Returns:
        Dict: 互动历史分析
    """
    if not emails:
        return {
            'total_emails': 0,
            'total_opens': 0,
            'total_clicks': 0,
            'avg_score': 0,
            'engagement_trend': 'unknown',
            'last_interaction': None
        }

    total_emails = len(emails)
    total_opens = sum(e.get('opens', 0) for e in emails)
    total_clicks = sum(e.get('clicks', 0) for e in emails)

    # 计算平均互动分数
    scores = [get_email_engagement_score(e)['score'] for e in emails]
    avg_score = sum(scores) / len(scores) if scores else 0

    # 分析互动趋势
    if len(scores) >= 2:
        recent_avg = sum(scores[-3:]) / len(scores[-3:])
        old_avg = sum(scores[:-3]) / len(scores[:-3]) if len(scores) > 3 else scores[0]

        if recent_avg > old_avg + 10:
            trend = 'improving'
        elif recent_avg < old_avg - 10:
            trend = 'declining'
        else:
            trend = 'stable'
    else:
        trend = 'insufficient_data'

    # 最后互动时间
    last_interaction = None
    for email in sorted(emails, key=lambda x: x.get('clicked_at') or x.get('opened_at') or '', reverse=True):
        if email.get('clicked_at'):
            last_interaction = email['clicked_at']
            break
        elif email.get('opened_at'):
            last_interaction = email['opened_at']
            break

    return {
        'total_emails': total_emails,
        'total_opens': total_opens,
        'total_clicks': total_clicks,
        'avg_score': avg_score,
        'engagement_trend': trend,
        'last_interaction': last_interaction
    }
