import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

st.set_page_config(page_title="数据分析", page_icon="📊", layout="wide")

# 检查登录状态
if 'token' not in st.session_state or not st.session_state.token:
    st.warning("请先登录")
    st.stop()

st.title("📊 数据分析Dashboard")

# 模拟数据
def generate_mock_data():
    dates = pd.date_range(end=datetime.now(), periods=30, freq='D')

    # 邮件发送数据
    emails_sent = pd.DataFrame({
        'date': dates,
        'sent': [10, 15, 12, 20, 18, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50, 48, 55, 52, 60, 58, 65, 62, 70, 68, 75, 72, 80, 78, 85],
        'opened': [4, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16, 15, 18, 17, 20, 19, 22, 21, 24, 23, 26, 25, 28, 27, 30, 29, 32, 31, 34],
        'clicked': [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16]
    })

    # 线索来源数据
    lead_sources = pd.DataFrame({
        'source': ['LinkedIn', '小红书', '知乎', '抖音', '手动添加'],
        'count': [120, 85, 65, 45, 30],
        'conversion_rate': [15, 12, 10, 8, 20]
    })

    # 线索状态分布
    lead_status = pd.DataFrame({
        'status': ['新线索', '已联系', '高意向', '已转化', '已流失'],
        'count': [80, 120, 60, 40, 45]
    })

    # 目标国家分布
    target_countries = pd.DataFrame({
        'country': ['美国', '英国', '加拿大', '澳大利亚', '新加坡', '其他'],
        'count': [150, 90, 60, 45, 30, 20]
    })

    return emails_sent, lead_sources, lead_status, target_countries

emails_sent, lead_sources, lead_status, target_countries = generate_mock_data()

# 顶部KPI卡片
st.markdown("### 📈 核心指标")

col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    st.metric(
        label="总线索数",
        value="345",
        delta="+23 本周"
    )

with col2:
    st.metric(
        label="邮件发送",
        value="1,250",
        delta="+85 本周"
    )

with col3:
    open_rate = 40.2
    st.metric(
        label="打开率",
        value=f"{open_rate}%",
        delta="+2.3%"
    )

with col4:
    click_rate = 12.5
    st.metric(
        label="点击率",
        value=f"{click_rate}%",
        delta="+1.8%"
    )

with col5:
    conversion_rate = 11.6
    st.metric(
        label="转化率",
        value=f"{conversion_rate}%",
        delta="+0.9%"
    )

st.markdown("---")

# 第一行: 邮件趋势 + 转化漏斗
col1, col2 = st.columns([2, 1])

with col1:
    st.markdown("### 📧 邮件发送趋势")

    fig_emails = go.Figure()

    fig_emails.add_trace(go.Scatter(
        x=emails_sent['date'],
        y=emails_sent['sent'],
        name='发送',
        mode='lines+markers',
        line=dict(color='#0ea5e9', width=3),
        fill='tonexty'
    ))

    fig_emails.add_trace(go.Scatter(
        x=emails_sent['date'],
        y=emails_sent['opened'],
        name='打开',
        mode='lines+markers',
        line=dict(color='#10b981', width=3)
    ))

    fig_emails.add_trace(go.Scatter(
        x=emails_sent['date'],
        y=emails_sent['clicked'],
        name='点击',
        mode='lines+markers',
        line=dict(color='#f59e0b', width=3)
    ))

    fig_emails.update_layout(
        height=350,
        hovermode='x unified',
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=30, b=0)
    )

    st.plotly_chart(fig_emails, use_container_width=True)

with col2:
    st.markdown("### 🎯 转化漏斗")

    funnel_data = pd.DataFrame({
        'stage': ['线索总数', '已联系', '高意向', '已转化'],
        'count': [345, 280, 120, 40],
        'color': ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6']
    })

    fig_funnel = go.Figure(go.Funnel(
        y=funnel_data['stage'],
        x=funnel_data['count'],
        textposition="inside",
        textinfo="value+percent initial",
        marker=dict(color=funnel_data['color'])
    ))

    fig_funnel.update_layout(
        height=350,
        margin=dict(l=0, r=0, t=0, b=0)
    )

    st.plotly_chart(fig_funnel, use_container_width=True)

st.markdown("---")

# 第二行: 线索来源 + 线索状态
col1, col2 = st.columns(2)

with col1:
    st.markdown("### 📍 线索来源分析")

    fig_sources = px.bar(
        lead_sources,
        x='source',
        y='count',
        color='conversion_rate',
        color_continuous_scale='Blues',
        text='count',
        labels={'count': '线索数量', 'source': '来源', 'conversion_rate': '转化率(%)'}
    )

    fig_sources.update_traces(textposition='outside')
    fig_sources.update_layout(
        height=350,
        showlegend=False,
        margin=dict(l=0, r=0, t=30, b=0)
    )

    st.plotly_chart(fig_sources, use_container_width=True)

    # 来源详情表格
    with st.expander("📋 查看详细数据"):
        st.dataframe(
            lead_sources.style.background_gradient(cmap='Blues', subset=['count', 'conversion_rate']),
            use_container_width=True
        )

