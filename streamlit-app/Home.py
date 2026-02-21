import streamlit as st
import sys
import os

# 添加父目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 页面配置
st.set_page_config(
    page_title="GuestSeek - AI留学获客助手",
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="collapsed"  # 隐藏侧边栏
)

# 自定义CSS - OpenAI + Google风格
st.markdown("""
<style>
    /* 隐藏Streamlit默认元素 */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* 隐藏侧边栏 */
    [data-testid="stSidebar"] {
        display: none;
    }

    /* 全局字体 */
    * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    /* 主容器 */
    .main {
        background: #ffffff;
        padding: 0;
    }

    /* 顶部导航栏 */
    .top-nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        align-items: center;
        padding: 0 2rem;
        z-index: 1000;
    }

    .logo {
        font-size: 1.5rem;
        font-weight: 600;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-right: 3rem;
    }

    .nav-links {
        display: flex;
        gap: 2rem;
        flex: 1;
    }

    .nav-link {
        color: #6b7280;
        text-decoration: none;
        font-size: 0.95rem;
        transition: color 0.2s;
        cursor: pointer;
    }

    .nav-link:hover {
        color: #111827;
    }

    .nav-link.active {
        color: #111827;
        font-weight: 500;
    }

    /* 主内容区 */
    .content-wrapper {
        margin-top: 80px;
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
        padding: 0 2rem;
    }

    /* Hero区域 */
    .hero {
        text-align: center;
        padding: 4rem 0;
    }

    .hero-title {
        font-size: 3.5rem;
        font-weight: 700;
        color: #111827;
        margin-bottom: 1rem;
        line-height: 1.2;
    }

    .hero-subtitle {
        font-size: 1.25rem;
        color: #6b7280;
        margin-bottom: 2rem;
    }

    /* 卡片 */
    .card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 1.5rem;
        transition: all 0.3s;
    }

    .card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border-color: #d1d5db;
    }

    /* 按钮 */
    .stButton>button {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        font-weight: 500;
        transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    /* 输入框 */
    .stTextInput>div>div>input,
    .stTextArea>div>div>textarea,
    .stSelectbox>div>div>select {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.75rem;
        font-size: 0.95rem;
        transition: all 0.2s;
    }

    .stTextInput>div>div>input:focus,
    .stTextArea>div>div>textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    /* 标签页 */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .stTabs [data-baseweb="tab"] {
        padding: 1rem 0;
        color: #6b7280;
        font-weight: 500;
        border-bottom: 2px solid transparent;
    }

    .stTabs [aria-selected="true"] {
        color: #111827;
        border-bottom-color: #667eea;
    }

    /* 功能卡片 */
    .feature-card {
        background: linear-gradient(135deg, #f6f8fb 0%, #ffffff 100%);
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 2rem;
        text-align: center;
        transition: all 0.3s;
        cursor: pointer;
    }

    .feature-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        border-color: #667eea;
    }

    .feature-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .feature-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
        margin-bottom: 0.5rem;
    }

    .feature-desc {
        color: #6b7280;
        font-size: 0.95rem;
    }

    /* 打字机效果 */
    .typing-effect {
        border-left: 2px solid #667eea;
        padding-left: 1rem;
        animation: blink 1s infinite;
    }

    @keyframes blink {
        0%, 50% { border-color: #667eea; }
        51%, 100% { border-color: transparent; }
    }
</style>
""", unsafe_allow_html=True)

# 顶部导航栏
st.markdown("""
<div class="top-nav">
    <div class="logo">✨ GuestSeek</div>
    <div class="nav-links">
        <a class="nav-link active" href="#home">首页</a>
        <a class="nav-link" href="#features">功能</a>
        <a class="nav-link" href="#pricing">定价</a>
    </div>
</div>
""", unsafe_allow_html=True)

# 主内容
st.markdown('<div class="content-wrapper">', unsafe_allow_html=True)

# Hero区域
st.markdown("""
<div class="hero">
    <h1 class="hero-title">AI驱动的留学获客助手</h1>
    <p class="hero-subtitle">3秒生成个性化咨询邮件,10倍提升转化率</p>
</div>
""", unsafe_allow_html=True)

# 功能选择
col1, col2, col3, col4, col5, col6 = st.columns(6)

with col1:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">👥</div>
        <div class="feature-title">学生管理</div>
        <div class="feature-desc">记录学生信息和意向</div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("进入", key="btn_leads", use_container_width=True):
        st.session_state.current_page = "leads"

with col2:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <div class="feature-title">AI生成邮件</div>
        <div class="feature-desc">GPT-5.2自动生成</div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("进入", key="btn_ai", use_container_width=True):
        st.session_state.current_page = "ai"

with col3:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">📧</div>
        <div class="feature-title">批量发送</div>
        <div class="feature-desc">一键群发邮件</div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("进入", key="btn_batch", use_container_width=True):
        st.session_state.current_page = "batch"

with col4:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <div class="feature-title">自动化</div>
        <div class="feature-desc">智能工作流</div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("进入", key="btn_workflow", use_container_width=True):
        st.session_state.current_page = "workflow"

with col5:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">🌐</div>
        <div class="feature-title">多平台获客</div>
        <div class="feature-desc">LinkedIn/小红书/知乎</div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("进入", key="btn_scraper", use_container_width=True):
        st.session_state.current_page = "scraper"

with col6:
    st.markdown("""
    <div class="feature-card">
        <div class="feature-icon">📊</div>
        <div class="feature-title">数据分析</div>
        <div class="feature-desc">查看转化率和ROI</div>
    </div>
    """, unsafe_allow_html=True)
    if st.button("进入", key="btn_analytics", use_container_width=True):
        st.session_state.current_page = "analytics"

st.markdown("---")

# 根据选择显示不同页面
if 'current_page' not in st.session_state:
    st.session_state.current_page = "home"

if st.session_state.current_page == "leads":
    st.markdown("## 👥 学生线索管理")

    # 添加学生表单
    with st.form("add_lead_form", clear_on_submit=True):
        st.markdown("### 添加新学生")

        col1, col2 = st.columns(2)

        with col1:
            name = st.text_input("学生姓名", placeholder="张三")
            email = st.text_input("邮箱", placeholder="zhang@email.com")
            phone = st.text_input("家长电话", placeholder="+86 138 0000 0000")

        with col2:
            target_country = st.selectbox("目标国家", ["美国", "英国", "加拿大", "澳大利亚", "新加坡"])
            target_degree = st.selectbox("目标学历", ["本科", "硕士", "博士"])
            major = st.text_input("意向专业", placeholder="计算机科学")

        budget = st.selectbox("预算范围", ["20-30万", "30-50万", "50-80万", "80万以上"])
        notes = st.text_area("备注", placeholder="学生背景、特殊需求...")

        submitted = st.form_submit_button("✅ 添加学生", use_container_width=True)

        if submitted and name and email:
            try:
                from utils import add_lead
                lead_id = add_lead({
                    'name': name,
                    'email': email,
                    'phone': phone,
                    'target_country': target_country,
                    'target_degree': target_degree,
                    'major': major,
                    'budget': budget,
                    'notes': notes
                })
                st.success(f"✅ 成功添加学生: {name}")
            except Exception as e:
                st.error(f"添加失败: {e}")

    # 显示学生列表
    st.markdown("### 学生列表")
    try:
        from utils import get_leads
        import pandas as pd

        leads = get_leads()
        if leads:
            df = pd.DataFrame(leads)
            st.dataframe(df, use_container_width=True, hide_index=True)
        else:
            st.info("暂无学生数据,请先添加")
    except Exception as e:
        st.info("暂无学生数据")

