import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional

import streamlit as st
from jose import JWTError, jwt

try:
    from config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
except Exception:
    JWT_SECRET = os.getenv("JWT_SECRET", "guestseek-super-secret-key-2024")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRE_MINUTES = 60 * 24 * 7


SECRET_KEY = JWT_SECRET
ALGORITHM = JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = JWT_EXPIRE_MINUTES

_PBKDF2_PREFIX = "pbkdf2_sha256_v1"
_PBKDF2_ITERATIONS = 260000

# Optional legacy verifier: allows old passlib hashes if runtime supports it.
try:
    from passlib.context import CryptContext

    _legacy_ctx = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
except Exception:  # pragma: no cover
    _legacy_ctx = None


def _hash_with_pbkdf2(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        _PBKDF2_ITERATIONS,
    )
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"{_PBKDF2_PREFIX}${_PBKDF2_ITERATIONS}${salt}${digest_b64}"


def _verify_pbkdf2(plain_password: str, hashed_password: str) -> bool:
    try:
        prefix, iter_str, salt, digest_b64 = hashed_password.split("$", 3)
        if prefix != _PBKDF2_PREFIX:
            return False
        iterations = int(iter_str)
        expected = base64.b64decode(digest_b64.encode("ascii"))
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False

    if hashed_password.startswith(f"{_PBKDF2_PREFIX}$"):
        return _verify_pbkdf2(plain_password, hashed_password)

    if _legacy_ctx is not None:
        try:
            return _legacy_ctx.verify(plain_password, hashed_password)
        except Exception:
            return False

    return False


def get_password_hash(password: str) -> str:
    return _hash_with_pbkdf2(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def init_session_state() -> None:
    if "user" not in st.session_state:
        st.session_state.user = None
    if "token" not in st.session_state:
        st.session_state.token = None


def is_authenticated() -> bool:
    return st.session_state.get("user") is not None


def get_current_user() -> Optional[Dict]:
    return st.session_state.get("user")


def login_user(user_data: Dict, token: str) -> None:
    st.session_state.user = user_data
    st.session_state.token = token


def logout_user() -> None:
    st.session_state.user = None
    st.session_state.token = None


def require_auth() -> None:
    if not is_authenticated():
        st.warning("Please login first.")
        st.stop()


# Backward-compatible stubs (unused by current Home.py)
def show_login_page() -> None:
    st.info("Use the main Home page login form.")


def show_register_page() -> None:
    st.info("Use the main Home page register form.")
