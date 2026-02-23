import os
from supabase import create_client, Client
from datetime import datetime
from typing import List, Dict, Optional

# 导入配置
try:
    from config import SUPABASE_URL, SUPABASE_KEY
except ImportError:
    # 如果没有config.py,使用环境变量
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# 初始化Supabase客户端
supabase: Client = None

def init_supabase():
    """初始化Supabase连接"""
    global supabase
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        return True
    return False

# ==================== 学生线索管理 ====================

def add_lead(lead_data: Dict) -> str:
    """添加学生线索"""
    try:
        lead_data['created_at'] = datetime.now().isoformat()
        lead_data['updated_at'] = datetime.now().isoformat()

        result = supabase.table('leads').insert(lead_data).execute()
        return result.data[0]['id']
    except Exception as e:
        print(f"添加线索失败: {e}")
        raise

def get_leads(user_id: Optional[str] = None) -> List[Dict]:
    """获取学生线索列表"""
    try:
        query = supabase.table('leads').select('*')

        if user_id:
            query = query.eq('user_id', user_id)

        result = query.order('created_at', desc=True).execute()
        return result.data
    except Exception as e:
        print(f"获取线索失败: {e}")
        return []

def get_lead_by_id(lead_id: str) -> Optional[Dict]:
    """根据ID获取学生线索"""
    try:
        result = supabase.table('leads').select('*').eq('id', lead_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"获取线索失败: {e}")
        return None

def update_lead(lead_id: str, updates: Dict) -> bool:
    """更新学生线索"""
    try:
        updates['updated_at'] = datetime.now().isoformat()
        supabase.table('leads').update(updates).eq('id', lead_id).execute()
        return True
    except Exception as e:
        print(f"更新线索失败: {e}")
        return False

def delete_lead(lead_id: str) -> bool:
    """删除学生线索"""
    try:
        supabase.table('leads').delete().eq('id', lead_id).execute()
        return True
    except Exception as e:
        print(f"删除线索失败: {e}")
        return False

# ==================== 邮件管理 ====================

def save_email(email_data: Dict) -> str:
    """保存邮件"""
    try:
        email_data['created_at'] = datetime.now().isoformat()
        email_data['status'] = email_data.get('status', 'draft')

        result = supabase.table('emails').insert(email_data).execute()
        return result.data[0]['id']
    except Exception as e:
        print(f"保存邮件失败: {e}")
        raise

def save_sent_email(email_data: Dict, message_id: str) -> str:
    """保存已发送的邮件"""
    try:
        email_data['created_at'] = datetime.now().isoformat()
        email_data['sent_at'] = datetime.now().isoformat()
        email_data['status'] = 'sent'
        email_data['message_id'] = message_id

        result = supabase.table('emails').insert(email_data).execute()
        return result.data[0]['id']
    except Exception as e:
        print(f"保存邮件失败: {e}")
        raise

def get_emails(user_id: Optional[str] = None, lead_id: Optional[str] = None) -> List[Dict]:
    """获取邮件列表"""
    try:
        query = supabase.table('emails').select('*, leads(*)')

        if user_id:
            query = query.eq('user_id', user_id)

        if lead_id:
            query = query.eq('lead_id', lead_id)

        result = query.order('created_at', desc=True).execute()
        return result.data
    except Exception as e:
        print(f"获取邮件失败: {e}")
        return []

def update_email_status(email_id: str, status: str, extra_data: Optional[Dict] = None) -> bool:
    """更新邮件状态"""
    try:
        updates = {'status': status}

        if status == 'sent':
            updates['sent_at'] = datetime.now().isoformat()
        elif status == 'opened':
            updates['opened_at'] = datetime.now().isoformat()
        elif status == 'clicked':
            updates['clicked_at'] = datetime.now().isoformat()

        if extra_data:
            updates.update(extra_data)

        supabase.table('emails').update(updates).eq('id', email_id).execute()
        return True
    except Exception as e:
        print(f"更新邮件状态失败: {e}")
        return False

# ==================== 用户管理 ====================

def create_user(user_data: Dict) -> str:
    """创建用户"""
    try:
        user_data['created_at'] = datetime.now().isoformat()
        result = supabase.table('users').insert(user_data).execute()
        return result.data[0]['id']
    except Exception as e:
        print(f"创建用户失败: {e}")
        raise

def get_user_by_email(email: str) -> Optional[Dict]:
    """根据邮箱获取用户"""
    try:
        result = supabase.table('users').select('*').eq('email', email).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"获取用户失败: {e}")
        return None

def update_user(user_id: str, updates: Dict) -> bool:
    """更新用户信息"""
    try:
        supabase.table('users').update(updates).eq('id', user_id).execute()
        return True
    except Exception as e:
        print(f"更新用户失败: {e}")
        return False

# ==================== 统计数据 ====================