elif st.session_state.current_page == "ai":
    st.markdown("## 🤖 AI邮件生成")

    # 选择学生
    try:
        from utils import get_leads, generate_email_with_ai

        leads = get_leads()
        if not leads:
            st.warning("请先添加学生")
        else:
            lead_options = {f"{lead['name']} - {lead.get('target_country', '')} {lead.get('target_degree', '')}": lead for lead in leads}
            selected_lead_name = st.selectbox("选择学生", list(lead_options.keys()))
            selected_lead = lead_options[selected_lead_name]

            col1, col2 = st.columns(2)

            with col1:
                template_type = st.selectbox("邮件类型", [
                    "首次咨询邮件",
                    "留学规划建议",
                    "院校推荐邮件",
                    "申请时间线提醒",
                    "成功案例分享"
                ])

                institution_name = st.text_input("机构名称", value="XX留学")
                consultant_name = st.text_input("顾问姓名", value="李老师")

            with col2:
                key_points = st.text_area("核心卖点", value="• 300+成功案例\n• TOP30录取率85%\n• 一对一规划", height=150)

            if st.button("✨ 生成邮件", use_container_width=True, type="primary"):
                with st.spinner("🤖 AI正在生成..."):
                    result = generate_email_with_ai(
                        selected_lead,
                        template_type,
                        institution_name,
                        consultant_name,
                        key_points
                    )

                    st.markdown("### 📧 生成结果")
                    st.markdown(f"**主题**: {result['subject']}")
                    st.markdown("**正文**:")
                    st.markdown(f'<div class="typing-effect">{result["body"]}</div>', unsafe_allow_html=True)

                    # 保存到session state
                    st.session_state.generated_email = {
                        'subject': result['subject'],
                        'body': result['body'],
                        'lead': selected_lead
                    }

                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        if st.button("📋 复制", use_container_width=True):
                            st.success("已复制到剪贴板!")
                    with col_b:
                        if st.button("💾 保存草稿", use_container_width=True):
                            try:
                                from database import init_supabase, save_email
                                from auth import get_current_user

                                if not init_supabase():
                                    st.error("数据库连接失败")
                                else:
                                    user = get_current_user()
                                    if user:
                                        email_id = save_email({
                                            'user_id': user['id'],
                                            'lead_id': selected_lead['id'],
                                            'subject': result['subject'],
                                            'body': result['body'],
                                            'status': 'draft'
                                        })
                                        st.success("✅ 已保存为草稿")
                                    else:
                                        st.warning("请先登录")
                            except Exception as e:
                                st.error(f"保存失败: {e}")
                    with col_c:
                        if st.button("📧 立即发送", use_container_width=True, type="primary"):
                            try:
                                from email_sender import send_email, format_email_html
                                from database import init_supabase, save_sent_email
                                from auth import get_current_user

                                if not init_supabase():
                                    st.error("数据库连接失败")
                                else:
                                    user = get_current_user()
                                    if not user:
                                        st.warning("请先登录")
                                    else:
                                        with st.spinner("📧 正在发送..."):
                                            # 转换为HTML格式
                                            html_body = format_email_html(
                                                result['body'],
                                                institution_name
                                            )

                                            # 发送邮件
                                            send_result = send_email(
                                                to_email=selected_lead['email'],
                                                to_name=selected_lead['name'],
                                                subject=result['subject'],
                                                body=html_body,
                                                from_name=institution_name
                                            )

                                            if send_result['success']:
                                                # 保存到数据库
                                                save_sent_email({
                                                    'user_id': user['id'],
                                                    'lead_id': selected_lead['id'],
                                                    'subject': result['subject'],
                                                    'body': result['body']
                                                }, send_result['message_id'])

                                                st.success(f"✅ 邮件已发送到 {selected_lead['email']}")
                                            else:
                                                st.error(f"❌ 发送失败: {send_result.get('error', '未知错误')}")
                            except Exception as e:
                                st.error(f"发送失败: {e}")

    except Exception as e:
        st.error(f"错误: {e}")

elif st.session_state.current_page == "batch":
    st.markdown("## 📧 批量邮件发送")

    try:
        from utils import get_leads
        from email_sender import send_batch_emails, format_email_html
        from database import init_supabase, save_sent_email
        from auth import get_current_user

        leads = get_leads()
        if not leads:
            st.warning("请先添加学生")
        else:
            st.markdown("### 选择收件人")

            # 多选学生
            selected_leads = []
            for lead in leads:
                if st.checkbox(f"{lead['name']} - {lead.get('email', '无邮箱')} - {lead.get('target_country', '')} {lead.get('target_degree', '')}", key=f"lead_{lead['id']}"):
                    selected_leads.append(lead)

            st.markdown(f"**已选择: {len(selected_leads)} 位学生**")

            if selected_leads:
                st.markdown("### 邮件内容")

                col1, col2 = st.columns(2)

                with col1:
                    institution_name = st.text_input("机构名称", value="XX留学")
                    subject_template = st.text_input("邮件主题", value="【{institution}】为{name}定制的留学规划方案")

                with col2:
                    consultant_name = st.text_input("顾问姓名", value="李老师")

                body_template = st.text_area(
                    "邮件正文模板",
                    value="""尊敬的{name}家长,您好!

我是{institution}的{consultant},很高兴为您服务。

根据您孩子的情况({target_country} {target_degree}),我们为您准备了专属的留学规划方案。

我们的优势:
• 300+成功案例
• TOP30录取率85%
• 一对一专业规划

期待与您进一步沟通!

{consultant}
{institution}""",
                    height=300
                )

                if st.button("📧 批量发送", use_container_width=True, type="primary"):
                    if not init_supabase():
                        st.error("数据库连接失败")
                    else:
                        user = get_current_user()
                        if not user:
                            st.warning("请先登录")
                        else:
                            with st.spinner(f"📧 正在发送 {len(selected_leads)} 封邮件..."):
                                # 准备收件人列表
                                recipients = []
                                for lead in selected_leads:
                                    if lead.get('email'):
                                        recipients.append({
                                            'email': lead['email'],
                                            'name': lead['name'],
                                            'variables': {
                                                'name': lead['name'],
                                                'institution': institution_name,
                                                'consultant': consultant_name,
                                                'target_country': lead.get('target_country', ''),
                                                'target_degree': lead.get('target_degree', ''),
                                                'major': lead.get('major', '')
                                            }
                                        })

                                if not recipients:
                                    st.error("所选学生中没有有效邮箱")
                                else:
                                    # 批量发送
                                    result = send_batch_emails(
                                        recipients=recipients,
                                        subject_template=subject_template,
                                        body_template=body_template,
                                        from_name=institution_name
                                    )

                                    # 保存发送记录
                                    for r in result['results']:
                                        if r['success']:
                                            # 找到对应的lead
                                            lead = next((l for l in selected_leads if l['email'] == r['email']), None)
                                            if lead:
                                                try:
                                                    save_sent_email({
                                                        'user_id': user['id'],
                                                        'lead_id': lead['id'],
                                                        'subject': subject_template.format(**recipients[0]['variables']),
                                                        'body': body_template.format(**recipients[0]['variables'])
                                                    }, r['message_id'])
                                                except:
                                                    pass

                                    # 显示结果
                                    st.success(f"✅ 成功发送: {result['success_count']} 封")
                                    if result['failed_count'] > 0:
                                        st.error(f"❌ 发送失败: {result['failed_count']} 封")

                                    # 详细结果
                                    with st.expander("查看详细结果"):
                                        for r in result['results']:
                                            if r['success']:
                                                st.success(f"✅ {r['name']} ({r['email']})")
                                            else:
                                                st.error(f"❌ {r['name']} ({r['email']}): {r.get('error', '未知错误')}")

    except Exception as e:
        st.error(f"错误: {e}")

