import streamlit as st

try:
    st.query_params["demo"] = "1"
except Exception:
    pass

st.switch_page("Home.py")
