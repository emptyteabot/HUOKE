from __future__ import annotations

import hashlib
import re
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlencode

from pydantic import BaseModel, ConfigDict, Field
import requests

from .config import settings


StrictModelConfig = ConfigDict(extra="forbid", str_strip_whitespace=True, populate_by_name=True)

_DB_LOCK = threading.RLock()
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class CreditPackage(BaseModel):
    model_config = StrictModelConfig

    package_id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    price_cny: Decimal = Field(ge=0)
    credits: int = Field(ge=0)
    bonus_credits: int = Field(ge=0)
    description: str = Field(min_length=1, max_length=500)
    requires_payment: bool = True


class WalletRecord(BaseModel):
    model_config = StrictModelConfig

    user_id: str = Field(min_length=1, max_length=80)
    credits: int = Field(ge=0)
    free_trial_credits_total: int = Field(ge=0)
    free_trial_credits_granted: bool
    created_at: str
    updated_at: str


class BillingOrderRequest(BaseModel):
    model_config = StrictModelConfig

    user_id: str = Field(min_length=1, max_length=80)
    package_id: str = Field(min_length=1, max_length=80)
    contact_email: str = Field(default="", max_length=254)
    contact_company: str = Field(default="", max_length=160)
    note: str = Field(default="", max_length=500)


class BillingOrderRecord(BaseModel):
    model_config = StrictModelConfig

    order_id: str = Field(min_length=1, max_length=80)
    user_id: str = Field(min_length=1, max_length=80)
    package_id: str = Field(min_length=1, max_length=80)
    package_name: str = Field(min_length=1, max_length=120)
    price_cny: Decimal = Field(ge=0)
    credits: int = Field(ge=0)
    status: Literal["pending", "paid", "failed"] = "pending"
    alipay_trade_no: str = Field(default="", max_length=120)
    pay_url: str = Field(default="", max_length=2000)
    contact_email: str = Field(default="", max_length=254)
    contact_company: str = Field(default="", max_length=160)
    note: str = Field(default="", max_length=500)
    created_at: str
    updated_at: str
    paid_at: str = Field(default="", max_length=40)


class WalletChargeRequest(BaseModel):
    model_config = StrictModelConfig

    user_id: str = Field(min_length=1, max_length=80)
    event_type: Literal["noise", "high_value", "refund"] = "noise"
    reference_id: str = Field(default="", max_length=120)
    detail: str = Field(default="", max_length=500)
    credits: int | None = Field(default=None, ge=0)


class WalletChargeResult(BaseModel):
    model_config = StrictModelConfig

    ok: bool
    wallet: WalletRecord
    delta: int
    event_type: str
    reference_id: str
    balance_after: int
    reason: str


class XunhuNotifyPayload(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True, populate_by_name=True)

    appid: str | None = None
    trade_order_id: str | None = None
    transaction_id: str | None = None
    total_fee: str | None = None
    status: str | None = None
    hash: str | None = None
    open_order_id: str | None = None
    time: str | None = None
    nonce_str: str | None = None


PACKAGE_DEFINITIONS = (
    {
        "package_id": "trial",
        "name": "免费体验包",
        "price_cny": Decimal("0"),
        "credits": settings.free_trial_credits,
        "bonus_credits": settings.free_trial_credits,
        "description": "新账户默认赠送，先跑通一次过滤、扣费和发货闭环。",
        "requires_payment": False,
    },
    {
        "package_id": "icebreaker",
        "name": "破冰包",
        "price_cny": Decimal("99"),
        "credits": 100,
        "bonus_credits": 1,
        "description": "适合先做一轮验证，测试提取、过滤和回收到帐。",
        "requires_payment": True,
    },
    {
        "package_id": "standard",
        "name": "标准包",
        "price_cny": Decimal("499"),
        "credits": 550,
        "bonus_credits": 51,
        "description": "适合独立销售和微型团队，带一点积分赠送。",
        "requires_payment": True,
    },
    {
        "package_id": "enterprise",
        "name": "企业包",
        "price_cny": Decimal("1999"),
        "credits": 2500,
        "bonus_credits": 501,
        "description": "适合高频调用和稳定线索回收。",
        "requires_payment": True,
    },
)

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_user_id(value: str) -> str:
    raw = str(value or "").strip().lower()
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in raw)[:80]
    return safe or "guest_demo"


