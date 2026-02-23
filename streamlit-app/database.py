import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from threading import RLock
from typing import Dict, List, Optional

try:
    from supabase import Client, create_client
except Exception:  # pragma: no cover
    Client = object  # type: ignore
    create_client = None

try:
    from config import SUPABASE_KEY, SUPABASE_URL
except Exception:  # pragma: no cover
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")


supabase: Optional[Client] = None
_backend = "local"
_lock = RLock()

_LOCAL_DB_PATH = Path(__file__).resolve().parents[1] / "data" / "local_db.json"


def _now() -> str:
    return datetime.now().isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


def _ensure_local_db() -> None:
    _LOCAL_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not _LOCAL_DB_PATH.exists():
        _LOCAL_DB_PATH.write_text(
            json.dumps({"users": [], "leads": [], "emails": []}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


def _load_local_db() -> Dict:
    _ensure_local_db()
    try:
        return json.loads(_LOCAL_DB_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"users": [], "leads": [], "emails": []}


def _save_local_db(db: Dict) -> None:
    _ensure_local_db()
    _LOCAL_DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2), encoding="utf-8")


def _using_supabase() -> bool:
    return _backend == "supabase" and supabase is not None


def init_supabase() -> bool:
    """Initialize DB backend. Returns True in both supabase/local mode."""
    global supabase, _backend

    if SUPABASE_URL and SUPABASE_KEY and create_client is not None:
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            _backend = "supabase"
            return True
        except Exception as e:
            print(f"Supabase init failed, fallback to local: {e}")

    supabase = None
    _backend = "local"
    _ensure_local_db()
    return True


# ==================== Leads ====================

def add_lead(lead_data: Dict) -> str:
    lead = dict(lead_data)
    lead.setdefault("id", _new_id())
    lead.setdefault("created_at", _now())
    lead["updated_at"] = _now()

    if _using_supabase():
        result = supabase.table("leads").insert(lead).execute()
        return result.data[0]["id"]

    with _lock:
        db = _load_local_db()
        db.setdefault("leads", []).append(lead)
        _save_local_db(db)
    return lead["id"]


def get_leads(user_id: Optional[str] = None) -> List[Dict]:
    if _using_supabase():
        query = supabase.table("leads").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.order("created_at", desc=True).execute()
        return result.data or []

    with _lock:
        db = _load_local_db()
        leads = db.get("leads", [])

    if user_id:
        leads = [x for x in leads if str(x.get("user_id", "")) == str(user_id)]

    return sorted(leads, key=lambda x: x.get("created_at", ""), reverse=True)


def get_lead_by_id(lead_id: str) -> Optional[Dict]:
    if _using_supabase():
        result = supabase.table("leads").select("*").eq("id", lead_id).execute()
        return result.data[0] if result.data else None

    with _lock:
        for lead in _load_local_db().get("leads", []):
            if str(lead.get("id")) == str(lead_id):
                return lead
    return None


def update_lead(lead_id: str, updates: Dict) -> bool:
    payload = dict(updates)
    payload["updated_at"] = _now()

    if _using_supabase():
        supabase.table("leads").update(payload).eq("id", lead_id).execute()
        return True

    with _lock:
        db = _load_local_db()
        for lead in db.get("leads", []):
            if str(lead.get("id")) == str(lead_id):
                lead.update(payload)
                _save_local_db(db)
                return True
    return False


def delete_lead(lead_id: str) -> bool:
    if _using_supabase():
        supabase.table("leads").delete().eq("id", lead_id).execute()
        return True

    with _lock:
        db = _load_local_db()
        leads = db.get("leads", [])
        remain = [x for x in leads if str(x.get("id")) != str(lead_id)]
        if len(remain) == len(leads):
            return False
        db["leads"] = remain
        _save_local_db(db)
    return True


# ==================== Emails ====================

def save_email(email_data: Dict) -> str:
    payload = dict(email_data)
    payload.setdefault("id", _new_id())
    payload.setdefault("created_at", _now())
    payload.setdefault("status", payload.get("status", "draft"))

    if _using_supabase():
        result = supabase.table("emails").insert(payload).execute()
        return result.data[0]["id"]

    with _lock:
        db = _load_local_db()
        db.setdefault("emails", []).append(payload)
        _save_local_db(db)
    return payload["id"]