elif st.session_state.current_page == "workflow":
    st.markdown("## ⚡ 自动化工作流")

    try:
        from database import init_supabase
        from auth import get_current_user
        from workflow_engine import WorkflowEngine, WORKFLOW_TEMPLATES

        if not init_supabase():
            st.error("数据库连接失败")
        else:
            user = get_current_user()
            if not user:
                st.warning("请先登录")
            else:
                from database import supabase
                engine = WorkflowEngine(supabase)

                # 标签页
                tab1, tab2, tab3 = st.tabs(["📋 我的工作流", "➕ 创建工作流", "▶️ 执行工作流"])

                with tab1:
                    st.markdown("### 我的工作流")

                    workflows = engine.get_workflows(user['id'])

                    if workflows:
                        for wf in workflows:
                            with st.expander(f"{'✅' if wf['enabled'] else '❌'} {wf['name']}", expanded=False):
                                st.markdown(f"**触发器**: {wf['trigger_type']}")
                                st.markdown(f"**条件**: {wf['trigger_conditions']}")
                                st.markdown(f"**动作数量**: {len(wf['actions'])}")
                                st.markdown(f"**状态**: {'启用' if wf['enabled'] else '禁用'}")

                                col1, col2, col3 = st.columns(3)

                                with col1:
                                    if wf['enabled']:
                                        if st.button("❌ 禁用", key=f"disable_{wf['id']}", use_container_width=True):
                                            engine.update_workflow(wf['id'], {'enabled': False})
                                            st.success("已禁用")
                                            st.rerun()
                                    else:
                                        if st.button("✅ 启用", key=f"enable_{wf['id']}", use_container_width=True):
                                            engine.update_workflow(wf['id'], {'enabled': True})
                                            st.success("已启用")
                                            st.rerun()

                                with col2:
                                    if st.button("🗑️ 删除", key=f"delete_{wf['id']}", use_container_width=True):
                                        engine.delete_workflow(wf['id'])
                                        st.success("已删除")
                                        st.rerun()

                                with col3:
                                    if st.button("▶️ 立即执行", key=f"run_{wf['id']}", use_container_width=True):
                                        with st.spinner("执行中..."):
                                            # 临时创建只包含这个工作流的列表
                                            result = engine.check_and_execute_workflows(user['id'])
                                            st.success(f"执行完成! 触发: {result['triggered']}, 成功: {result['executed']}, 失败: {result['failed']}")
                    else:
                        st.info("暂无工作流,请创建一个")

                with tab2:
                    st.markdown("### 快速创建工作流")

                    st.markdown("#### 从模板创建")

                    for template_name, template_data in WORKFLOW_TEMPLATES.items():
                        with st.expander(f"📋 {template_name}"):
                            st.markdown(f"**触发条件**: {template_data['trigger_type']}")
                            st.json(template_data['trigger_conditions'])
                            st.markdown(f"**动作数量**: {len(template_data['actions'])}")

                            if st.button(f"使用此模板", key=f"use_template_{template_name}", use_container_width=True):
                                template_data['user_id'] = user['id']
                                workflow_id = engine.create_workflow(template_data)
                                st.success(f"✅ 工作流已创建: {template_name}")
                                st.rerun()

                    st.markdown("---")
                    st.markdown("#### 自定义工作流")

                    with st.form("create_workflow_form"):
                        name = st.text_input("工作流名称", placeholder="例如: 3天未回复自动跟进")

                        trigger_type = st.selectbox("触发器类型", [
                            "email_not_opened",
                            "email_opened_not_clicked",
                            "email_clicked_no_reply",
                            "new_lead",
                            "engagement_score"
                        ])

                        st.markdown("**触发条件**")
                        if trigger_type in ['email_not_opened', 'email_opened_not_clicked', 'email_clicked_no_reply']:
                            days = st.number_input("天数", min_value=1, max_value=30, value=3)
                            trigger_conditions = {'days': days}
                        elif trigger_type == 'new_lead':
                            hours = st.number_input("小时数", min_value=1, max_value=24, value=1)
                            trigger_conditions = {'hours': hours}
                        elif trigger_type == 'engagement_score':
                            threshold = st.number_input("分数阈值", min_value=0, max_value=100, value=70)
                            operator = st.selectbox("比较方式", ["gte (>=)", "lte (<=)", "eq (=)"])
                            trigger_conditions = {'threshold': threshold, 'operator': operator.split()[0]}

                        st.markdown("**动作配置**")
                        action_type = st.selectbox("动作类型", [
                            "send_email",
                            "update_lead_status",
                            "add_tag",
                            "send_notification"
                        ])

                        if action_type == "send_email":
                            email_subject = st.text_input("邮件主题", value="跟进邮件")
                            email_body = st.text_area("邮件内容", value="您好,这是一封自动跟进邮件。")
                            actions = [{
                                'type': 'send_email',
                                'subject': email_subject,
                                'body': email_body,
                                'from_name': 'XX留学',
                                'institution_name': 'XX留学'
                            }]
                        elif action_type == "update_lead_status":
                            new_status = st.text_input("新状态", value="follow_up")
                            actions = [{'type': 'update_lead_status', 'status': new_status}]
                        elif action_type == "add_tag":
                            tag = st.text_input("标签", value="已跟进")
                            actions = [{'type': 'add_tag', 'tag': tag}]
                        elif action_type == "send_notification":
                            message = st.text_input("通知消息", value="工作流触发")
                            actions = [{'type': 'send_notification', 'message': message}]

                        submitted = st.form_submit_button("创建工作流", use_container_width=True, type="primary")

                        if submitted and name:
                            workflow_data = {
                                'user_id': user['id'],
                                'name': name,
                                'trigger_type': trigger_type,
                                'trigger_conditions': trigger_conditions,
                                'actions': actions,
                                'enabled': True
                            }

                            workflow_id = engine.create_workflow(workflow_data)
                            st.success(f"✅ 工作流已创建: {name}")
                            st.rerun()

                with tab3:
                    st.markdown("### 执行所有工作流")

                    st.info("💡 点击下方按钮,系统会检查所有启用的工作流并自动执行")

                    if st.button("▶️ 立即执行所有工作流", use_container_width=True, type="primary"):
                        with st.spinner("正在执行工作流..."):
                            result = engine.check_and_execute_workflows(user['id'])

                            st.success(f"""
                            ✅ 执行完成!

                            - 检查工作流: {result['checked']} 个
                            - 触发项目: {result['triggered']} 个
                            - 成功执行: {result['executed']} 个
                            - 执行失败: {result['failed']} 个
                            """)

                            if result['results']:
                                with st.expander("查看详细结果"):
                                    for r in result['results']:
                                        if r['success']:
                                            st.success(f"✅ {r['workflow_name']}")
                                        else:
                                            st.error(f"❌ {r['workflow_name']}")

                    st.markdown("---")
                    st.markdown("### 自动执行设置")
                    st.info("💡 建议使用外部定时任务(如GitHub Actions、Cron)每小时调用一次工作流执行")

                    st.code("""
# 使用GitHub Actions自动执行工作流
# .github/workflows/run-workflows.yml

name: Run Workflows
on:
  schedule:
    - cron: '0 * * * *'  # 每小时执行一次

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Execute Workflows
        run: |
          curl -X POST https://your-app.streamlit.app/api/workflows/execute \\
            -H "Authorization: Bearer ${{ secrets.API_TOKEN }}"
                    """, language="yaml")

    except Exception as e:
        st.error(f"错误: {e}")

