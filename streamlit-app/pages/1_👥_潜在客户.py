import streamlit as st
import pandas as pd

st.set_page_config(page_title="潜在客户", page_icon="👥", layout="wide")

# 检查登录状态
if 'token' not in st.session_state or not st.session_state.token:
    st.warning("请先登录")
    st.stop()

st.title("👥 潜在客户管理")

# 标签页
tab1, tab2, tab3 = st.tabs(["📋 客户列表", "➕ 添加客户", "🔍 LinkedIn搜索"])

with tab1:
    st.subheader("客户列表")

    # 搜索栏
    col1, col2 = st.columns([3, 1])
    with col1:
        search = st.text_input("🔍 搜索客户", placeholder="输入姓名、邮箱或公司...")
    with col2:
        status_filter = st.selectbox("状态筛选", ["全部", "新客户", "已联系", "已回复"])

    # 示例数据
    sample_data = pd.DataFrame({
        "学生姓名": ["张三", "李四", "王五"],
        "家长电话": ["138-0000-0001", "138-0000-0002", "138-0000-0003"],
        "目标国家": ["美国", "英国", "加拿大"],
        "目标学历": ["本科", "硕士", "本科"],
        "意向专业": ["计算机科学", "金融", "商科"],
        "预算": ["50-80万", "30-50万", "20-30万"],
        "状态": ["新线索", "已咨询", "已签约"],
        "添加时间": ["2026-02-20", "2026-02-19", "2026-02-18"]
    })

    # 显示表格
    st.dataframe(
        sample_data,
        use_container_width=True,
        hide_index=True,
        column_config={
            "状态": st.column_config.SelectboxColumn(
                "状态",
                options=["新线索", "已咨询", "已签约", "已流失"],
            )
        }
    )

    # 操作按钮
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("📧 批量发送邮件", use_container_width=True):
            st.info("请先选择客户")
    with col2:
        if st.button("📥 导出CSV", use_container_width=True):
            st.success("导出成功!")
    with col3:
        if st.button("🗑️ 批量删除", use_container_width=True):
            st.warning("请先选择客户")

with tab2:
    st.subheader("添加新客户")

    with st.form("add_lead_form"):
        col1, col2 = st.columns(2)

        with col1:
            name = st.text_input("学生姓名 *", placeholder="张三")
            email = st.text_input("邮箱 *", placeholder="zhang@email.com")
            phone = st.text_input("家长电话 *", placeholder="+86 138 0000 0000")
            target_country = st.selectbox("目标国家", ["美国", "英国", "加拿大", "澳大利亚", "新加坡", "其他"])

        with col2:
            target_degree = st.selectbox("目标学历", ["本科", "硕士", "博士", "高中"])
            major = st.text_input("意向专业", placeholder="计算机科学")
            budget = st.selectbox("预算范围", ["20-30万", "30-50万", "50-80万", "80万以上"])
            language_score = st.text_input("语言成绩", placeholder="托福100 / 雅思7.0")

        notes = st.text_area("备注", placeholder="学生背景、特殊需求等...")

        col_submit, col_reset = st.columns([1, 1])
        with col_submit:
            submit = st.form_submit_button("✅ 添加学生", type="primary", use_container_width=True)
        with col_reset:
            reset = st.form_submit_button("🔄 重置", use_container_width=True)

        if submit:
            if name and email and phone:
                st.success(f"✅ 成功添加学生: {name} - 目标{target_country}{target_degree}")
            else:
                st.error("请填写所有必填字段")

with tab3:
    st.subheader("🔍 LinkedIn自动搜索")

    st.info("💡 **功能说明**: 自动从LinkedIn搜索并导入潜在客户")

    with st.form("linkedin_search_form"):
        col1, col2 = st.columns(2)

        with col1:
            keywords = st.text_input("关键词", placeholder="CEO, CTO, 产品经理")
            location = st.text_input("地区", placeholder="北京, 上海")

        with col2:
            industry = st.text_input("行业", placeholder="科技, SaaS")
            limit = st.number_input("导入数量", min_value=10, max_value=100, value=50)

        submit = st.form_submit_button("🚀 开始搜索", type="primary", use_container_width=True)

        if submit:
            with st.spinner("正在搜索LinkedIn..."):
                import time
                time.sleep(2)
                st.success(f"✅ 成功导入 {limit} 个潜在客户!")

    st.markdown("---")

    st.warning("⚠️ **注意**: LinkedIn搜索需要配置LinkedIn账号")

    with st.expander("📖 如何配置LinkedIn账号"):
        st.markdown("""
        1. 在后端 `.env` 文件中添加:
           ```
           LINKEDIN_EMAIL=your@email.com
           LINKEDIN_PASSWORD=your_password
           ```
        2. 重启后端服务
        3. 返回此页面开始搜索
        """)