def save_sent_email(email_data: Dict, message_id: str) -> str:
    payload = dict(email_data)
    payload["message_id"] = message_id
    payload["sent_at"] = _now()
    payload["status"] = "sent"
    return save_email(payload)


def get_emails(user_id: Optional[str] = None, lead_id: Optional[str] = None) -> List[Dict]:
    if _using_supabase():
        query = supabase.table("emails").select("*, leads(*)")
        if user_id:
            query = query.eq("user_id", user_id)
        if lead_id:
            query = query.eq("lead_id", lead_id)
        result = query.order("created_at", desc=True).execute()
        return result.data or []

    with _lock:
        db = _load_local_db()
        emails = db.get("emails", [])
        leads = {x.get("id"): x for x in db.get("leads", [])}

    if user_id:
        emails = [x for x in emails if str(x.get("user_id", "")) == str(user_id)]
    if lead_id:
        emails = [x for x in emails if str(x.get("lead_id", "")) == str(lead_id)]

    out = []
    for e in emails:
        row = dict(e)
        row["leads"] = leads.get(e.get("lead_id"))
        out.append(row)

    return sorted(out, key=lambda x: x.get("created_at", ""), reverse=True)


def update_email_status(email_id: str, status: str, extra_data: Optional[Dict] = None) -> bool:
    updates = {"status": status}
    if status == "sent":
        updates["sent_at"] = _now()
    elif status == "opened":
        updates["opened_at"] = _now()
    elif status == "clicked":
        updates["clicked_at"] = _now()
    if extra_data:
        updates.update(extra_data)

    if _using_supabase():
        supabase.table("emails").update(updates).eq("id", email_id).execute()
        return True

    with _lock:
        db = _load_local_db()
        for email in db.get("emails", []):
            if str(email.get("id")) == str(email_id):
                email.update(updates)
                _save_local_db(db)
                return True
    return False


# ==================== Users ====================

def create_user(user_data: Dict) -> str:
    payload = dict(user_data)
    payload.setdefault("id", _new_id())
    payload.setdefault("plan", "free")
    payload.setdefault("subscription_status", "inactive")
    payload.setdefault("stripe_customer_id", "")
    payload.setdefault("stripe_subscription_id", "")
    payload.setdefault("checkout_session_id", "")
    payload.setdefault("current_period_end", None)
    payload.setdefault("created_at", _now())
    payload["updated_at"] = _now()

    if _using_supabase():
        result = supabase.table("users").insert(payload).execute()
        return result.data[0]["id"]

    with _lock:
        db = _load_local_db()
        db.setdefault("users", []).append(payload)
        _save_local_db(db)
    return payload["id"]


def get_user_by_email(email: str) -> Optional[Dict]:
    target = (email or "").strip().lower()

    if _using_supabase():
        result = supabase.table("users").select("*").eq("email", target).execute()
        return result.data[0] if result.data else None

    with _lock:
        for user in _load_local_db().get("users", []):
            if str(user.get("email", "")).strip().lower() == target:
                return user
    return None


def update_user(user_id: str, updates: Dict) -> bool:
    payload = dict(updates)
    payload["updated_at"] = _now()

    if _using_supabase():
        supabase.table("users").update(payload).eq("id", user_id).execute()
        return True

    with _lock:
        db = _load_local_db()
        for user in db.get("users", []):
            if str(user.get("id")) == str(user_id):
                user.update(payload)
                _save_local_db(db)
                return True
    return False


def get_user_by_id(user_id: str) -> Optional[Dict]:
    if _using_supabase():
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None

    with _lock:
        for user in _load_local_db().get("users", []):
            if str(user.get("id")) == str(user_id):
                return user
    return None


# ==================== Analytics ====================

