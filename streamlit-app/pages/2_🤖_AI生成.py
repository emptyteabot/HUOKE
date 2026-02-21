import streamlit as st
import time

st.set_page_config(page_title="AI生成", page_icon="🤖", layout="wide")

# 检查登录状态
if 'token' not in st.session_state or not st.session_state.token:
    st.warning("请先登录")
    st.stop()

st.title("🤖 AI邮件生成")

st.markdown("""
<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1.5rem; border-radius: 12px; color: white; margin-bottom: 2rem;">
    <h3 style="margin: 0;">✨ GPT-4驱动的个性化邮件生成</h3>
    <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">
        只需3步,AI为您生成专业的销售邮件
    </p>
</div>
""", unsafe_allow_html=True)

# 两列布局
col1, col2 = st.columns([1, 1])

with col1:
    st.subheader("📝 邮件参数")

    # 步骤1: 选择客户
    with st.expander("**步骤 1️⃣: 选择学生**", expanded=True):
        lead_options = [
            "张三 - 美国本科 (计算机科学)",
            "李四 - 英国硕士 (金融)",
            "王五 - 加拿大本科 (商科)"
        ]
        selected_lead = st.selectbox(
            "选择学生",
            lead_options,
            help="从您的学生线索列表中选择"
        )

    # 步骤2: 产品信息
    with st.expander("**步骤 2️⃣: 选择邮件模板**", expanded=True):
        email_template = st.selectbox(
            "邮件类型",
            [
                "首次咨询邮件",
                "留学规划建议",
                "院校推荐邮件",
                "申请时间线提醒",
                "成功案例分享",
                "优惠活动通知"
            ],
            help="选择适合当前沟通阶段的邮件类型"
        )

        institution_name = st.text_input(
            "机构名称",
            value="XX留学",
            help="您的留学机构名称"
        )

        consultant_name = st.text_input(
            "顾问姓名",
            value="李老师",
            help="发件人姓名"
        )

        key_points = st.text_area(
            "核心卖点",
            value="• 300+成功案例\n• TOP30院校录取率85%\n• 一对一专业规划\n• 全程跟踪服务",
            height=100,
            help="您的机构核心优势"
        )

    # 步骤3: 邮件风格
    with st.expander("**步骤 3️⃣: 选择邮件风格**", expanded=True):
        col_a, col_b = st.columns(2)

        with col_a:
            tone = st.selectbox(
                "语气风格",
                ["专业正式", "友好亲切", "简洁直接"],
                help="选择适合您目标客户的语气"
            )

        with col_b:
            length = st.selectbox(
                "邮件长度",
                ["简短 (100字)", "中等 (200字)", "详细 (300字)"],
                help="更短的邮件通常有更高的阅读率"
            )

        include_cta = st.checkbox("包含行动号召 (CTA)", value=True)
        include_ps = st.checkbox("添加附言 (P.S.)", value=False)

    st.markdown("---")

    # 生成按钮
    if st.button("✨ 生成邮件", type="primary", use_container_width=True):
        st.session_state.generating = True
        st.session_state.generated_email = None

with col2:
    st.subheader("📧 生成结果")

    if 'generating' in st.session_state and st.session_state.generating:
        with st.spinner("🤖 AI正在生成个性化邮件..."):
            # 模拟AI生成过程
            progress_bar = st.progress(0)
            for i in range(100):
                time.sleep(0.02)
                progress_bar.progress(i + 1)

            # 模拟生成的邮件
            st.session_state.generated_email = {
                "subject": f"关于{selected_lead.split(' - ')[0]}的{selected_lead.split(' - ')[1]}申请规划",
                "body": f"""尊敬的家长您好,

我是{institution_name}的留学顾问{consultant_name}。了解到您的孩子{selected_lead.split(' - ')[0]}有意向申请{selected_lead.split(' - ')[1]},我们团队在该方向有丰富的申请经验。

根据您提供的信息:
• 目标: {selected_lead.split(' - ')[1]}
• 专业意向: {selected_lead.split('(')[1].strip(')')}

我们的优势:
{key_points}

我们已经帮助众多学生成功申请到梦校,包括哈佛、斯坦福、MIT等顶尖院校。

如果您有兴趣,我可以为您安排一次免费的30分钟咨询,详细分析孩子的背景和申请策略。

您可以通过以下方式联系我:
• 电话: 400-XXX-XXXX
• 微信: {consultant_name}

期待您的回复!

此致
{consultant_name}
{institution_name}

P.S. 我们目前正在进行限时优惠活动,前20名咨询的家长可享受免费背景评估服务。"""
            }

            st.session_state.generating = False
            st.rerun()

    if 'generated_email' in st.session_state and st.session_state.generated_email:
        email = st.session_state.generated_email

        # 主题
        st.markdown("**📌 邮件主题**")
        subject_edit = st.text_input(
            "主题",
            value=email['subject'],
            label_visibility="collapsed"
        )

        st.markdown("<br>", unsafe_allow_html=True)

        # 正文
        st.markdown("**📝 邮件正文**")
        body_edit = st.text_area(
            "正文",
            value=email['body'],
            height=400,
            label_visibility="collapsed"
        )

        st.markdown("<br>", unsafe_allow_html=True)

        # 操作按钮
        col_a, col_b, col_c = st.columns(3)

        with col_a:
            if st.button("📋 复制", use_container_width=True):
                st.success("✅ 已复制到剪贴板!")

        with col_b:
            if st.button("🔄 重新生成", use_container_width=True):
                st.session_state.generating = True
                st.rerun()

        with col_c:
            if st.button("📧 发送", type="primary", use_container_width=True):
                with st.spinner("发送中..."):
                    time.sleep(1)
                    st.success("✅ 邮件已发送!")
                    st.balloons()

        st.markdown("---")

        # 邮件分析
        with st.expander("📊 AI分析建议"):
            col_x, col_y = st.columns(2)

            with col_x:
                st.metric("预估打开率", "45%", "+12%")
                st.metric("预估回复率", "8%", "+3%")

            with col_y:
                st.markdown("**✅ 优点**")
                st.markdown("- 个性化称呼\n- 清晰的价值主张\n- 明确的CTA")

                st.markdown("**💡 建议**")
                st.markdown("- 可以添加社会证明\n- 考虑缩短第一段")

    else:
        st.info("👈 填写左侧表单并点击「生成邮件」")

        # 显示示例
        with st.expander("💡 查看示例邮件"):
            st.markdown("""
            **主题**: 关于LeadPulse如何帮助科技公司提升获客效率

            **正文**:
            ```
            您好 张三,

            我是LeadPulse的产品经理。注意到贵公司在B2B获客方面的出色表现...

            期待您的回复!

            此致
            LeadPulse团队
            ```
            """)

# 底部提示
st.markdown("---")

col_tip1, col_tip2, col_tip3 = st.columns(3)

with col_tip1:
    st.info("💡 **提示**: 更个性化的邮件有更高的回复率")

with col_tip2:
    st.info("⚡ **快速**: AI生成只需3-5秒")

with col_tip3:
    st.info("🎯 **精准**: 基于客户信息定制内容")
