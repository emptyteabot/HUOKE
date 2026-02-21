import streamlit as st
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict
import os

# 导入配置
try:
    from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
except ImportError:
    # 如果没有config.py,使用环境变量
    JWT_SECRET = os.getenv("JWT_SECRET", "guestseek-super-secret-key-2024")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

# JWT配置
SECRET_KEY = JWT_SECRET
ALGORITHM = JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = JWT_EXPIRE_MINUTES

# 密码加密
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """加密密码"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict]:
    """解码JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def init_session_state():
    """初始化session state"""
    if 'user' not in st.session_state:
        st.session_state.user = None
    if 'token' not in st.session_state:
        st.session_state.token = None

def is_authenticated() -> bool:
    """检查是否已登录"""
    return st.session_state.get('user') is not None

def get_current_user() -> Optional[Dict]:
    """获取当前用户"""
    return st.session_state.get('user')

def login_user(user_data: Dict, token: str):
    """登录用户"""
    st.session_state.user = user_data
    st.session_state.token = token

def logout_user():
    """登出用户"""
    st.session_state.user = None
    st.session_state.token = None

def require_auth():
    """需要认证的装饰器"""
    if not is_authenticated():
        st.warning("⚠️ 请先登录")
        st.stop()

def show_login_page():
    """显示登录页面"""
    st.markdown("""
    <div style="max-width: 400px; margin: 4rem auto; padding: 2rem;
                background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h2 style="text-align: center; margin-bottom: 2rem;">🔐 登录 GuestSeek</h2>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        with st.form("login_form"):
            email = st.text_input("邮箱", placeholder="your@email.com")
            password = st.text_input("密码", type="password", placeholder="••••••••")

            col_login, col_register = st.columns(2)

            with col_login:
                login_btn = st.form_submit_button("登录", use_container_width=True, type="primary")

            with col_register:
                register_btn = st.form_submit_button("注册", use_container_width=True)

            if login_btn:
                if email and password:
                    try:
                        from database import init_supabase, get_user_by_email

                        # 初始化数据库
                        if not init_supabase():
                            st.error("数据库连接失败,请检查配置")
                            return

                        # 查找用户
                        user = get_user_by_email(email)

                        if user and verify_password(password, user['password_hash']):
                            # 创建token
                            token = create_access_token({"sub": user['id'], "email": user['email']})

                            # 登录
                            login_user({
                                'id': user['id'],
                                'email': user['email'],
                                'name': user['name'],
                                'company': user['company']
                            }, token)

                            st.success("✅ 登录成功!")
                            st.rerun()
                        else:
                            st.error("❌ 邮箱或密码错误")
                    except Exception as e:
                        st.error(f"登录失败: {e}")
                else:
                    st.error("请填写邮箱和密码")

            if register_btn:
                st.session_state.show_register = True
                st.rerun()

def show_register_page():
    """显示注册页面"""
    st.markdown("""
    <div style="max-width: 400px; margin: 4rem auto; padding: 2rem;
                background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h2 style="text-align: center; margin-bottom: 2rem;">✨ 注册 GuestSeek</h2>
    </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])

    with col2:
        with st.form("register_form"):
            name = st.text_input("姓名", placeholder="张三")
            company = st.text_input("公司名称", placeholder="XX留学")
            email = st.text_input("邮箱", placeholder="your@email.com")
            password = st.text_input("密码", type="password", placeholder="至少8位")
            password_confirm = st.text_input("确认密码", type="password", placeholder="再次输入密码")

            col_register, col_back = st.columns(2)

            with col_register:
                register_btn = st.form_submit_button("注册", use_container_width=True, type="primary")

            with col_back:
                back_btn = st.form_submit_button("返回登录", use_container_width=True)

            if register_btn:
                if not all([name, company, email, password, password_confirm]):
                    st.error("请填写所有字段")
                elif password != password_confirm:
                    st.error("两次密码不一致")
                elif len(password) < 8:
                    st.error("密码至少8位")
                else:
                    try:
                        from database import init_supabase, create_user, get_user_by_email

                        # 初始化数据库
                        if not init_supabase():
                            st.error("数据库连接失败,请检查配置")
                            return

                        # 检查邮箱是否已存在
                        existing_user = get_user_by_email(email)
                        if existing_user:
                            st.error("该邮箱已注册")
                            return

                        # 创建用户
                        user_id = create_user({
                            'name': name,
                            'company': company,
                            'email': email,
                            'password_hash': get_password_hash(password)
                        })

                        st.success("✅ 注册成功!请登录")
                        st.session_state.show_register = False
                        st.rerun()

                    except Exception as e:
                        st.error(f"注册失败: {e}")

            if back_btn:
                st.session_state.show_register = False
                st.rerun()
