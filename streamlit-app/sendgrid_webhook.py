"""
SendGrid Webhook处理器

用于接收SendGrid的事件通知(打开、点击等)

部署说明:
1. 这个文件需要部署为独立的API服务(例如使用FastAPI)
2. 在SendGrid控制台配置Webhook URL: https://your-domain.com/webhook/sendgrid
3. 选择要追踪的事件: open, click, bounce, etc.

注意: Streamlit不支持POST请求,所以这个功能需要单独的后端服务
如果不想部署后端,可以使用SendGrid的Event Webhook + Zapier/Make.com转发到Supabase
"""

from typing import Dict, List
from datetime import datetime
import json

def process_sendgrid_event(event: Dict) -> Dict:
    """
    处理SendGrid事件

    Args:
        event: SendGrid事件数据

    Returns:
        Dict: 处理结果
    """
    event_type = event.get('event')
    email_id = event.get('email_id')  # 从custom_args获取
    timestamp = event.get('timestamp')

    if not email_id:
        return {'success': False, 'error': 'Missing email_id'}

    # 根据事件类型更新数据库
    if event_type == 'open':
        return handle_email_open(email_id, event)
    elif event_type == 'click':
        return handle_email_click(email_id, event)
    elif event_type == 'bounce':
        return handle_email_bounce(email_id, event)
    elif event_type == 'dropped':
        return handle_email_dropped(email_id, event)
    else:
        return {'success': True, 'message': f'Event {event_type} received but not processed'}

def handle_email_open(email_id: str, event: Dict) -> Dict:
    """处理邮件打开事件"""
    try:
        from database import track_email_open

        device_info = {
            'user_agent': event.get('useragent'),
            'ip': event.get('ip'),
            'timestamp': event.get('timestamp')
        }

        track_email_open(email_id, device_info)

        return {'success': True, 'message': 'Email open tracked'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def handle_email_click(email_id: str, event: Dict) -> Dict:
    """处理邮件点击事件"""
    try:
        from database import track_email_click

        url = event.get('url', '')
        device_info = {
            'user_agent': event.get('useragent'),
            'ip': event.get('ip'),
            'timestamp': event.get('timestamp')
        }

        track_email_click(email_id, url, device_info)

        return {'success': True, 'message': 'Email click tracked'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def handle_email_bounce(email_id: str, event: Dict) -> Dict:
    """处理邮件退回事件"""
    try:
        from database import update_email_status

        bounce_reason = event.get('reason', '')
        update_email_status(email_id, 'bounced', {'bounce_reason': bounce_reason})

        return {'success': True, 'message': 'Email bounce tracked'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def handle_email_dropped(email_id: str, event: Dict) -> Dict:
    """处理邮件丢弃事件"""
    try:
        from database import update_email_status

        drop_reason = event.get('reason', '')
        update_email_status(email_id, 'dropped', {'drop_reason': drop_reason})

        return {'success': True, 'message': 'Email drop tracked'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# FastAPI示例代码(如果需要部署独立后端)
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/webhook/sendgrid")
async def sendgrid_webhook(request: Request):
    '''接收SendGrid webhook事件'''
    try:
        events = await request.json()

        # SendGrid会发送事件数组
        if isinstance(events, list):
            results = []
            for event in events:
                result = process_sendgrid_event(event)
                results.append(result)

            return JSONResponse({
                'success': True,
                'processed': len(results),
                'results': results
            })
        else:
            result = process_sendgrid_event(events)
            return JSONResponse(result)

    except Exception as e:
        return JSONResponse({
            'success': False,
            'error': str(e)
        }, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
"""

# 替代方案: 使用Zapier/Make.com
"""
如果不想部署后端服务,可以使用以下方案:

1. 在SendGrid配置Event Webhook指向Zapier/Make.com
2. 在Zapier/Make.com中创建流程:
   - Trigger: Webhook (接收SendGrid事件)
   - Action: Supabase (更新emails表)

3. Zapier配置示例:
   - When: Webhook receives data
   - Do: Update row in Supabase
   - Table: emails
   - Match: id = {{email_id}}
   - Set: opened_at = {{timestamp}}, opens = {{opens}} + 1

这样就不需要自己维护后端服务了!
"""