def _is_valid_email(value: str) -> bool:
    return bool(_EMAIL_RE.match(str(value or "").strip().lower()))


def _decimal(value: str | float | int | Decimal) -> Decimal:
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise ValueError(f"Invalid decimal value: {value}")


def _db_path() -> Path:
    path = Path(settings.billing_store_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path(), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS wallets (
            user_id TEXT PRIMARY KEY,
            credits INTEGER NOT NULL,
            free_trial_credits_total INTEGER NOT NULL,
            free_trial_credits_granted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            package_id TEXT NOT NULL,
            package_name TEXT NOT NULL,
            price_cny TEXT NOT NULL,
            credits INTEGER NOT NULL,
            status TEXT NOT NULL,
            alipay_trade_no TEXT NOT NULL DEFAULT '',
            pay_url TEXT NOT NULL DEFAULT '',
            contact_email TEXT NOT NULL DEFAULT '',
            contact_company TEXT NOT NULL DEFAULT '',
            note TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            paid_at TEXT NOT NULL DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            delta INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            reference_id TEXT NOT NULL,
            detail TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_trade_no ON orders(alipay_trade_no) WHERE alipay_trade_no <> '';
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_reference ON ledger(user_id, event_type, reference_id);
        """
    )


def _package_def(package_id: str) -> dict[str, Any]:
    normalized = str(package_id or "").strip().lower()
    for package in PACKAGE_DEFINITIONS:
        if package["package_id"] == normalized:
            return dict(package)
    raise KeyError(f"Unknown package: {package_id}")


def list_credit_packages() -> list[CreditPackage]:
    return [CreditPackage(**package) for package in PACKAGE_DEFINITIONS]


def _wallet_row_to_model(row: sqlite3.Row) -> WalletRecord:
    return WalletRecord(
        user_id=str(row["user_id"]),
        credits=int(row["credits"]),
        free_trial_credits_total=int(row["free_trial_credits_total"]),
        free_trial_credits_granted=bool(row["free_trial_credits_granted"]),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
    )


def _order_row_to_model(row: sqlite3.Row) -> BillingOrderRecord:
    return BillingOrderRecord(
        order_id=str(row["order_id"]),
        user_id=str(row["user_id"]),
        package_id=str(row["package_id"]),
        package_name=str(row["package_name"]),
        price_cny=_decimal(row["price_cny"]),
        credits=int(row["credits"]),
        status=str(row["status"]),
        alipay_trade_no=str(row["alipay_trade_no"]),
        pay_url=str(row["pay_url"]),
        contact_email=str(row["contact_email"]),
        contact_company=str(row["contact_company"]),
        note=str(row["note"]),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
        paid_at=str(row["paid_at"]),
    )


def _upsert_trial_wallet(conn: sqlite3.Connection, user_id: str) -> WalletRecord:
    normalized = _normalize_user_id(user_id)
    now = _now_iso()
    row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (normalized,)).fetchone()
    if row is None:
        conn.execute(
            """
            INSERT INTO wallets (user_id, credits, free_trial_credits_total, free_trial_credits_granted, created_at, updated_at)
            VALUES (?, ?, ?, 1, ?, ?)
            """,
            (normalized, settings.free_trial_credits, settings.free_trial_credits, now, now),
        )
        conn.execute(
            """
            INSERT INTO ledger (user_id, event_type, delta, balance_after, reference_id, detail, created_at)
            VALUES (?, 'trial_grant', ?, ?, ?, ?, ?)
            """,
            (
                normalized,
                settings.free_trial_credits,
                settings.free_trial_credits,
                f"trial:{normalized}",
                "Initial free trial credits granted.",
                now,
            ),
        )
        return WalletRecord(
            user_id=normalized,
            credits=settings.free_trial_credits,
            free_trial_credits_total=settings.free_trial_credits,
            free_trial_credits_granted=True,
            created_at=now,
            updated_at=now,
        )

    if int(row["free_trial_credits_granted"]) == 0:
        credits = int(row["credits"]) + settings.free_trial_credits
        conn.execute(
            """
            UPDATE wallets
            SET credits = ?, free_trial_credits_total = ?, free_trial_credits_granted = 1, updated_at = ?
            WHERE user_id = ?
            """,
            (credits, settings.free_trial_credits, now, normalized),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO ledger (user_id, event_type, delta, balance_after, reference_id, detail, created_at)
            VALUES (?, 'trial_grant', ?, ?, ?, ?, ?)
            """,
            (
                normalized,
                settings.free_trial_credits,
                credits,
                f"trial:{normalized}",
                "Initial free trial credits granted.",
                now,
            ),
        )
        row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (normalized,)).fetchone()

    assert row is not None
    return _wallet_row_to_model(row)


