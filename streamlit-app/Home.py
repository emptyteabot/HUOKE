import streamlit as st

# 页面配置 - 必须是第一个Streamlit命令
st.set_page_config(
    page_title="LeadPulse - AI驱动的B2B获客平台",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 初始化session state
if 'token' not in st.session_state:
    st.session_state.token = None
if 'user' not in st.session_state:
    st.session_state.user = None

# 自定义CSS - 参考高星项目的设计
st.markdown("""
<style>
    /* 主题色 */
    :root {
        --primary-color: #0ea5e9;
        --secondary-color: #6366f1;
        --success-color: #10b981;
        --danger-color: #ef4444;
    }

    /* 隐藏Streamlit默认元素 */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}

    /* 渐变标题 */
    .gradient-text {
        background: linear-gradient(90deg, var(--primary-color) 0%, var(--secondary-color) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 3rem;
        font-weight: 800;
        text-align: center;
        margin: 2rem 0;
    }

    /* 卡片样式 */
    .metric-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border-left: 4px solid var(--primary-color);
        transition: transform 0.2s;
    }

    .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    /* 按钮样式 */
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.3s;
    }

    .stButton>button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }

    /* 侧边栏样式 */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    }

    /* 输入框样式 */
    .stTextInput>div>div>input {
        border-radius: 8px;
    }

    /* 成功/错误消息 */
    .success-message {
        padding: 1rem;
        border-radius: 8px;
        background: #d1fae5;
        color: #065f46;
        border-left: 4px solid var(--success-color);
    }

    .error-message {
        padding: 1rem;
        border-radius: 8px;
        background: #fee2e2;
        color: #991b1b;
        border-left: 4px solid var(--danger-color);
    }
</style>
""", unsafe_allow_html=True)

# 欢迎页面
def show_welcome():
    st.markdown('<h1 class="gradient-text">🚀 LeadPulse</h1>', unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("""
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: #64748b; font-weight: 400;">AI驱动的留学机构获客平台</h3>
            <p style="color: #94a3b8; font-size: 1.1rem; margin-top: 1rem;">
                专为留学机构打造,自动化学生线索获取,10倍提升咨询转化率
            </p>
        </div>
        """, unsafe_allow_html=True)

        # 功能亮点
        st.markdown("---")

        col_a, col_b, col_c = st.columns(3)
        with col_a:
            st.markdown("""
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem;">🎓</div>
                <h4>学生线索管理</h4>
                <p style="color: #64748b;">目标国家、专业、预算全记录</p>
            </div>
            """, unsafe_allow_html=True)

        with col_b:
            st.markdown("""
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem;">🤖</div>
                <h4>AI咨询邮件</h4>
                <p style="color: #64748b;">自动生成个性化留学规划邮件</p>
            </div>
            """, unsafe_allow_html=True)

        with col_c:
            st.markdown("""
            <div style="text-align: center; padding: 1rem;">
                <div style="font-size: 3rem;">📊</div>
                <h4>效果追踪</h4>
                <p style="color: #64748b;">实时查看家长打开/点击率</p>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("---")

        # 登录/注册选项
        tab1, tab2 = st.tabs(["🔐 登录", "✨ 注册"])

        with tab1:
            with st.form("login_form"):
                email = st.text_input("邮箱", placeholder="your@email.com")
                password = st.text_input("密码", type="password", placeholder="••••••••")

                col_login, col_demo = st.columns(2)
                with col_login:
                    submit = st.form_submit_button("登录", type="primary", use_container_width=True)
                with col_demo:
                    demo = st.form_submit_button("演示模式", use_container_width=True)

                if submit:
                    # 这里添加登录逻辑
                    st.success("登录成功!")
                    st.session_state.token = "demo_token"
                    st.session_state.user = {"name": "Demo User", "email": email}
                    st.rerun()

                if demo:
                    st.session_state.token = "demo_token"
                    st.session_state.user = {"name": "演示用户", "email": "demo@leadpulse.ai"}
                    st.rerun()

        with tab2:
            with st.form("register_form"):
                name = st.text_input("姓名", placeholder="张三")
                email = st.text_input("邮箱", placeholder="your@email.com", key="reg_email")
                company = st.text_input("公司名称", placeholder="您的公司")
                password = st.text_input("密码", type="password", placeholder="••••••••", key="reg_password")

                submit = st.form_submit_button("创建账号", type="primary", use_container_width=True)

                if submit:
                    st.success("注册成功!请登录")

# 主应用逻辑
if not st.session_state.token:
    show_welcome()
else:
    # 已登录 - 显示侧边栏导航
    with st.sidebar:
        st.markdown("### 🚀 LeadPulse")
        st.markdown(f"欢迎, **{st.session_state.user.get('name', 'User')}**")
        st.markdown("---")

        # 导航提示
        st.info("👈 使用左侧导航栏切换页面")

        st.markdown("---")

        # 快速统计
        st.markdown("### 📊 快速统计")
        col1, col2 = st.columns(2)
        with col1:
            st.metric("学生线索", "0")
        with col2:
            st.metric("咨询邮件", "0")

        st.markdown("---")

        if st.button("🚪 退出登录", use_container_width=True):
            st.session_state.token = None
            st.session_state.user = None
            st.rerun()

    # 主页内容
    st.title("📊 仪表盘")

    st.info("💡 **提示**: 使用左侧导航栏访问不同功能页面")

    # 统计卡片
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #0ea5e9; margin: 0;">0</h3>
            <p style="color: #64748b; margin: 0.5rem 0 0 0;">学生线索</p>
        </div>
        """, unsafe_allow_html=True)

    with col2:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #10b981; margin: 0;">0</h3>
            <p style="color: #64748b; margin: 0.5rem 0 0 0;">咨询邮件</p>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #f59e0b; margin: 0;">0%</h3>
            <p style="color: #64748b; margin: 0.5rem 0 0 0;">打开率</p>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #8b5cf6; margin: 0;">0%</h3>
            <p style="color: #64748b; margin: 0.5rem 0 0 0;">点击率</p>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # 快速操作
    st.subheader("🚀 快速操作")

    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("➕ 添加学生线索", use_container_width=True, type="primary"):
            st.switch_page("pages/1_👥_潜在客户.py")

    with col2:
        if st.button("🤖 AI生成咨询邮件", use_container_width=True, type="primary"):
            st.switch_page("pages/2_🤖_AI生成.py")

    with col3:
        if st.button("📧 查看邮件", use_container_width=True, type="primary"):
            st.switch_page("pages/3_✉️_邮件历史.py")

    st.markdown("---")

    # 最近活动
    st.subheader("📈 最近活动")
    st.info("暂无活动记录")