def get_stats(user_id: Optional[str] = None) -> Dict:
    """获取统计数据"""
    try:
        # 学生线索统计
        leads_query = supabase.table('leads').select('*', count='exact')
        if user_id:
            leads_query = leads_query.eq('user_id', user_id)
        leads_result = leads_query.execute()
        total_leads = leads_result.count

        # 邮件统计
        emails_query = supabase.table('emails').select('*', count='exact')
        if user_id:
            emails_query = emails_query.eq('user_id', user_id)
        emails_result = emails_query.execute()
        total_emails = emails_result.count

        # 打开率统计
        opened_query = supabase.table('emails').select('*', count='exact').not_.is_('opened_at', 'null')
        if user_id:
            opened_query = opened_query.eq('user_id', user_id)
        opened_result = opened_query.execute()
        opened_count = opened_result.count

        # 点击率统计
        clicked_query = supabase.table('emails').select('*', count='exact').not_.is_('clicked_at', 'null')
        if user_id:
            clicked_query = clicked_query.eq('user_id', user_id)
        clicked_result = clicked_query.execute()
        clicked_count = clicked_result.count

        return {
            'total_leads': total_leads,
            'total_emails': total_emails,
            'opened_emails': opened_count,
            'clicked_emails': clicked_count,
            'open_rate': (opened_count / total_emails * 100) if total_emails > 0 else 0,
            'click_rate': (clicked_count / total_emails * 100) if total_emails > 0 else 0
        }
    except Exception as e:
        print(f"获取统计数据失败: {e}")
        return {
            'total_leads': 0,
            'total_emails': 0,
            'opened_emails': 0,
            'clicked_emails': 0,
            'open_rate': 0,
            'click_rate': 0
        }

# ==================== 邮件追踪 ====================

def track_email_open(email_id: str, device_info: Optional[Dict] = None) -> bool:
    """追踪邮件打开"""
    try:
        updates = {
            'status': 'opened',
            'opened_at': datetime.now().isoformat(),
            'opens': supabase.table('emails').select('opens').eq('id', email_id).execute().data[0].get('opens', 0) + 1
        }

        if device_info:
            updates['device_info'] = device_info

        supabase.table('emails').update(updates).eq('id', email_id).execute()
        return True
    except Exception as e:
        print(f"追踪邮件打开失败: {e}")
        return False

def track_email_click(email_id: str, url: str, device_info: Optional[Dict] = None) -> bool:
    """追踪邮件点击"""
    try:
        updates = {
            'status': 'clicked',
            'clicked_at': datetime.now().isoformat(),
            'clicks': supabase.table('emails').select('clicks').eq('id', email_id).execute().data[0].get('clicks', 0) + 1,
            'clicked_url': url
        }

        if device_info:
            updates['click_device_info'] = device_info

        supabase.table('emails').update(updates).eq('id', email_id).execute()
        return True
    except Exception as e:
        print(f"追踪邮件点击失败: {e}")
        return False

# ==================== Subscription Management ====================

def get_user_by_id(user_id: str) -> Optional[Dict]:
    """Get user by id."""
    try:
        result = supabase.table('users').select('*').eq('id', user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Get user failed: {e}")
        return None

def get_user_subscription(user_id: str) -> Dict:
    """Return normalized subscription fields from users table."""
    fallback = {
        'plan': 'free',
        'subscription_status': 'inactive',
        'stripe_customer_id': '',
        'stripe_subscription_id': '',
        'checkout_session_id': '',
        'current_period_end': None,
    }
    try:
        user = get_user_by_id(user_id)
        if not user:
            return fallback
        return {
            'plan': user.get('plan', 'free') or 'free',
            'subscription_status': user.get('subscription_status', 'inactive') or 'inactive',
            'stripe_customer_id': user.get('stripe_customer_id', '') or '',
            'stripe_subscription_id': user.get('stripe_subscription_id', '') or '',
            'checkout_session_id': user.get('checkout_session_id', '') or '',
            'current_period_end': user.get('current_period_end'),
        }
    except Exception:
        return fallback

def update_user_subscription(
    user_id: str,
    plan: str,
    subscription_status: str,
    stripe_customer_id: Optional[str] = None,
    stripe_subscription_id: Optional[str] = None,
    checkout_session_id: Optional[str] = None,
    current_period_end: Optional[str] = None,
) -> bool:
    """Update subscription fields on users table."""
    try:
        updates = {
            'plan': plan,
            'subscription_status': subscription_status,
            'updated_at': datetime.now().isoformat(),
        }
        if stripe_customer_id is not None:
            updates['stripe_customer_id'] = stripe_customer_id
        if stripe_subscription_id is not None:
            updates['stripe_subscription_id'] = stripe_subscription_id
        if checkout_session_id is not None:
            updates['checkout_session_id'] = checkout_session_id
        if current_period_end is not None:
            updates['current_period_end'] = current_period_end

        supabase.table('users').update(updates).eq('id', user_id).execute()
        return True
    except Exception as e:
        print(f"Update subscription failed: {e}")
        return False