def get_wallet(user_id: str) -> WalletRecord:
    with _DB_LOCK:
        conn = _connect()
        try:
            _ensure_schema(conn)
            conn.execute("BEGIN IMMEDIATE")
            wallet = _upsert_trial_wallet(conn, user_id)
            conn.commit()
            return wallet
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def _set_wallet_credits(conn: sqlite3.Connection, wallet: WalletRecord, next_credits: int) -> WalletRecord:
    now = _now_iso()
    normalized = _normalize_user_id(wallet.user_id)
    conn.execute(
        "UPDATE wallets SET credits = ?, updated_at = ? WHERE user_id = ?",
        (next_credits, now, normalized),
    )
    row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (normalized,)).fetchone()
    if row is None:
        raise RuntimeError("wallet update failed")
    return _wallet_row_to_model(row)


def _append_ledger(
    conn: sqlite3.Connection,
    user_id: str,
    event_type: str,
    delta: int,
    balance_after: int,
    reference_id: str,
    detail: str,
) -> None:
    conn.execute(
        """
        INSERT INTO ledger (user_id, event_type, delta, balance_after, reference_id, detail, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            _normalize_user_id(user_id),
            event_type,
            delta,
            balance_after,
            reference_id,
            detail,
            _now_iso(),
        ),
    )


def create_recharge_order(request: BillingOrderRequest) -> dict[str, Any]:
    package = _package_def(request.package_id)
    if package["price_cny"] <= 0:
        raise ValueError("trial package does not require payment")
    if not _is_valid_email(request.contact_email):
        raise ValueError("valid_contact_email_required")

    with _DB_LOCK:
        conn = _connect()
        try:
            _ensure_schema(conn)
            conn.execute("BEGIN IMMEDIATE")
            wallet = _upsert_trial_wallet(conn, request.user_id)

            order_id = f"lp_order_{uuid.uuid4().hex[:18]}"
            order = BillingOrderRecord(
                order_id=order_id,
                user_id=wallet.user_id,
                package_id=package["package_id"],
                package_name=package["name"],
                price_cny=package["price_cny"],
                credits=package["credits"],
                status="pending",
                alipay_trade_no="",
                pay_url="",
                contact_email=request.contact_email,
                contact_company=request.contact_company,
                note=request.note,
                created_at=_now_iso(),
                updated_at=_now_iso(),
                paid_at="",
            )

            pay_url = build_xunhu_pay_url(order)
            order = order.model_copy(update={"pay_url": pay_url})
            conn.execute(
                """
                INSERT INTO orders (
                    order_id, user_id, package_id, package_name, price_cny, credits, status,
                    alipay_trade_no, pay_url, contact_email, contact_company, note, created_at, updated_at, paid_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    order.order_id,
                    order.user_id,
                    order.package_id,
                    order.package_name,
                    str(order.price_cny),
                    order.credits,
                    order.status,
                    order.alipay_trade_no,
                    order.pay_url,
                    order.contact_email,
                    order.contact_company,
                    order.note,
                    order.created_at,
                    order.updated_at,
                    order.paid_at,
                ),
            )
            conn.commit()
            return {"order": order.model_dump(mode="json", by_alias=True), "wallet": wallet.model_dump(mode="json", by_alias=True)}
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def get_order(order_id: str) -> BillingOrderRecord | None:
    with _DB_LOCK:
        conn = _connect()
        try:
            _ensure_schema(conn)
            row = conn.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,)).fetchone()
            if row is None:
                return None
            return _order_row_to_model(row)
        finally:
            conn.close()


def list_orders(user_id: str | None = None, limit: int = 50) -> list[BillingOrderRecord]:
    with _DB_LOCK:
        conn = _connect()
        try:
            _ensure_schema(conn)
            if user_id:
                rows = conn.execute(
                    "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, order_id DESC LIMIT ?",
                    (_normalize_user_id(user_id), max(1, limit)),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM orders ORDER BY created_at DESC, order_id DESC LIMIT ?",
                    (max(1, limit),),
                ).fetchall()
            return [_order_row_to_model(row) for row in rows]
        finally:
            conn.close()


