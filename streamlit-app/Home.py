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
col1, col2, col3 = st.columns(3)

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

                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.button("📋 复制", use_container_width=True)
                    with col_b:
                        st.button("📧 发送", use_container_width=True)

    except Exception as e:
        st.error(f"错误: {e}")

elif st.session_state.current_page == "analytics":
    st.markdown("## 📊 数据分析")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("学生线索", "0", "+0")
    with col2:
        st.metric("生成邮件", "0", "+0")
    with col3:
        st.metric("打开率", "0%", "+0%")
    with col4:
        st.metric("转化率", "0%", "+0%")

    st.info("💡 添加学生和生成邮件后,这里会显示详细数据")

st.markdown('</div>', unsafe_allow_html=True)
