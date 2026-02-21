import streamlit as st
import json
import os
from datetime import datetime
from openai import OpenAI

# 配置
OPENAI_API_KEY = st.secrets.get("OPENAI_API_KEY", "")
OPENAI_BASE_URL = st.secrets.get("OPENAI_BASE_URL", "https://api.openai.com/v1")

# 数据存储路径
DATA_DIR = "data"
LEADS_FILE = os.path.join(DATA_DIR, "leads.json")
EMAILS_FILE = os.path.join(DATA_DIR, "emails.json")

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)

# 初始化OpenAI客户端
def get_openai_client():
    if OPENAI_API_KEY:
        return OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)
    return None

# 数据加载和保存
def load_data(file_path):
    """加载JSON数据"""
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_data(file_path, data):
    """保存JSON数据"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 线索管理
def add_lead(lead_data):
    """添加线索"""
    leads = load_data(LEADS_FILE)
    lead_data['id'] = str(len(leads) + 1)
    lead_data['created_at'] = datetime.now().isoformat()
    leads.append(lead_data)
    save_data(LEADS_FILE, leads)
    return lead_data['id']

def get_leads():
    """获取所有线索"""
    return load_data(LEADS_FILE)

def get_lead_by_id(lead_id):
    """根据ID获取线索"""
    leads = load_data(LEADS_FILE)
    for lead in leads:
        if lead['id'] == lead_id:
            return lead
    return None

# AI邮件生成
def generate_email_with_ai(lead_info, template_type, institution_name, consultant_name, key_points):
    """使用AI生成邮件"""
    client = get_openai_client()

    if not client:
        return {
            'subject': f"关于{lead_info['name']}的留学咨询",
            'body': f"""尊敬的家长您好,

我是{institution_name}的留学顾问{consultant_name}。

了解到您的孩子{lead_info['name']}有意向申请{lead_info.get('target_country', '')}的{lead_info.get('target_degree', '')}项目。

我们的优势:
{key_points}

期待您的回复!

此致
{consultant_name}
{institution_name}"""
        }

    prompt = f"""你是一个专业的留学顾问,请生成一封个性化的咨询邮件。

学生信息:
- 姓名: {lead_info['name']}
- 目标国家: {lead_info.get('target_country', '未指定')}
- 目标学历: {lead_info.get('target_degree', '未指定')}
- 意向专业: {lead_info.get('major', '未指定')}
- 预算范围: {lead_info.get('budget', '未指定')}

机构信息:
- 机构名称: {institution_name}
- 顾问姓名: {consultant_name}
- 核心优势: {key_points}

邮件类型: {template_type}

要求:
1. 友好、专业的语气
2. 200字左右
3. 个性化内容
4. 明确的行动号召
5. 包含成功案例

请以JSON格式返回:
{{
  "subject": "邮件主题",
  "body": "邮件正文"
}}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "你是一个专业的留学顾问,擅长生成高转化率的个性化邮件。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        st.error(f"AI生成失败: {e}")
        return {
            'subject': f"关于{lead_info['name']}的留学咨询",
            'body': "邮件生成失败,请重试"
        }

# 邮件管理
def save_email(email_data):
    """保存邮件"""
    emails = load_data(EMAILS_FILE)
    email_data['id'] = str(len(emails) + 1)
    email_data['created_at'] = datetime.now().isoformat()
    email_data['status'] = 'draft'
    emails.append(email_data)
    save_data(EMAILS_FILE, emails)
    return email_data['id']

def get_emails():
    """获取所有邮件"""
    return load_data(EMAILS_FILE)

# 统计数据
def get_stats():
    """获取统计数据"""
    leads = get_leads()
    emails = get_emails()

    return {
        'total_leads': len(leads),
        'total_emails': len(emails),
        'open_rate': 42.5,  # 模拟数据
        'click_rate': 12.3   # 模拟数据
    }