def xunhu_sign(params: dict[str, Any], secret: str) -> str:
    keys = sorted(key for key, value in params.items() if key != "hash" and value not in (None, ""))
    content = "&".join(f"{key}={params[key]}" for key in keys)
    return hashlib.md5(f"{content}{secret}".encode("utf-8")).hexdigest()


def verify_xunhu_signature(params: dict[str, str]) -> bool:
    received = str(params.get("hash") or "").strip().lower()
    secret = str(settings.xunhu_app_secret or "").strip()
    if not received or not secret:
        return False
    calculated = xunhu_sign(params, secret)
    return calculated == received


def _extract_xunhu_pay_url(payload: dict[str, Any]) -> str:
    candidates = [
        payload.get("url"),
        payload.get("pay_url"),
        payload.get("payment_url"),
        payload.get("mweb_url"),
        payload.get("qrcode"),
        payload.get("qr_code"),
        payload.get("code_url"),
    ]
    nested = payload.get("data")
    if isinstance(nested, dict):
        candidates.extend(
            [
                nested.get("url"),
                nested.get("pay_url"),
                nested.get("payment_url"),
                nested.get("mweb_url"),
                nested.get("qrcode"),
                nested.get("qr_code"),
                nested.get("code_url"),
            ]
        )
    for candidate in candidates:
        value = str(candidate or "").strip()
        if value:
            return value
    return ""


def build_xunhu_pay_url(order: BillingOrderRecord) -> str:
    if not settings.xunhu_app_id or not settings.xunhu_app_secret:
        return ""

    params = {
        "version": "1.1",
        "appid": settings.xunhu_app_id,
        "trade_order_id": order.order_id,
        "total_fee": f"{order.price_cny:.2f}",
        "title": settings.xunhu_order_title,
        "time": str(int(time.time())),
        "notify_url": settings.xunhu_notify_url,
        "return_url": settings.xunhu_return_url,
        "nonce_str": uuid.uuid4().hex,
    }
    params["hash"] = xunhu_sign(params, settings.xunhu_app_secret)
    try:
        response = requests.post(settings.xunhu_gateway_url, data=params, timeout=12)
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        print("LeadPulse Xunhu pay_url failed:", exc)
        return ""
    pay_url = _extract_xunhu_pay_url(payload)
    if pay_url:
        return pay_url

    if str(payload.get("errcode") or payload.get("code") or "").strip() not in {"", "0", "200"}:
        print("LeadPulse Xunhu pay_url response missing URL:", payload)
        return ""

    return f"{settings.xunhu_gateway_url}?{urlencode(params)}"


def _payload_fields(payload: dict[str, Any]) -> dict[str, str]:
    return {str(key): str(value) for key, value in payload.items() if value is not None}


def _mark_order_paid(order_id: str, provider_trade_no: str, amount: Decimal, provider: str) -> dict[str, Any]:
    if not order_id:
        return {"ok": False, "reason": "missing_order_id"}

    with _DB_LOCK:
        conn = _connect()
        try:
            _ensure_schema(conn)
            conn.execute("BEGIN IMMEDIATE")
            row = conn.execute("SELECT * FROM orders WHERE order_id = ?", (order_id,)).fetchone()
            if row is None:
                conn.rollback()
                return {"ok": False, "reason": "order_not_found"}

            order = _order_row_to_model(row)

            expected_amount = _decimal(order.price_cny)
            if amount != expected_amount:
                conn.rollback()
                return {"ok": False, "reason": "amount_mismatch", "expected": str(expected_amount), "received": str(amount)}

            if order.status == "paid":
                wallet_row = conn.execute("SELECT * FROM wallets WHERE user_id = ?", (order.user_id,)).fetchone()
                wallet = _wallet_row_to_model(wallet_row) if wallet_row is not None else _upsert_trial_wallet(conn, order.user_id)
                conn.commit()
                return {
                    "ok": True,
                    "already_paid": True,
                    "wallet": wallet.model_dump(mode="json", by_alias=True),
                    "order_id": order.order_id,
                }

            wallet = _upsert_trial_wallet(conn, order.user_id)
            next_credits = wallet.credits + order.credits
            wallet = _set_wallet_credits(conn, wallet, next_credits)
            _append_ledger(
                conn,
                order.user_id,
                "recharge",
                order.credits,
                next_credits,
                order.order_id,
                f"{provider} recharge transaction_id={provider_trade_no}",
            )
            conn.execute(
                """
                UPDATE orders
                SET status = 'paid', alipay_trade_no = ?, updated_at = ?, paid_at = ?
                WHERE order_id = ?
                """,
                (provider_trade_no, _now_iso(), _now_iso(), order.order_id),
            )
            conn.commit()
            return {
                "ok": True,
                "already_paid": False,
                "wallet": wallet.model_dump(mode="json", by_alias=True),
                "order_id": order.order_id,
                "credits_added": order.credits,
            }
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def handle_xunhu_notify(payload: dict[str, str]) -> dict[str, Any]:
    fields = _payload_fields(payload)
    if not verify_xunhu_signature(fields):
        return {"ok": False, "reason": "invalid_signature"}

    notify = XunhuNotifyPayload.model_validate(fields)
    if settings.xunhu_app_id and str(notify.appid or "").strip() != settings.xunhu_app_id:
        return {"ok": False, "reason": "appid_mismatch"}
    if str(notify.status or "").strip() != "OD":
        return {"ok": False, "reason": "trade_not_success"}

    order_id = str(notify.trade_order_id or "").strip()
    trade_no = str(notify.transaction_id or notify.open_order_id or "").strip()
    amount = _decimal(notify.total_fee or "0")
    return _mark_order_paid(order_id, trade_no, amount, "Xunhupay")


