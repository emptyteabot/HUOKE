"""
GuestSeek 配置文件
所有API密钥和配置都在这里
"""

# ==================== Supabase 配置 ====================
# 数据库连接配置
SUPABASE_URL = "https://jwtrkknqxopfgvipphyh.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3dHJra25xeG9wZmd2aXBwaHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1MzYwMDAsImV4cCI6MjAyNTExMjAwMH0.placeholder"  # 需要替换成真实的Key

# ==================== OpenAI 配置 ====================
# AI邮件生成配置
OPENAI_API_KEY = "sk-MRhl7sGPXCYtqtDx49fxuzv3SjbxrJlUza9ylZjlMTHYz0wu"
OPENAI_BASE_URL = "https://oneapi.gemiaude.com/v1"
OPENAI_MODEL = "gpt-4"  # 或 gpt-3.5-turbo

# ==================== SendGrid 配置 ====================
# 邮件发送配置
SENDGRID_API_KEY = "SG.placeholder"  # 需要替换成真实的Key
FROM_EMAIL = "noreply@guestseek.com"  # 需要替换成你验证过的邮箱
FROM_NAME = "GuestSeek"

# ==================== JWT 配置 ====================
# 用户认证配置
JWT_SECRET = "guestseek-super-secret-key-2024-change-this-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

# ==================== 应用配置 ====================
APP_NAME = "GuestSeek"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "AI驱动的留学获客助手"

# ==================== 功能开关 ====================
# 可以用来控制某些功能是否启用
ENABLE_EMAIL_SENDING = True  # 是否启用真实邮件发送
ENABLE_EMAIL_TRACKING = True  # 是否启用邮件追踪
ENABLE_WORKFLOWS = True  # 是否启用自动化工作流
ENABLE_PLATFORM_SCRAPER = True  # 是否启用多平台获客
ENABLE_ANALYTICS = True  # 是否启用数据分析

# ==================== 限制配置 ====================
# 免费版限制
FREE_PLAN_LIMITS = {
    'max_leads': 50,
    'max_emails_per_month': 100,
    'max_workflows': 3
}

# 专业版限制
PRO_PLAN_LIMITS = {
    'max_leads': 500,
    'max_emails_per_month': 2000,
    'max_workflows': 10
}

# 企业版限制
ENTERPRISE_PLAN_LIMITS = {
    'max_leads': -1,  # -1 表示无限
    'max_emails_per_month': -1,
    'max_workflows': -1
}

# ==================== 邮件模板配置 ====================
DEFAULT_EMAIL_TEMPLATES = {
    '首次咨询邮件': {
        'subject': '【{institution}】{name}，您好！关于您的留学咨询',
        'type': 'first_contact'
    },
    '留学规划建议': {
        'subject': '【{institution}】为{name}定制的{country}留学规划方案',
        'type': 'planning'
    },
    '院校推荐邮件': {
        'subject': '【{institution}】{name}，这些{country}院校很适合您',
        'type': 'recommendation'
    },
    '申请时间线提醒': {
        'subject': '【{institution}】{name}，{country}{degree}申请时间线',
        'type': 'timeline'
    },
    '成功案例分享': {
        'subject': '【{institution}】{name}，看看这位学长的{country}留学经历',
        'type': 'case_study'
    }
}

# ==================== 工作流模板配置 ====================
DEFAULT_WORKFLOW_TEMPLATES = [
    {
        'name': '3天未打开自动跟进',
        'trigger_type': 'email_not_opened',
        'trigger_conditions': {'days': 3},
        'enabled': True
    },
    {
        'name': '7天未点击发送优惠',
        'trigger_type': 'email_opened_not_clicked',
        'trigger_conditions': {'days': 7},
        'enabled': True
    },
    {
        'name': '高意向客户提醒',
        'trigger_type': 'engagement_score',
        'trigger_conditions': {'threshold': 70, 'operator': 'gte'},
        'enabled': True
    },
    {
        'name': '新线索自动欢迎',
        'trigger_type': 'new_lead',
        'trigger_conditions': {'hours': 1},
        'enabled': True
    }
]

# ==================== 数据分析配置 ====================
ANALYTICS_CONFIG = {
    'default_time_range': 30,  # 默认分析30天
    'conversion_funnel_stages': [
        '总线索',
        '已发送邮件',
        '已打开邮件',
        '已点击链接',
        '已转化'
    ],
    'default_cost_per_lead': 50,  # 默认每个线索成本(元)
    'default_revenue_per_conversion': 10000  # 默认每个转化收入(元)
}

# ==================== 多平台配置 ====================
PLATFORM_CONFIG = {
    'linkedin': {
        'enabled': True,
        'api_key': None,  # 需要LinkedIn API Key
        'search_limit': 10
    },
    'xiaohongshu': {
        'enabled': True,
        'search_limit': 10
    },
    'zhihu': {
        'enabled': True,
        'search_limit': 10
    }
}

# ==================== 调试配置 ====================
DEBUG = False  # 生产环境设为False
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR

# ==================== 帮助函数 ====================
def get_config(key, default=None):
    """获取配置值"""
    return globals().get(key, default)

def is_feature_enabled(feature_name):
    """检查功能是否启用"""
    return globals().get(f'ENABLE_{feature_name.upper()}', False)