elif st.session_state.current_page == "scraper":
    st.markdown("## 🌐 多平台获客")

    try:
        from database import init_supabase, add_lead
        from auth import get_current_user

        if not init_supabase():
            st.error("数据库连接失败")
        else:
            user = get_current_user()
            if not user:
                st.warning("请先登录")
            else:
                # 标签页
                tab1, tab2, tab3, tab4 = st.tabs(["🚀 真实抓取", "🔍 模拟搜索", "📧 邮箱查找", "⚠️ 使用说明"])

                with tab1:
                    st.markdown("### 🚀 后台抓取任务")

                    st.info("💡 提交任务后可以关闭页面,任务会在后台自动运行")

                    # 选择抓取方式
                    scrape_mode = st.radio(
                        "抓取方式",
                        ["后台任务 (推荐)", "实时抓取"],
                        help="后台任务: 提交后在后台运行,不阻塞界面\n实时抓取: 立即执行,需要等待完成"
                    )

                    col1, col2 = st.columns([2, 1])

                    with col1:
                        keywords = st.text_input("搜索关键词", value="美国留学", placeholder="例如: 美国留学、英国研究生", key="real_keywords")

                    with col2:
                        platforms = st.multiselect(
                            "选择平台",
                            ["xiaohongshu", "zhihu", "linkedin"],
                            default=["xiaohongshu"],
                            key="real_platforms",
                            help="LinkedIn需要登录账号"
                        )

                    if scrape_mode == "后台任务 (推荐)":
                        # 后台任务模式
                        if st.button("📤 提交后台任务", use_container_width=True, type="primary", key="submit_task"):
                            if keywords and platforms:
                                try:
                                    from background_scraper import get_background_scraper

                                    scraper = get_background_scraper()
                                    task_id = scraper.submit_task(keywords, platforms, user['id'])

                                    st.success(f"✅ 任务已提交! 任务ID: {task_id}")
                                    st.info("💡 任务将在后台运行,预计3-5分钟完成。请在下方查看任务状态。")

                                except Exception as e:
                                    st.error(f"提交失败: {e}")
                            else:
                                st.warning("请输入关键词并选择平台")

                        # 显示用户的任务列表
                        st.markdown("---")
                        st.markdown("### 📋 我的任务")

                        try:
                            from background_scraper import get_background_scraper

                            scraper = get_background_scraper()
                            tasks = scraper.get_user_tasks(user['id'])

                            if tasks:
                                # 按创建时间倒序
                                tasks.sort(key=lambda x: x['created_at'], reverse=True)

                                for task in tasks[:10]:  # 只显示最近10个
                                    status_emoji = {
                                        'pending': '⏳',
                                        'running': '🔄',
                                        'completed': '✅',
                                        'failed': '❌'
                                    }.get(task['status'], '❓')

                                    with st.expander(f"{status_emoji} {task['keywords']} - {task['status']}"):
                                        col_info, col_action = st.columns([3, 1])

                                        with col_info:
                                            st.markdown(f"**任务ID**: `{task['task_id']}`")
                                            st.markdown(f"**关键词**: {task['keywords']}")
                                            st.markdown(f"**平台**: {', '.join(task['platforms'])}")
                                            st.markdown(f"**状态**: {task['status']}")
                                            st.markdown(f"**进度**: {task['progress']}%")
                                            st.markdown(f"**创建时间**: {task['created_at']}")

                                            if task['status'] == 'completed':
                                                st.markdown(f"**完成时间**: {task['completed_at']}")

                                                # 显示结果统计
                                                total_results = sum(
                                                    len(v) if isinstance(v, list) else 0
                                                    for v in task['results'].get('platforms', {}).values()
                                                )
                                                st.success(f"✅ 共抓取 {total_results} 条数据")

                                            elif task['status'] == 'failed':
                                                st.error(f"错误: {task['error']}")

                                        with col_action:
                                            if task['status'] == 'completed':
                                                if st.button("查看结果", key=f"view_{task['task_id']}", use_container_width=True):
                                                    st.session_state.viewing_task = task['task_id']
                                                    st.rerun()

                                                if st.button("导入线索", key=f"import_{task['task_id']}", use_container_width=True):
                                                    try:
                                                        from real_scraper import MultiPlatformScraper
                                                        from database import add_lead

                                                        scraper_converter = MultiPlatformScraper()
                                                        leads = scraper_converter.convert_to_leads(task['results'])

                                                        success_count = 0
                                                        for lead in leads:
                                                            try:
                                                                lead['user_id'] = user['id']
                                                                add_lead(lead)
                                                                success_count += 1
                                                            except:
                                                                pass

                                                        st.success(f"✅ 已导入 {success_count} 条线索")
                                                    except Exception as e:
                                                        st.error(f"导入失败: {e}")

                                # 查看任务详情
                                if 'viewing_task' in st.session_state:
                                    task_id = st.session_state.viewing_task
                                    task = scraper.get_task(task_id)

                                    if task and task['status'] == 'completed':
                                        st.markdown("---")
                                        st.markdown(f"### 📊 任务结果: {task['keywords']}")

                                        for platform, data in task['results'].get('platforms', {}).items():
                                            if isinstance(data, list) and len(data) > 0:
                                                st.markdown(f"#### {platform.upper()} ({len(data)} 条)")

                                                for idx, item in enumerate(data[:5]):  # 只显示前5条
                                                    with st.expander(f"[{idx+1}] {item.get('title', item.get('name', '未知'))}"):
                                                        st.json(item)

                                        if st.button("关闭", key="close_view"):
                                            del st.session_state.viewing_task
                                            st.rerun()

                            else:
                                st.info("暂无任务")

                        except Exception as e:
                            st.error(f"获取任务列表失败: {e}")

                    else:
                        # 实时抓取模式
                        st.warning("⚠️ 实时抓取需要安装Chrome浏览器: `pip install selenium undetected-chromedriver`")

                        headless = st.checkbox("后台运行", value=True, help="不显示浏览器窗口")

                        if st.button("🚀 开始实时抓取", use_container_width=True, type="primary", key="real_scrape"):
                            if keywords and platforms:
                                try:
                                    from real_scraper import MultiPlatformScraper

                                    with st.spinner("🔍 正在抓取数据,请稍候..."):
                                        scraper = MultiPlatformScraper(headless=headless)
                                    results = scraper.scrape_all(keywords, platforms, limit=10)

                                    # 转换为线索
                                    leads = scraper.convert_to_leads(results)

                                    st.success(f"✅ 抓取完成! 共获取 {len(leads)} 条数据")

                                    # 显示结果
                                    for platform, data in results['platforms'].items():
                                        if not isinstance(data, list) or len(data) == 0:
                                            continue

                                        st.markdown(f"### {platform.upper()} ({len(data)} 条)")

                                        for idx, item in enumerate(data):
                                            with st.expander(f"[{idx+1}] {item.get('title', item.get('name', '未知'))}"):
                                                st.json(item)

                                                if st.button(f"添加为线索", key=f"add_real_{platform}_{idx}", use_container_width=True):
                                                    try:
                                                        lead_data = leads[idx] if idx < len(leads) else {}
                                                        lead_data['user_id'] = user['id']

                                                        lead_id = add_lead(lead_data)
                                                        st.success(f"✅ 已添加到线索库")
                                                    except Exception as e:
                                                        st.error(f"添加失败: {e}")

                            except ImportError:
                                st.error("❌ 缺少依赖,请运行: pip install selenium undetected-chromedriver")
                            except Exception as e:
                                st.error(f"❌ 抓取失败: {e}")
                                st.exception(e)
                        else:
                            st.warning("请输入关键词并选择平台")

                with tab2:
                    st.markdown("### 🤖 AI生成客户数据 (完全免费)")

                    st.success("💡 使用AI生成高质量的模拟客户数据,完全免费,无需任何API!")

                    from ai_lead_generator import AILeadGenerator

                    generator = AILeadGenerator()

                    # 选择生成类型
                    gen_type = st.radio(
                        "生成类型",
                        ["潜在客户", "小红书笔记", "知乎问题"],
                        horizontal=True
                    )

                    col1, col2 = st.columns([2, 1])

                    with col1:
                        if gen_type == "潜在客户":
                            count = st.slider("生成数量", 10, 200, 50)
                        else:
                            keywords = st.text_input("搜索关键词", value="美国留学", placeholder="例如: 美国留学、英国研究生")
                            count = st.slider("生成数量", 5, 50, 20)

                    with col2:
                        st.metric("成本", "¥0", "完全免费")

                    if st.button("🚀 AI生成数据", use_container_width=True, type="primary", key="ai_generate"):
                        with st.spinner("AI正在生成数据..."):
                            if gen_type == "潜在客户":
                                # 生成潜在客户
                                leads = generator.generate_batch(count)

                                st.success(f"✅ 生成了 {len(leads)} 个潜在客户!")

                                # 显示统计
                                col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)

                                with col_stat1:
                                    countries = {}
                                    for lead in leads:
                                        country = lead['target_country']
                                        countries[country] = countries.get(country, 0) + 1
                                    st.metric("热门国家", max(countries, key=countries.get))

                                with col_stat2:
                                    degrees = {}
                                    for lead in leads:
                                        degree = lead['target_degree']
                                        degrees[degree] = degrees.get(degree, 0) + 1
                                    st.metric("热门学历", max(degrees, key=degrees.get))

                                with col_stat3:
                                    high_intent = sum(1 for lead in leads if lead['intent_level'] == 'high')
                                    st.metric("高意向客户", f"{high_intent}个")

                                with col_stat4:
                                    st.metric("平均预算", "50-80万")

                                # 显示前10个
                                st.markdown("---")
                                st.markdown("### 📋 生成的客户数据 (前10个)")

                                for idx, lead in enumerate(leads[:10]):
                                    with st.expander(f"👤 {lead['name']} - {lead['target_country']} {lead['target_degree']}"):
                                        col_info, col_action = st.columns([3, 1])

                                        with col_info:
                                            st.markdown(f"**邮箱**: {lead['email']}")
                                            st.markdown(f"**电话**: {lead['phone']}")
                                            st.markdown(f"**意向**: {lead['target_country']} {lead['target_degree']} {lead['major']}")
                                            st.markdown(f"**预算**: {lead['budget']}")
                                            st.markdown(f"**城市**: {lead['city']}")
                                            st.markdown(f"**来源**: {lead['source']}")
                                            st.markdown(f"**意向等级**: {lead['intent_level']}")
                                            with st.expander("查看咨询记录"):
                                                st.text(lead['notes'])

                                        with col_action:
                                            if st.button("添加", key=f"add_ai_{idx}", use_container_width=True):
                                                try:
                                                    from database import add_lead
                                                    lead['user_id'] = user['id']
                                                    add_lead(lead)
                                                    st.success("✅ 已添加")
                                                except Exception as e:
                                                    st.error(f"添加失败: {e}")

                                # 批量导入
                                st.markdown("---")
                                if st.button(f"📥 批量导入全部 {len(leads)} 个客户", use_container_width=True):
                                    try:
                                        from database import add_lead

                                        progress_bar = st.progress(0)
                                        success_count = 0

                                        for idx, lead in enumerate(leads):
                                            try:
                                                lead['user_id'] = user['id']
                                                add_lead(lead)
                                                success_count += 1
                                            except:
                                                pass

                                            progress_bar.progress((idx + 1) / len(leads))

                                        progress_bar.empty()
                                        st.success(f"✅ 成功导入 {success_count} 个客户!")

                                    except Exception as e:
                                        st.error(f"导入失败: {e}")

                            elif gen_type == "小红书笔记":
                                # 生成小红书数据
                                posts = generator.generate_xiaohongshu_posts(keywords, count)

                                st.success(f"✅ 生成了 {len(posts)} 条小红书笔记!")

                                for idx, post in enumerate(posts):
                                    with st.expander(f"📝 {post['title']}"):
                                        st.markdown(f"**作者**: {post['author']}")
                                        st.markdown(f"**内容**: {post['content']}")
                                        st.markdown(f"**点赞**: {post['likes']} | **评论**: {post['comments']}")
                                        st.markdown(f"**发布时间**: {post['published_at']}")
                                        st.markdown(f"**链接**: {post['url']}")

                            else:  # 知乎问题
                                # 生成知乎数据
                                questions = generator.generate_zhihu_questions(keywords, count)

                                st.success(f"✅ 生成了 {len(questions)} 个知乎问题!")

                                for idx, question in enumerate(questions):
                                    with st.expander(f"❓ {question['title']}"):
                                        st.markdown(f"**提问者**: {question['author']}")
                                        st.markdown(f"**回答数**: {question['answer_count']}")
                                        st.markdown(f"**关注者**: {question['follower_count']}")
                                        st.markdown(f"**创建时间**: {question['created_at']}")
                                        st.markdown(f"**链接**: {question['url']}")

                    # 使用说明
                    st.markdown("---")
                    st.markdown("### 💡 使用说明")

                    st.info("""
                    **AI生成数据的优势**:
                    - ✅ 完全免费,无需任何API
                    - ✅ 数据真实可信,符合留学行业特点
                    - ✅ 可以无限生成,想要多少有多少
                    - ✅ 适合演示、测试、学习使用

                    **数据质量**:
                    - 姓名: 真实的中文姓名
                    - 电话: 真实的手机号格式
                    - 邮箱: 真实的邮箱格式
                    - 意向: 符合留学行业的真实场景
                    - 咨询记录: 真实的客户问题

                    **适用场景**:
                    - 🎯 演示产品功能
                    - 🧪 测试邮件模板
                    - 📊 练习数据分析
                    - 🎓 学习AI获客流程

                    **下一步**:
                    1. 生成100-200个客户数据
                    2. 使用AI生成邮件功能
                    3. 批量发送测试邮件
                    4. 查看数据分析报表
                    5. 熟悉整个获客流程

                    **等有收入后再购买真实数据!**
                    """)

                                # 显示结果
                                st.success(f"搜索完成! 关键词: {keywords}")

                                for platform, data in results['platforms'].items():
                                    if isinstance(data, dict) and 'error' in data:
                                        st.error(f"{platform}: {data['error']}")
                                        continue

                                    st.markdown(f"### {platform.upper()} ({len(data)} 条结果)")

                                    if platform == 'linkedin':
                                        for item in data:
                                            with st.expander(f"👤 {item['name']} - {item['title']}"):
                                                st.markdown(f"**公司**: {item['company']}")
                                                st.markdown(f"**地区**: {item['location']}")
                                                st.markdown(f"**邮箱**: {item.get('email', '未知')}")
                                                st.markdown(f"**链接**: {item['profile_url']}")

                                                if st.button(f"添加为线索", key=f"add_{platform}_{item['name']}", use_container_width=True):
                                                    try:
                                                        lead_id = add_lead({
                                                            'user_id': user['id'],
                                                            'name': item['name'],
                                                            'email': item.get('email', ''),
                                                            'phone': item.get('phone', ''),
                                                            'notes': item.get('notes', ''),
                                                            'status': 'new'
                                                        })
                                                        st.success(f"✅ 已添加: {item['name']}")
                                                    except Exception as e:
                                                        st.error(f"添加失败: {e}")

                                    elif platform == 'xiaohongshu':
                                        for item in data:
                                            with st.expander(f"📝 {item['title']} - {item['author']}"):
                                                st.markdown(f"**内容**: {item['content']}")
                                                st.markdown(f"**点赞**: {item['likes']} | **评论**: {item['comments']}")
                                                st.markdown(f"**链接**: {item['url']}")

                                                if st.button(f"添加为线索", key=f"add_{platform}_{item['author']}", use_container_width=True):
                                                    try:
                                                        lead_id = add_lead({
                                                            'user_id': user['id'],
                                                            'name': item['author'],
                                                            'email': '',
                                                            'phone': '',
                                                            'notes': f"来源: 小红书\n标题: {item['title']}\n内容: {item['content'][:100]}",
                                                            'status': 'new'
                                                        })
                                                        st.success(f"✅ 已添加: {item['author']}")
                                                    except Exception as e:
                                                        st.error(f"添加失败: {e}")

                                    elif platform == 'zhihu':
                                        for item in data:
                                            with st.expander(f"❓ {item['title']} - {item['author']}"):
                                                st.markdown(f"**回答数**: {item['answer_count']} | **关注者**: {item['follower_count']}")
                                                st.markdown(f"**链接**: {item['url']}")

                                                if st.button(f"添加为线索", key=f"add_{platform}_{item['author']}", use_container_width=True):
                                                    try:
                                                        lead_id = add_lead({
                                                            'user_id': user['id'],
                                                            'name': item['author'],
                                                            'email': '',
                                                            'phone': '',
                                                            'notes': f"来源: 知乎\n问题: {item['title']}",
                                                            'status': 'new'
                                                        })
                                                        st.success(f"✅ 已添加: {item['author']}")
                                                    except Exception as e:
                                                        st.error(f"添加失败: {e}")

                                # 批量导入
                                st.markdown("---")
                                st.markdown("### 批量导入")

                                if st.button("📥 批量导入所有结果", use_container_width=True):
                                    leads = aggregator.convert_to_leads(results)

                                    success_count = 0
                                    failed_count = 0

                                    for lead in leads:
                                        try:
                                            lead['user_id'] = user['id']
                                            add_lead(lead)
                                            success_count += 1
                                        except:
                                            failed_count += 1

                                    st.success(f"✅ 成功导入 {success_count} 个线索")
                                    if failed_count > 0:
                                        st.warning(f"⚠️ {failed_count} 个线索导入失败")
                        else:
                            st.warning("请输入关键词并选择平台")

                with tab3:
                    st.markdown("### 📧 邮箱查找")

                    st.info("💡 根据姓名和公司自动查找邮箱地址")

                    from email_finder import EmailFinder

                    # Hunter.io API配置
                    with st.expander("🔑 Hunter.io API配置 (可选)"):
                        hunter_api_key = st.text_input(
                            "Hunter.io API Key",
                            type="password",
                            help="注册地址: https://hunter.io/ (免费版25次/月)"
                        )
                        st.markdown("[获取API Key](https://hunter.io/)")

                    # 单个查找
                    st.markdown("#### 单个查找")

                    col1, col2, col3 = st.columns(3)

                    with col1:
                        first_name = st.text_input("名", placeholder="John", key="email_first")

                    with col2:
                        last_name = st.text_input("姓", placeholder="Doe", key="email_last")

                    with col3:
                        company = st.text_input("公司", placeholder="Google", key="email_company")

                    domain = st.text_input("公司域名 (可选)", placeholder="google.com", key="email_domain")

                    if st.button("🔍 查找邮箱", use_container_width=True, type="primary", key="find_single_email"):
                        if first_name and last_name and company:
                            with st.spinner("正在查找..."):
                                try:
                                    finder = EmailFinder(hunter_api_key if hunter_api_key else None)
                                    result = finder.find_email(first_name, last_name, company, domain if domain else None)

                                    if result['email']:
                                        st.success(f"✅ 找到邮箱: {result['email']}")
                                        st.info(f"置信度: {result['confidence']} | 方法: {result['method']}")

                                        if result['alternatives']:
                                            with st.expander("查看备选邮箱"):
                                                for alt in result['alternatives'][:5]:
                                                    st.text(alt)
                                    else:
                                        st.warning("❌ 未找到邮箱")
                                        if result['alternatives']:
                                            st.info("可能的邮箱格式:")
                                            for alt in result['alternatives'][:5]:
                                                st.text(alt)

                                except Exception as e:
                                    st.error(f"查找失败: {e}")
                        else:
                            st.warning("请填写姓名和公司")

                    # 批量查找
                    st.markdown("---")
                    st.markdown("#### 批量查找")

                    st.info("💡 从线索库中选择需要查找邮箱的线索")

                    from database import get_leads

                    leads = get_leads(user['id'])
                    leads_without_email = [l for l in leads if not l.get('email')]

                    if leads_without_email:
                        st.markdown(f"找到 {len(leads_without_email)} 个没有邮箱的线索")

                        if st.button(f"🚀 批量查找邮箱 ({len(leads_without_email)}个)", use_container_width=True, type="primary", key="batch_find_email"):
                            with st.spinner("正在批量查找..."):
                                try:
                                    finder = EmailFinder(hunter_api_key if hunter_api_key else None)

                                    progress_bar = st.progress(0)
                                    status_text = st.empty()

                                    success_count = 0
                                    failed_count = 0

                                    for idx, lead in enumerate(leads_without_email):
                                        status_text.text(f"正在处理: {lead.get('name', '未知')} ({idx+1}/{len(leads_without_email)})")

                                        # 解析姓名
                                        name = lead.get('name', '')
                                        name_parts = name.split()

                                        if len(name_parts) >= 2:
                                            first = name_parts[0]
                                            last = name_parts[-1]
                                        else:
                                            first = name
                                            last = ''

                                        # 查找邮箱
                                        result = finder.find_email(
                                            first_name=first,
                                            last_name=last,
                                            company=lead.get('company', lead.get('notes', '')),
                                            domain=None
                                        )

                                        if result['email']:
                                            # 更新线索
                                            from database import update_lead
                                            update_lead(lead['id'], {
                                                'email': result['email'],
                                                'notes': lead.get('notes', '') + f"\n\n邮箱查找: {result['method']} (置信度: {result['confidence']})"
                                            })
                                            success_count += 1
                                        else:
                                            failed_count += 1

                                        progress_bar.progress((idx + 1) / len(leads_without_email))

                                    status_text.empty()
                                    progress_bar.empty()

                                    st.success(f"✅ 完成! 成功: {success_count}, 失败: {failed_count}")

                                except Exception as e:
                                    st.error(f"批量查找失败: {e}")
                    else:
                        st.info("所有线索都已有邮箱")

                with tab4:
                    st.markdown("### ⚠️ 使用说明")

                    st.markdown("""
                    ## 🚀 真实抓取 vs 模拟搜索

                    ### 真实抓取
                    - ✅ 使用Selenium自动化浏览器
                    - ✅ 抓取真实的小红书/知乎/LinkedIn数据
                    - ✅ 数据准确,可直接使用
                    - ⚠️ 需要安装Chrome浏览器
                    - ⚠️ 速度较慢(每个平台1-2分钟)
                    - ⚠️ 可能被平台检测(建议适度使用)

                    ### 模拟搜索
                    - ✅ 快速返回结果
                    - ✅ 无需安装依赖
                    - ❌ 返回模拟数据,仅供演示

                    ---

                    ## 📧 邮箱查找

                    ### 方法1: Hunter.io API (推荐)
                    - 注册地址: https://hunter.io/
                    - 免费版: 25次/月
                    - 付费版: $49/月起 (1000次)
                    - 准确率: 95%+

                    ### 方法2: 邮箱格式推测
                    - 根据姓名+公司域名生成可能的邮箱
                    - 常见格式: john.doe@company.com, jdoe@company.com等
                    - 准确率: 30-50%

                    ---

                    ## 🔧 推荐第三方工具

                    ### LinkedIn抓取
                    - **PhantomBuster**: $59/月起, 专业LinkedIn自动化
                    - **Waalaxy**: $49/月起, LinkedIn + 邮件自动化
                    - **LinkedIn Sales Navigator**: $79.99/月, 官方工具

                    ### 小红书抓取
                    - **八爪鱼**: 免费版可用, 可视化爬虫
                    - **后羿采集器**: ¥99/月起, 简单易用
                    - **Apify**: $49/月起, 云端爬虫平台

                    ### 知乎抓取
                    - **八爪鱼**: 同上
                    - **火车采集器**: ¥199/月起, 功能强大

                    ---

                    ## ⚠️ 合规说明

                    ### 法律风险
                    1. **遵守平台服务条款**: 大部分平台禁止自动化抓取
                    2. **尊重用户隐私**: 不要滥用获取的数据
                    3. **适度使用**: 避免过度频繁请求被封号

                    ### 推荐方案
                    1. **内容营销**: 发布优质内容吸引客户
                    2. **付费广告**: 使用平台官方广告系统
                    3. **手动获客**: 主动联系+建立关系
                    4. **第三方服务**: 使用合规的数据服务商

                    ---

                    ## 💡 最佳实践

                    ### LinkedIn
                    1. 优化个人资料,展示专业形象
                    2. 发布留学相关内容
                    3. 加入留学群组,参与讨论
                    4. 主动发送连接请求(每天<20个)
                    5. 发送个性化消息,不要群发

                    ### 小红书
                    1. 发布留学经验分享(图文+视频)
                    2. 回答用户留学问题
                    3. 在评论区提供价值
                    4. 引导私信咨询(不要直接留联系方式)

                    ### 知乎
                    1. 回答留学相关问题(长文+干货)
                    2. 发布专业文章建立个人品牌
                    3. 在回答末尾留下引导语
                    4. 定期更新,保持活跃

                    ---

                    ## 🎯 效果对比

                    | 方法 | 成本 | 效果 | 合规性 | 推荐度 |
                    |------|------|------|--------|--------|
                    | 内容营销 | 低 | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐⭐ |
                    | 付费广告 | 高 | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |
                    | 第三方工具 | 中 | ⭐⭐⭐⭐ | ⚠️ | ⭐⭐⭐ |
                    | 自动化抓取 | 低 | ⭐⭐⭐ | ❌ | ⭐⭐ |
                    | 手动获客 | 低 | ⭐⭐⭐⭐ | ✅ | ⭐⭐⭐⭐ |

                    **结论**: 内容营销 + 手动获客 + 付费广告 = 最佳组合
                    """)

                    from platform_scraper import COMPLIANCE_NOTES
                    st.warning(COMPLIANCE_NOTES)

    except Exception as e:
        st.error(f"错误: {e}")
        st.exception(e)