def get_stats(user_id: Optional[str] = None) -> Dict:
    try:
        leads = get_leads(user_id)
        emails = get_emails(user_id)

        total_leads = len(leads)
        total_emails = len(emails)
        opened = sum(1 for x in emails if x.get("opened_at"))
        clicked = sum(1 for x in emails if x.get("clicked_at"))

        return {
            "total_leads": total_leads,
            "total_emails": total_emails,
            "opened_emails": opened,
            "clicked_emails": clicked,
            "open_rate": (opened / total_emails * 100) if total_emails else 0,
            "click_rate": (clicked / total_emails * 100) if total_emails else 0,
        }
    except Exception as e:
        print(f"get_stats failed: {e}")
        return {
            "total_leads": 0,
            "total_emails": 0,
            "opened_emails": 0,
            "clicked_emails": 0,
            "open_rate": 0,
            "click_rate": 0,
        }


# ==================== Tracking ====================

def track_email_open(email_id: str, device_info: Optional[Dict] = None) -> bool:
    if _using_supabase():
        current = supabase.table("emails").select("opens").eq("id", email_id).execute().data
        opens = (current[0].get("opens", 0) if current else 0) + 1
        updates = {"status": "opened", "opened_at": _now(), "opens": opens}
        if device_info:
            updates["device_info"] = device_info
        supabase.table("emails").update(updates).eq("id", email_id).execute()
        return True

    with _lock:
        db = _load_local_db()
        for email in db.get("emails", []):
            if str(email.get("id")) == str(email_id):
                email["status"] = "opened"
                email["opened_at"] = _now()
                email["opens"] = int(email.get("opens", 0)) + 1
                if device_info:
                    email["device_info"] = device_info
                _save_local_db(db)
                return True
    return False


def track_email_click(email_id: str, url: str, device_info: Optional[Dict] = None) -> bool:
    if _using_supabase():
        current = supabase.table("emails").select("clicks").eq("id", email_id).execute().data
        clicks = (current[0].get("clicks", 0) if current else 0) + 1
        updates = {"status": "clicked", "clicked_at": _now(), "clicks": clicks, "clicked_url": url}
        if device_info:
            updates["click_device_info"] = device_info
        supabase.table("emails").update(updates).eq("id", email_id).execute()
        return True

    with _lock:
        db = _load_local_db()
        for email in db.get("emails", []):
            if str(email.get("id")) == str(email_id):
                email["status"] = "clicked"
                email["clicked_at"] = _now()
                email["clicks"] = int(email.get("clicks", 0)) + 1
                email["clicked_url"] = url
                if device_info:
                    email["click_device_info"] = device_info
                _save_local_db(db)
                return True
    return False


# ==================== Subscription ====================

def get_user_subscription(user_id: str) -> Dict:
    fallback = {
        "plan": "free",
        "subscription_status": "inactive",
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
        "checkout_session_id": "",
        "current_period_end": None,
    }

    user = get_user_by_id(user_id)
    if not user:
        return fallback

    data = fallback.copy()
    data.update(
        {
            "plan": user.get("plan", "free") or "free",
            "subscription_status": user.get("subscription_status", "inactive") or "inactive",
            "stripe_customer_id": user.get("stripe_customer_id", "") or "",
            "stripe_subscription_id": user.get("stripe_subscription_id", "") or "",
            "checkout_session_id": user.get("checkout_session_id", "") or "",
            "current_period_end": user.get("current_period_end"),
        }
    )
    return data


def update_user_subscription(
    user_id: str,
    plan: str,
    subscription_status: str,
    stripe_customer_id: Optional[str] = None,
    stripe_subscription_id: Optional[str] = None,
    checkout_session_id: Optional[str] = None,
    current_period_end: Optional[str] = None,
) -> bool:
    updates = {
        "plan": plan,
        "subscription_status": subscription_status,
        "updated_at": _now(),
    }
    if stripe_customer_id is not None:
        updates["stripe_customer_id"] = stripe_customer_id
    if stripe_subscription_id is not None:
        updates["stripe_subscription_id"] = stripe_subscription_id
    if checkout_session_id is not None:
        updates["checkout_session_id"] = checkout_session_id
    if current_period_end is not None:
        updates["current_period_end"] = current_period_end

    return update_user(user_id, updates)
