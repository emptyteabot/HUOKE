import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import random

st.set_page_config(page_title="邮件历史", page_icon="✉️", layout="wide")

# 检查登录状态
if 'token' not in st.session_state or not st.session_state.token:
    st.warning("请先登录")
    st.stop()

st.title("✉️ 邮件历史")

# 统计卡片
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.metric("总发送", "156", "+12")

with col2:
    st.metric("打开率", "42.3%", "+5.2%")

with col3:
    st.metric("点击率", "8.7%", "+1.3%")

with col4:
    st.metric("回复率", "3.2%", "+0.8%")

st.markdown("---")

# 筛选器
col_filter1, col_filter2, col_filter3 = st.columns(3)

with col_filter1:
    status_filter = st.selectbox(
        "状态筛选",
        ["全部", "已发送", "已打开", "已点击", "已回复"]
    )

with col_filter2:
    date_range = st.selectbox(
        "时间范围",
        ["最近7天", "最近30天", "最近90天", "全部"]
    )

with col_filter3:
    search = st.text_input("🔍 搜索", placeholder="搜索主题或收件人...")

st.markdown("<br>", unsafe_allow_html=True)

# 生成示例数据
def generate_sample_emails():
    names = ["张三", "李四", "王五", "赵六", "钱七"]
    companies = ["科技公司", "创业公司", "技术公司", "互联网公司", "软件公司"]
    statuses = ["已发送", "已打开", "已点击", "已回复"]

    emails = []
    for i in range(10):
        date = datetime.now() - timedelta(days=random.randint(0, 30))
        emails.append({
            "主题": f"关于LeadPulse如何帮助{random.choice(companies)}提升效率",
            "收件人": random.choice(names),
            "公司": random.choice(companies),
            "状态": random.choice(statuses),
            "发送时间": date.strftime("%Y-%m-%d %H:%M"),
            "打开次数": random.randint(0, 5),
            "点击次数": random.randint(0, 3)
        })

    return pd.DataFrame(emails)

# 显示邮件列表
emails_df = generate_sample_emails()

# 使用expander显示每封邮件
for idx, row in emails_df.iterrows():
    with st.expander(f"📧 {row['主题']} - **{row['状态']}**"):
        col_info, col_stats = st.columns([2, 1])

        with col_info:
            st.markdown(f"""
            **收件人**: {row['收件人']}
            **公司**: {row['公司']}
            **发送时间**: {row['发送时间']}
            """)

            # 状态标签
            status_color = {
                "已发送": "🔵",
                "已打开": "🟢",
                "已点击": "🟣",
                "已回复": "🟡"
            }
            st.markdown(f"{status_color.get(row['状态'], '⚪')} **状态**: {row['状态']}")

        with col_stats:
            st.metric("打开次数", row['打开次数'])
            st.metric("点击次数", row['点击次数'])

        # 操作按钮
        col_btn1, col_btn2, col_btn3, col_btn4 = st.columns(4)

        with col_btn1:
            if st.button("📄 查看详情", key=f"view_{idx}"):
                st.info("邮件详情...")

        with col_btn2:
            if st.button("🔄 重新发送", key=f"resend_{idx}"):
                st.success("已重新发送!")

        with col_btn3:
            if st.button("📊 查看追踪", key=f"track_{idx}"):
                st.info("追踪数据...")

        with col_btn4:
            if st.button("🗑️ 删除", key=f"delete_{idx}"):
                st.warning("确认删除?")

st.markdown("---")

# 批量操作
st.subheader("📦 批量操作")

col_bulk1, col_bulk2, col_bulk3 = st.columns(3)

with col_bulk1:
    if st.button("📥 导出CSV", use_container_width=True):
        st.success("✅ 导出成功!")

with col_bulk2:
    if st.button("📧 批量重发", use_container_width=True):
        st.info("请先选择邮件")

with col_bulk3:
    if st.button("🗑️ 批量删除", use_container_width=True):
        st.warning("请先选择邮件")

st.markdown("---")

# 邮件效果分析
st.subheader("📊 邮件效果分析")

tab1, tab2, tab3 = st.tabs(["📈 趋势图", "🎯 转化漏斗", "🏆 最佳实践"])

with tab1:
    st.line_chart({
        "发送": [20, 25, 30, 28, 35, 40, 45],
        "打开": [8, 10, 13, 12, 15, 17, 19],
        "点击": [2, 3, 4, 3, 4, 5, 6]
    })

with tab2:
    col_funnel1, col_funnel2, col_funnel3, col_funnel4 = st.columns(4)

    with col_funnel1:
        st.metric("发送", "156", "100%")

    with col_funnel2:
        st.metric("打开", "66", "42.3%")

    with col_funnel3:
        st.metric("点击", "14", "8.7%")

    with col_funnel4:
        st.metric("回复", "5", "3.2%")

with tab3:
    st.markdown("""
    ### 🏆 表现最好的邮件

    **主题**: "3个方法帮助您提升获客效率"
    - 打开率: 68%
    - 点击率: 15%
    - 回复率: 8%

    **成功要素**:
    - ✅ 数字化标题吸引注意
    - ✅ 简洁明了的价值主张
    - ✅ 清晰的行动号召
    - ✅ 个性化称呼

    ### 💡 优化建议

    1. **最佳发送时间**: 周二/周三上午10-11点
    2. **主题长度**: 30-50个字符效果最好
    3. **邮件长度**: 150-200字最佳
    4. **跟进策略**: 3天后自动跟进未打开的邮件
    """)