elif st.session_state.current_page == "analytics":
    st.markdown("## 📊 数据分析")

    try:
        from database import init_supabase, get_stats, get_emails, get_leads
        from auth import get_current_user
        from email_tracking import analyze_email_performance, get_email_engagement_score
        from analytics import (
            calculate_conversion_funnel,
            calculate_roi,
            analyze_time_trends,
            segment_leads,
            compare_email_templates,
            generate_insights,
            export_report
        )
        import plotly.graph_objects as go
        import plotly.express as px

        if not init_supabase():
            st.error("数据库连接失败")
        else:
            user = get_current_user()
            if not user:
                st.warning("请先登录")
            else:
                # 获取数据
                stats = get_stats(user['id'])
                emails = get_emails(user_id=user['id'])
                leads = get_leads(user_id=user['id'])

                # 标签页
                tab1, tab2, tab3, tab4, tab5 = st.tabs(["📊 总览", "🔄 转化漏斗", "💰 ROI分析", "📈 趋势分析", "👥 客户分群"])

                with tab1:
                    st.markdown("### 核心指标")

                    col1, col2, col3, col4 = st.columns(4)

                    with col1:
                        st.metric("学生线索", stats['total_leads'], f"+{stats['total_leads']}")
                    with col2:
                        st.metric("发送邮件", stats['total_emails'], f"+{stats['total_emails']}")
                    with col3:
                        st.metric("打开率", f"{stats['open_rate']:.1f}%", f"+{stats['opened_emails']}")
                    with col4:
                        st.metric("点击率", f"{stats['click_rate']:.1f}%", f"+{stats['clicked_emails']}")

                    st.markdown("---")

                    if emails:
                        # 邮件表现分析
                        performance = analyze_email_performance(emails)

                        col1, col2, col3 = st.columns(3)

                        with col1:
                            st.markdown("### 📈 互动率")
                            st.metric("邮件互动率", f"{performance['engagement_rate']:.1f}%")
                            st.caption("点击数 / 打开数")

                        with col2:
                            st.markdown("### ⏰ 最佳发送时间")
                            if performance['best_time']:
                                st.metric("最佳时间", performance['best_time'])
                                st.caption("打开率最高的时段")
                            else:
                                st.info("数据不足")

                        with col3:
                            st.markdown("### 📊 平均互动")
                            st.metric("平均打开次数", f"{performance['avg_opens']:.1f}")
                            st.metric("平均点击次数", f"{performance['avg_clicks']:.1f}")

                        st.markdown("---")

                        # 数据洞察
                        st.markdown("### 💡 数据洞察")
                        insights = generate_insights(leads, emails)
                        for insight in insights:
                            st.info(insight)

                        st.markdown("---")

                        # 邮件模板对比
                        st.markdown("### 📧 邮件模板效果对比")
                        template_comparison = compare_email_templates(emails)

                        if template_comparison['templates']:
                            import pandas as pd
                            df_templates = pd.DataFrame(template_comparison['templates'])
                            st.dataframe(df_templates, use_container_width=True, hide_index=True)

                            # 可视化
                            fig = go.Figure(data=[
                                go.Bar(name='打开率', x=[t['template'] for t in template_comparison['templates']],
                                       y=[t['open_rate'] for t in template_comparison['templates']]),
                                go.Bar(name='点击率', x=[t['template'] for t in template_comparison['templates']],
                                       y=[t['click_rate'] for t in template_comparison['templates']])
                            ])
                            fig.update_layout(barmode='group', title='各类邮件效果对比')
                            st.plotly_chart(fig, use_container_width=True)

                with tab2:
                    st.markdown("### 🔄 转化漏斗")

                    if leads and emails:
                        funnel = calculate_conversion_funnel(leads, emails)

                        # 显示漏斗图
                        fig = go.Figure(go.Funnel(
                            y=[stage['name'] for stage in funnel['stages']],
                            x=[stage['count'] for stage in funnel['stages']],
                            textinfo="value+percent initial"
                        ))
                        fig.update_layout(title='客户转化漏斗')
                        st.plotly_chart(fig, use_container_width=True)

                        # 显示详细数据
                        st.markdown("### 各阶段详情")
                        for stage in funnel['stages']:
                            col1, col2 = st.columns([3, 1])
                            with col1:
                                st.markdown(f"**{stage['name']}**")
                            with col2:
                                st.metric("", f"{stage['count']} ({stage['rate']:.1f}%)")

                        st.markdown(f"**总体转化率**: {funnel['overall_conversion_rate']:.2f}%")
                    else:
                        st.info("数据不足,请先添加线索和发送邮件")

                with tab3:
                    st.markdown("### 💰 ROI分析")

                    if leads and emails:
                        # ROI配置
                        col1, col2 = st.columns(2)
                        with col1:
                            cost_per_lead = st.number_input("每个线索成本(元)", min_value=0, value=50, step=10)
                        with col2:
                            revenue_per_conversion = st.number_input("每个转化收入(元)", min_value=0, value=10000, step=1000)

                        roi = calculate_roi(leads, emails, cost_per_lead, revenue_per_conversion)

                        # 显示ROI指标
                        col1, col2, col3, col4 = st.columns(4)

                        with col1:
                            st.metric("总成本", f"¥{roi['total_cost']:,.0f}")
                        with col2:
                            st.metric("总收入", f"¥{roi['total_revenue']:,.0f}")
                        with col3:
                            st.metric("净利润", f"¥{roi['net_profit']:,.0f}")
                        with col4:
                            st.metric("ROI", f"{roi['roi']:.1f}%")

                        st.markdown("---")

                        col1, col2 = st.columns(2)

                        with col1:
                            st.metric("转化数", roi['conversions'])
                        with col2:
                            st.metric("单个转化成本", f"¥{roi['cost_per_conversion']:,.0f}")

                        # 成本构成饼图
                        fig = go.Figure(data=[go.Pie(
                            labels=['线索获取成本', '邮件发送成本'],
                            values=[roi['lead_acquisition_cost'], roi['email_cost']]
                        )])
                        fig.update_layout(title='成本构成')
                        st.plotly_chart(fig, use_container_width=True)
                    else:
                        st.info("数据不足,请先添加线索和发送邮件")

                with tab4:
                    st.markdown("### 📈 时间趋势分析")

                    if emails:
                        days = st.selectbox("分析周期", [7, 14, 30, 60, 90], index=2)
                        trends = analyze_time_trends(emails, days)

                        if trends['trends']:
                            import pandas as pd
                            df_trends = pd.DataFrame(trends['trends'])

                            # 发送量趋势
                            fig1 = go.Figure()
                            fig1.add_trace(go.Scatter(x=df_trends['date'], y=df_trends['sent'],
                                                     mode='lines+markers', name='发送'))
                            fig1.add_trace(go.Scatter(x=df_trends['date'], y=df_trends['opened'],
                                                     mode='lines+markers', name='打开'))
                            fig1.add_trace(go.Scatter(x=df_trends['date'], y=df_trends['clicked'],
                                                     mode='lines+markers', name='点击'))
                            fig1.update_layout(title='邮件发送趋势', xaxis_title='日期', yaxis_title='数量')
                            st.plotly_chart(fig1, use_container_width=True)

                            # 转化率趋势
                            fig2 = go.Figure()
                            fig2.add_trace(go.Scatter(x=df_trends['date'], y=df_trends['open_rate'],
                                                     mode='lines+markers', name='打开率'))
                            fig2.add_trace(go.Scatter(x=df_trends['date'], y=df_trends['click_rate'],
                                                     mode='lines+markers', name='点击率'))
                            fig2.update_layout(title='转化率趋势', xaxis_title='日期', yaxis_title='百分比(%)')
                            st.plotly_chart(fig2, use_container_width=True)

                            # 显示数据表
                            st.dataframe(df_trends, use_container_width=True, hide_index=True)
                        else:
                            st.info("该时间段内没有数据")
                    else:
                        st.info("暂无邮件数据")

                with tab5:
                    st.markdown("### 👥 客户分群分析")

                    if leads and emails:
                        segments = segment_leads(leads, emails)

                        # 按互动分群
                        st.markdown("#### 按互动程度分群")

                        col1, col2, col3, col4 = st.columns(4)

                        with col1:
                            st.metric("🔥 高互动", segments['by_engagement']['high']['count'])
                            st.caption("分数 >= 70")
                        with col2:
                            st.metric("📊 中互动", segments['by_engagement']['medium']['count'])
                            st.caption("40 <= 分数 < 70")
                        with col3:
                            st.metric("📉 低互动", segments['by_engagement']['low']['count'])
                            st.caption("分数 < 40")
                        with col4:
                            st.metric("❌ 无互动", segments['by_engagement']['none']['count'])
                            st.caption("未发送邮件")

                        # 饼图
                        fig = go.Figure(data=[go.Pie(
                            labels=['高互动', '中互动', '低互动', '无互动'],
                            values=[
                                segments['by_engagement']['high']['count'],
                                segments['by_engagement']['medium']['count'],
                                segments['by_engagement']['low']['count'],
                                segments['by_engagement']['none']['count']
                            ]
                        )])
                        fig.update_layout(title='客户互动分布')
                        st.plotly_chart(fig, use_container_width=True)

                        st.markdown("---")

                        # 按国家分群
                        st.markdown("#### 按目标国家分群")
                        if segments['by_country']:
                            fig = go.Figure(data=[go.Bar(
                                x=list(segments['by_country'].keys()),
                                y=list(segments['by_country'].values())
                            )])
                            fig.update_layout(title='目标国家分布', xaxis_title='国家', yaxis_title='数量')
                            st.plotly_chart(fig, use_container_width=True)

                        # 按学历分群
                        st.markdown("#### 按目标学历分群")
                        if segments['by_degree']:
                            fig = go.Figure(data=[go.Bar(
                                x=list(segments['by_degree'].keys()),
                                y=list(segments['by_degree'].values())
                            )])
                            fig.update_layout(title='目标学历分布', xaxis_title='学历', yaxis_title='数量')
                            st.plotly_chart(fig, use_container_width=True)

                        st.markdown("---")

                        # 导出报表
                        st.markdown("### 📥 导出数据报表")
                        if st.button("导出Excel报表", use_container_width=True):
                            df_report = export_report(leads, emails)
                            csv = df_report.to_csv(index=False, encoding='utf-8-sig')
                            st.download_button(
                                label="下载CSV文件",
                                data=csv,
                                file_name=f"guestseek_report_{datetime.now().strftime('%Y%m%d')}.csv",
                                mime="text/csv"
                            )
                    else:
                        st.info("数据不足,请先添加线索和发送邮件")

    except Exception as e:
        st.error(f"错误: {e}")
        import traceback
        st.code(traceback.format_exc())
        st.info("💡 添加学生和生成邮件后,这里会显示详细数据")

st.markdown('</div>', unsafe_allow_html=True)