def handle_alipay_notify(payload: dict[str, str]) -> dict[str, Any]:
    # Kept as a compatibility alias because old deployed notify URLs used
    # /api/v1/alipay/notify. The handler now accepts Xunhupay callbacks only.
    return handle_xunhu_notify(payload)


def charge_wallet(request: WalletChargeRequest) -> WalletChargeResult:
    user_id = _normalize_user_id(request.user_id)
    if request.credits is not None:
        delta = int(request.credits)
    elif request.event_type == "high_value":
        delta = settings.high_value_charge_credits
    elif request.event_type == "refund":
        delta = settings.refund_credits
    else:
        delta = settings.noise_charge_credits

    if request.event_type == "refund":
        delta = abs(delta)
    else:
        delta = max(1, abs(delta))

    with _DB_LOCK:
        conn = _connect()
        try:
            _ensure_schema(conn)
            conn.execute("BEGIN IMMEDIATE")
            wallet = _upsert_trial_wallet(conn, user_id)

            if request.event_type == "refund":
                reference_id = request.reference_id or f"refund:{uuid.uuid4().hex[:12]}"
                next_credits = wallet.credits + delta
                wallet = _set_wallet_credits(conn, wallet, next_credits)
                _append_ledger(
                    conn,
                    user_id,
                    "refund",
                    delta,
                    next_credits,
                    reference_id,
                    request.detail or "Refunded failed high-value extraction.",
                )
                conn.commit()
                return WalletChargeResult(
                    ok=True,
                    wallet=wallet,
                    delta=delta,
                    event_type=request.event_type,
                    reference_id=reference_id,
                    balance_after=wallet.credits,
                    reason="refund_applied",
                )

            if wallet.credits < delta:
                conn.rollback()
                raise ValueError("insufficient_credits")

            reference_id = request.reference_id or f"{request.event_type}:{uuid.uuid4().hex[:12]}"
            next_credits = wallet.credits - delta
            wallet = _set_wallet_credits(conn, wallet, next_credits)
            _append_ledger(
                conn,
                user_id,
                request.event_type,
                -delta,
                next_credits,
                reference_id,
                request.detail or "Billing charge applied.",
            )
            conn.commit()
            return WalletChargeResult(
                ok=True,
                wallet=wallet,
                delta=-delta,
                event_type=request.event_type,
                reference_id=reference_id,
                balance_after=wallet.credits,
                reason="charge_applied",
            )
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def wallet_summary(user_id: str) -> dict[str, Any]:
    wallet = get_wallet(user_id)
    return {
        "wallet": wallet.model_dump(mode="json", by_alias=True),
        "packages": [package.model_dump(mode="json", by_alias=True) for package in list_credit_packages()],
        "free_trial_credits": settings.free_trial_credits,
        "noise_charge_credits": settings.noise_charge_credits,
        "high_value_charge_credits": settings.high_value_charge_credits,
        "refund_credits": settings.refund_credits,
    }