with col2:
    st.markdown("### 📊 线索状态分布")

    fig_status = px.pie(
        lead_status,
        values='count',
        names='status',
        color_discrete_sequence=['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
        hole=0.4
    )

    fig_status.update_traces(textposition='inside', textinfo='percent+label')
    fig_status.update_layout(
        height=350,
        showlegend=True,
        legend=dict(orientation="v", yanchor="middle", y=0.5, xanchor="left", x=1),
        margin=dict(l=0, r=0, t=30, b=0)
    )

    st.plotly_chart(fig_status, use_container_width=True)

st.markdown("---")

# 第三行: 目标国家 + ROI计算
col1, col2 = st.columns([2, 1])

with col1:
    st.markdown("### 🌍 目标国家分布")

    fig_countries = px.bar(
        target_countries,
        x='country',
        y='count',
        color='count',
        color_continuous_scale='Viridis',
        text='count'
    )

    fig_countries.update_traces(textposition='outside')
    fig_countries.update_layout(
        height=350,
        showlegend=False,
        margin=dict(l=0, r=0, t=30, b=0)
    )

    st.plotly_chart(fig_countries, use_container_width=True)

with col2:
    st.markdown("### 💰 ROI计算器")

    st.markdown("""
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 1.5rem; border-radius: 12px; color: white;">
        <h4 style="margin: 0 0 1rem 0;">投资回报率</h4>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # 输入
    monthly_cost = st.number_input("月度成本 (¥)", value=9999, step=1000)
    avg_deal_value = st.number_input("平均客单价 (¥)", value=50000, step=5000)
    conversions = st.number_input("月转化数", value=8, step=1)

    # 计算
    monthly_revenue = avg_deal_value * conversions
    roi = ((monthly_revenue - monthly_cost) / monthly_cost) * 100 if monthly_cost > 0 else 0

    st.markdown("<br>", unsafe_allow_html=True)

    col_a, col_b = st.columns(2)
    with col_a:
        st.metric("月收入", f"¥{monthly_revenue:,.0f}")
    with col_b:
        st.metric("ROI", f"{roi:.1f}%", delta=f"+{roi-300:.1f}%")

    if roi > 300:
        st.success("🎉 ROI表现优秀!")
    elif roi > 100:
        st.info("👍 ROI表现良好")
    else:
        st.warning("⚠️ 需要优化转化率")

st.markdown("---")

# 第四行: 热力图 + 最佳发送时间
col1, col2 = st.columns(2)

with col1:
    st.markdown("### 🔥 邮件打开热力图")

    # 生成热力图数据
    hours = list(range(24))
    days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    import numpy as np
    heatmap_data = np.random.randint(5, 50, size=(7, 24))

    fig_heatmap = go.Figure(data=go.Heatmap(
        z=heatmap_data,
        x=hours,
        y=days,
        colorscale='Blues',
        text=heatmap_data,
        texttemplate='%{text}',
        textfont={"size": 10},
        colorbar=dict(title="打开次数")
    ))

    fig_heatmap.update_layout(
        height=350,
        xaxis_title="小时",
        yaxis_title="星期",
        margin=dict(l=0, r=0, t=30, b=0)
    )

    st.plotly_chart(fig_heatmap, use_container_width=True)

with col2:
    st.markdown("### ⏰ 最佳发送时间建议")

    st.markdown("""
    <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <h4 style="color: #0369a1; margin: 0 0 1rem 0;">📊 数据洞察</h4>
        <ul style="color: #0c4a6e; line-height: 1.8;">
            <li><strong>最佳发送日:</strong> 周二、周三</li>
            <li><strong>最佳时段:</strong> 上午 9-11点</li>
            <li><strong>次佳时段:</strong> 下午 2-4点</li>
            <li><strong>避免时段:</strong> 周末、晚上8点后</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("""
    <div style="background: #f0fdf4; padding: 1.5rem; border-radius: 12px; border-left: 4px solid #10b981;">
        <h4 style="color: #065f46; margin: 0 0 1rem 0;">💡 优化建议</h4>
        <ul style="color: #064e3b; line-height: 1.8;">
            <li>周二上午10点发送打开率最高(45%)</li>
            <li>避免周一早上和周五下午</li>
            <li>A/B测试不同时段效果</li>
            <li>根据目标客户时区调整</li>
        </ul>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

# 底部: 导出功能
st.markdown("### 📥 数据导出")

col1, col2, col3, col4 = st.columns(4)

with col1:
    if st.button("📊 导出邮件数据", use_container_width=True):
        csv = emails_sent.to_csv(index=False).encode('utf-8-sig')
        st.download_button(
            label="下载 CSV",
            data=csv,
            file_name=f"emails_data_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )

with col2:
    if st.button("📍 导出线索来源", use_container_width=True):
        csv = lead_sources.to_csv(index=False).encode('utf-8-sig')
        st.download_button(
            label="下载 CSV",
            data=csv,
            file_name=f"lead_sources_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )

with col3:
    if st.button("📊 导出状态分布", use_container_width=True):
        csv = lead_status.to_csv(index=False).encode('utf-8-sig')
        st.download_button(
            label="下载 CSV",
            data=csv,
            file_name=f"lead_status_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )

with col4:
    if st.button("🌍 导出国家分布", use_container_width=True):
        csv = target_countries.to_csv(index=False).encode('utf-8-sig')
        st.download_button(
            label="下载 CSV",
            data=csv,
            file_name=f"countries_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )
