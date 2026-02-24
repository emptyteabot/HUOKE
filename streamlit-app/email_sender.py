import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, TrackingSettings, ClickTracking, OpenTracking
from typing import Dict, List, Optional
from datetime import datetime
import uuid

# 导入配置
try:
    from config import SENDGRID_API_KEY, FROM_EMAIL, FROM_NAME
except ImportError:
    # 如果没有config.py,使用环境变量
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@guestseek.com")
    FROM_NAME = "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce"

def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    body: str,
    from_name: str = "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce",
    track_opens: bool = True,
    track_clicks: bool = True,
    email_id: Optional[str] = None
) -> Dict:
    """
    发送单封邮件

    Args:
        to_email: 收件人邮箱
        to_name: 收件人姓名
        subject: 邮件主题
        body: 邮件正文(支持HTML)
        from_name: 发件人名称
        track_opens: 是否追踪打开
        track_clicks: 是否追踪点击
        email_id: 邮件ID(用于追踪)

    Returns:
        Dict: {
            'success': bool,
            'message_id': str,
            'error': str (if failed)
        }
    """
    try:
        if not SENDGRID_API_KEY:
            return {
                'success': False,
                'error': '未配置SendGrid API Key'
            }

        # 如果提供了email_id,添加追踪代码
        if email_id and track_opens:
            from email_tracking import add_tracking_to_email
            body = add_tracking_to_email(body, email_id)

        # 创建邮件
        message = Mail(
            from_email=Email(FROM_EMAIL, from_name),
            to_emails=To(to_email, to_name),
            subject=subject,
            html_content=Content("text/html", body)
        )

        # 配置追踪
        tracking_settings = TrackingSettings()

        if track_opens:
            tracking_settings.open_tracking = OpenTracking(enable=True)

        if track_clicks:
            tracking_settings.click_tracking = ClickTracking(enable=True, enable_text=True)

        message.tracking_settings = tracking_settings

        # 添加自定义参数用于webhook追踪
        if email_id:
            message.custom_args = {'email_id': email_id}

        # 发送邮件
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)

        return {
            'success': True,
            'message_id': response.headers.get('X-Message-Id', str(uuid.uuid4())),
            'status_code': response.status_code
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def send_batch_emails(
    recipients: List[Dict],
    subject_template: str,
    body_template: str,
    from_name: str = "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce"
) -> Dict:
    """
    批量发送邮件

    Args:
        recipients: 收件人列表 [{'email': '', 'name': '', 'variables': {}}]
        subject_template: 主题模板 (支持变量: {name}, {country}, etc.)
        body_template: 正文模板 (支持变量)
        from_name: 发件人名称

    Returns:
        Dict: {
            'success_count': int,
            'failed_count': int,
            'results': List[Dict]
        }
    """
    results = []
    success_count = 0
    failed_count = 0

    for recipient in recipients:
        try:
            # 替换变量
            variables = recipient.get('variables', {})
            variables['name'] = recipient.get('name', '')

            subject = subject_template.format(**variables)
            body = body_template.format(**variables)

            # 发送邮件
            result = send_email(
                to_email=recipient['email'],
                to_name=recipient['name'],
                subject=subject,
                body=body,
                from_name=from_name
            )

            if result['success']:
                success_count += 1
            else:
                failed_count += 1

            results.append({
                'email': recipient['email'],
                'name': recipient['name'],
                'success': result['success'],
                'message_id': result.get('message_id'),
                'error': result.get('error')
            })

        except Exception as e:
            failed_count += 1
            results.append({
                'email': recipient['email'],
                'name': recipient['name'],
                'success': False,
                'error': str(e)
            })

    return {
        'success_count': success_count,
        'failed_count': failed_count,
        'total': len(recipients),
        'results': results
    }

def format_email_html(body_text: str, institution_name: str = "\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce") -> str:
    """
    将纯文本邮件转换为HTML格式

    Args:
        body_text: 邮件正文(纯文本)
        institution_name: 机构名称

    Returns:
        str: HTML格式的邮件
    """
    # 将换行转换为<br>
    body_html = body_text.replace('\n', '<br>')

    # 添加HTML模板
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .email-container {{
                background: #ffffff;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }}
            .email-body {{
                margin: 20px 0;
            }}
            .email-footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 0.9em;
                color: #6b7280;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                border-radius: 6px;
                text-decoration: none;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-body">
                {body_html}
            </div>
            <div class="email-footer">
                <p>此邮件由 {institution_name} 通过 \u7559\u5b66\u83b7\u5ba2\u5f15\u64ce 发送</p>
                <p style="font-size: 0.8em; color: #9ca3af;">
                    如不想再收到此类邮件,请<a href="{{{{unsubscribe}}}}">点击退订</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return html

def test_sendgrid_connection() -> Dict:
    """
    测试SendGrid连接

    Returns:
        Dict: {
            'success': bool,
            'message': str
        }
    """
    try:
        if not SENDGRID_API_KEY:
            return {
                'success': False,
                'message': '未配置SendGrid API Key'
            }

        sg = SendGridAPIClient(SENDGRID_API_KEY)

        # 发送测试邮件到自己
        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=FROM_EMAIL,
            subject='\u7559\u5b66\u83b7\u5ba2\u5f15\u64ce 测试邮件',
            html_content='<p>这是一封测试邮件,如果你收到了,说明SendGrid配置成功!</p>'
        )

        response = sg.send(message)

        return {
            'success': True,
            'message': f'测试邮件已发送! 状态码: {response.status_code}'
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'连接失败: {str(e)}'
        }
