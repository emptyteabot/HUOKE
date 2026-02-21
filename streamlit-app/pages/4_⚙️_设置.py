import streamlit as st

st.set_page_config(page_title="设置", page_icon="⚙️", layout="wide")

# 检查登录状态
if 'token' not in st.session_state or not st.session_state.token:
    st.warning("请先登录")
    st.stop()

st.title("⚙️ 设置")

tab1, tab2, tab3, tab4 = st.tabs(["👤 个人信息", "🔑 API配置", "📧 邮件设置", "💳 订阅管理"])

with tab1:
    st.subheader("个人信息")

    with st.form("profile_form"):
        col1, col2 = st.columns(2)

        with col1:
            name = st.text_input("姓名", value="演示用户")
            email = st.text_input("邮箱", value="demo@leadpulse.ai", disabled=True)
            company = st.text_input("公司", value="LeadPulse")

        with col2:
            phone = st.text_input("电话", value="+86 138 0000 0000")
            position = st.text_input("职位", value="产品经理")
            location = st.text_input("地区", value="北京")

        if st.form_submit_button("💾 保存", type="primary"):
            st.success("✅ 保存成功!")

    st.markdown("---")

    st.subheader("修改密码")

    with st.form("password_form"):
        old_password = st.text_input("当前密码", type="password")
        new_password = st.text_input("新密码", type="password")
        confirm_password = st.text_input("确认新密码", type="password")

        if st.form_submit_button("🔒 修改密码", type="primary"):
            if new_password == confirm_password:
                st.success("✅ 密码修改成功!")
            else:
                st.error("❌ 两次输入的密码不一致")

with tab2:
    st.subheader("API配置")

    st.info("💡 配置您的API密钥以使用各项功能")

    with st.form("api_form"):
        openai_key = st.text_input(
            "OpenAI API Key",
            type="password",
            help="用于AI邮件生成"
        )

        sendgrid_key = st.text_input(
            "SendGrid API Key",
            type="password",
            help="用于邮件发送"
        )

        linkedin_email = st.text_input(
            "LinkedIn 邮箱",
            help="用于LinkedIn自动搜索"
        )

        linkedin_password = st.text_input(
            "LinkedIn 密码",
            type="password",
            help="用于LinkedIn自动搜索"
        )

        if st.form_submit_button("💾 保存API配置", type="primary"):
            st.success("✅ API配置已保存!")

    st.markdown("---")

    with st.expander("📖 如何获取API密钥"):
        st.markdown("""
        ### OpenAI API Key
        1. 访问 https://platform.openai.com/api-keys
        2. 点击 "Create new secret key"
        3. 复制密钥并粘贴到上方

        ### SendGrid API Key
        1. 访问 https://app.sendgrid.com/settings/api_keys
        2. 点击 "Create API Key"
        3. 选择 "Full Access"
        4. 复制密钥并粘贴到上方

        ### LinkedIn账号
        使用您的LinkedIn登录邮箱和密码
        """)

with tab3:
    st.subheader("邮件设置")

    with st.form("email_settings_form"):
        from_name = st.text_input("发件人姓名", value="LeadPulse团队")
        from_email = st.text_input("发件人邮箱", value="noreply@leadpulse.ai")
        reply_to = st.text_input("回复邮箱", value="support@leadpulse.ai")

        st.markdown("---")

        st.markdown("**邮件签名**")
        signature = st.text_area(
            "签名",
            value="""此致
LeadPulse团队

---
LeadPulse - AI驱动的B2B获客平台
https://leadpulse.ai""",
            height=150
        )

        st.markdown("---")

        st.markdown("**发送设置**")

        col1, col2 = st.columns(2)

        with col1:
            batch_size = st.number_input("批量发送数量", min_value=1, max_value=100, value=50)
            delay = st.number_input("发送间隔(秒)", min_value=1, max_value=60, value=2)

        with col2:
            auto_followup = st.checkbox("自动跟进", value=True)
            followup_days = st.number_input("跟进间隔(天)", min_value=1, max_value=30, value=3)

        if st.form_submit_button("💾 保存邮件设置", type="primary"):
            st.success("✅ 邮件设置已保存!")

with tab4:
    st.subheader("订阅管理")

    # 当前套餐
    st.markdown("""
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 2rem; border-radius: 12px; color: white; margin-bottom: 2rem;">
        <h3 style="margin: 0;">🎉 当前套餐: 免费试用</h3>
        <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">
            试用期剩余: 14天
        </p>
    </div>
    """, unsafe_allow_html=True)

    # 套餐选择
    st.markdown("### 💎 升级套餐")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("""
        <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.5rem;">
            <h4>Starter</h4>
            <h2 style="color: #0ea5e9;">$99<span style="font-size: 1rem;">/月</span></h2>
            <ul style="color: #64748b;">
                <li>500个潜在客户</li>
                <li>1000封邮件/月</li>
                <li>AI邮件生成</li>
                <li>邮件追踪</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

        if st.button("选择 Starter", use_container_width=True):
            st.info("即将跳转到支付页面...")

    with col2:
        st.markdown("""
        <div style="border: 2px solid #0ea5e9; border-radius: 12px; padding: 1.5rem;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);">
            <div style="background: #0ea5e9; color: white; padding: 0.25rem 0.75rem;
                        border-radius: 999px; display: inline-block; font-size: 0.875rem;">
                推荐
            </div>
            <h4>Growth</h4>
            <h2 style="color: #0ea5e9;">$299<span style="font-size: 1rem;">/月</span></h2>
            <ul style="color: #64748b;">
                <li>2000个潜在客户</li>
                <li>5000封邮件/月</li>
                <li>LinkedIn搜索</li>
                <li>优先支持</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

        if st.button("选择 Growth", type="primary", use_container_width=True):
            st.info("即将跳转到支付页面...")

    with col3:
        st.markdown("""
        <div style="border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.5rem;">
            <h4>Enterprise</h4>
            <h2 style="color: #0ea5e9;">$999<span style="font-size: 1rem;">/月</span></h2>
            <ul style="color: #64748b;">
                <li>无限潜在客户</li>
                <li>无限邮件</li>
                <li>专属客户经理</li>
                <li>定制开发</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)

        if st.button("选择 Enterprise", use_container_width=True):
            st.info("即将跳转到支付页面...")

    st.markdown("---")

    # 账单历史
    st.subheader("📄 账单历史")

    st.info("暂无账单记录")
