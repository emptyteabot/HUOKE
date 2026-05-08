#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SALES_DIR = PROJECT_ROOT / "sales"
SELF_GROWTH_ACCOUNTS = PROJECT_ROOT / "frontend-b2b" / "data" / "self_growth" / "accounts.json"
LIVE_TARGETS = PROJECT_ROOT / "frontend-b2b" / "data" / "live_targets" / "leadpulse_real_targets_latest.json"
LEADS_SNAPSHOT = PROJECT_ROOT / "frontend-b2b" / "data" / "leads_snapshot.json"

USER_AGENT = "LeadPulseSelfProspecting/1.0 (public RSS/API research)"
ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


@dataclass(frozen=True)
class IndustryPlan:
    key: str
    label: str
    segment: str
    subreddits: tuple[str, ...]
    queries: tuple[str, ...]
    hn_queries: tuple[str, ...] = ()
    github_queries: tuple[str, ...] = ()


INDUSTRIES: tuple[IndustryPlan, ...] = (
    IndustryPlan(
        "marketing_agency",
        "Marketing agencies",
        "agency/service team",
        ("marketingagency", "DigitalMarketing", "PPC", "SEO", "socialmedia"),
        ("find clients", "client acquisition", "lead generation", "qualified leads", "cold email", "outreach", "appointment setting", "sales pipeline"),
        ("marketing agency find clients", "agency lead generation", "client acquisition agency"),
        ("marketing agency clients", "agency CRM lead generation"),
    ),
    IndustryPlan(
        "b2b_saas",
        "B2B SaaS and startups",
        "B2B SaaS/startup",
        ("SaaS", "startups", "Entrepreneur", "indiehackers"),
        ("first customers", "customer acquisition", "lead generation", "sales pipeline", "founder sales", "outbound", "pricing conversion", "trial conversion"),
        ("Ask HN first customers SaaS", "SaaS customer acquisition", "startup sales pipeline"),
        ("customer acquisition SaaS", "SaaS CRM lead generation"),
    ),
    IndustryPlan(
        "ecommerce",
        "Ecommerce and DTC",
        "ecommerce/DTC operator",
        ("ecommerce", "shopify", "AmazonFBA", "dropship"),
        ("customer acquisition", "conversion rate", "ads not converting", "email marketing", "repeat customers", "lead generation", "abandoned cart", "paid ads"),
        ("ecommerce conversion rate", "shopify customer acquisition"),
        ("shopify lead generation", "ecommerce CRM"),
    ),
    IndustryPlan(
        "local_services",
        "Local services",
        "local service business",
        ("smallbusiness", "sweatystartup", "EntrepreneurRideAlong"),
        ("get more customers", "lead generation", "google ads leads", "local SEO", "client acquisition", "booking appointments", "more calls", "sales follow up"),
        ("local business lead generation", "small business customer acquisition"),
        ("local services CRM lead generation",),
    ),
    IndustryPlan(
        "real_estate",
        "Real estate",
        "real estate operator",
        ("realtors", "RealEstate", "realestateinvesting"),
        ("lead generation", "buyer leads", "seller leads", "CRM", "follow up", "appointments", "cold outreach", "listing leads"),
        ("real estate lead generation", "realtor client acquisition"),
        ("real estate CRM leads",),
    ),
    IndustryPlan(
        "legal_accounting",
        "Legal and accounting",
        "professional services firm",
        ("LawFirm", "Lawyertalk", "Accounting", "taxpros"),
        ("client acquisition", "lead generation", "intake", "CRM", "marketing", "referrals", "consultations", "new clients"),
        ("law firm client acquisition", "accounting firm lead generation"),
        ("law firm CRM lead generation", "accounting CRM clients"),
    ),
    IndustryPlan(
        "health_clinics",
        "Clinics and wellness",
        "clinic/wellness practice",
        ("dentistry", "Chiropractic", "physicaltherapy", "optometry", "Therapists"),
        ("new patients", "marketing", "lead generation", "appointments", "google ads", "patient acquisition", "referrals", "booking"),
        ("clinic patient acquisition", "dental marketing leads"),
        ("clinic CRM lead generation", "dental lead generation"),
    ),
    IndustryPlan(
        "coaches_consultants",
        "Coaches and consultants",
        "coach/consultant",
        ("consulting", "coaching", "freelance", "freelanceWriters", "sales"),
        ("find clients", "lead generation", "outreach", "client acquisition", "book calls", "discovery calls", "proposal follow up", "consulting clients"),
        ("consultancy find clients", "consultant lead generation", "Ask HN consultancy clients"),
        ("consulting CRM lead generation",),
    ),
    IndustryPlan(
        "recruiting_staffing",
        "Recruiting and staffing",
        "recruiting/staffing firm",
        ("recruiting", "staffing", "sales"),
        ("client acquisition", "find clients", "lead generation", "BD", "outreach", "book meetings", "sales pipeline", "agency clients"),
        ("recruiting agency client acquisition", "staffing lead generation"),
        ("recruiting CRM lead generation",),
    ),
    IndustryPlan(
        "home_services",
        "Home services and contractors",
        "home services contractor",
        ("Contractor", "HVAC", "electricians", "plumbing", "Roofing"),
        ("leads", "google ads", "marketing", "get more calls", "booked jobs", "local SEO", "estimate requests", "customer acquisition"),
        ("contractor lead generation", "home services customer acquisition"),
        ("contractor CRM lead generation",),
    ),
    IndustryPlan(
        "education_training",
        "Education and training",
        "education/training provider",
        ("OnlineTeaching", "InstructionalDesign", "Teachers", "Languagelearning"),
        ("find students", "lead generation", "course sales", "marketing", "enrollment", "book calls", "coaching clients", "student acquisition"),
        ("course sales lead generation", "education customer acquisition"),
        ("course CRM lead generation",),
    ),
    IndustryPlan(
        "restaurants_hospitality",
        "Restaurants and hospitality",
        "restaurant/hospitality business",
        ("restaurantowners", "restaurateur", "smallbusiness"),
        ("marketing", "get customers", "reservations", "catering leads", "local SEO", "repeat customers", "events leads", "google ads"),
        ("restaurant marketing get customers", "hospitality lead generation"),
        ("restaurant CRM marketing automation",),
    ),
    IndustryPlan(
        "creator_services",
        "Creator and content services",
        "creator/content business",
        ("NewTubers", "podcasting", "content_marketing", "socialmedia"),
        ("get clients", "sponsors", "lead generation", "inbound leads", "newsletter growth", "conversion", "paid community", "course sales"),
        ("creator business lead generation", "newsletter customer acquisition"),
        ("creator CRM lead generation",),
    ),
    IndustryPlan(
        "study_abroad_agencies",
        "Study abroad agencies",
        "study abroad agency/education consultant",
        (),
        (),
        (),
        (),
    ),
)


PAIN_TERMS: dict[str, int] = {
    "client acquisition": 26,
    "customer acquisition": 26,
    "lead generation": 25,
    "qualified leads": 24,
    "find clients": 24,
    "get more customers": 24,
    "new patients": 24,
    "buyer leads": 22,
    "seller leads": 22,
    "book calls": 22,
    "appointments": 20,
    "outreach": 18,
    "cold email": 18,
    "sales pipeline": 18,
    "crm": 16,
    "lead quality": 20,
    "no leads": 18,
    "bad leads": 18,
    "prospecting": 18,
    "sales calls": 18,
    "booked calls": 18,
    "appointment booking": 18,
    "client acquisition cost": 18,
    "customer acquisition cost": 18,
    "outbound sales": 18,
    "cold outreach": 18,
    "best crm": 14,
    "conversion": 16,
    "google ads": 16,
    "local seo": 16,
    "intake": 16,
    "follow up": 15,
    "referrals": 12,
    "marketing": 10,
    "sales": 10,
    "leads": 10,
    "clients": 10,
    "customers": 10,
}

PERSONA_TERMS: dict[str, int] = {
    "agency": 22,
    "founder": 20,
    "owner": 20,
    "startup": 18,
    "saas": 18,
    "consultant": 18,
    "coach": 16,
    "freelancer": 16,
    "small business": 16,
    "law firm": 16,
    "realtor": 16,
    "clinic": 16,
    "dentist": 16,
    "contractor": 16,
    "restaurant": 16,
    "shopify": 15,
    "ecommerce": 15,
    "staffing": 15,
    "recruiting": 15,
    "course": 12,
    "留学": 18,
    "中介": 16,
    "顾问": 16,
    "教育": 14,
    "申请": 12,
}

BUYING_LANGUAGE: dict[str, int] = {
    "how do i": 12,
    "how to": 12,
    "what is the best": 12,
    "recommend": 12,
    "looking for": 12,
    "need help": 12,
    "struggle": 12,
    "not converting": 12,
    "wasting": 10,
    "cost": 8,
    "budget": 8,
    "tool": 8,
    "software": 8,
}

NEGATIVE_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.I)
    for p in (
        r"\bresume\b",
        r"\bjob hunting\b",
        r"\blooking for a job\b",
        r"\binternship\b",
        r"\bstudent project\b",
        r"\bhomework\b",
        r"\bassignment\b",
        r"\bdating\b",
        r"\bnsfw\b",
        r"\bcrypto giveaway\b",
        r"\bleads available\b",
        r"\bselling leads\b",
        r"\bbuy leads\b",
        r"\baca leads\b",
        r"\bmedicare leads\b",
        r"\bfinal expense\b",
        r"\bfor hire\b",
        r"\bburnout\b",
        r"\btrauma\b",
        r"\banxiety\b",
        r"\bdepression\b",
        r"\bmental health\b",
        r"\bcareer advice\b",
        r"\bcareer change\b",
        r"\bquit my job\b",
        r"\blayoff\b",
        r"\binterview\b",
        r"\bcandidate\b",
        r"\brecap\b",
        r"\bnews digest\b",
        r"\bnewsletter roundup\b",
        r"\bi built\b",
        r"\bbuilt something\b",
        r"\bshow hn\b",
        r"\blaunched\b",
        r"\bpromoting\b",
        r"\bbuilt (a|an|my)\b",
        r"\bi made\b",
        r"\bfeedback\b",
        r"\blooking for testers\b",
        r"\bfree .*tool\b",
        r"\bi can market\b",
        r"\bproven results\b",
        r"\bco-?founder\b",
        r"\bneed a mentor\b",
        r"\bpartnering up\b",
        r"\bpartnering with .*agenc",
    )
)

HIGH_INTENT_EXPANSION = (
    "lead quality",
    "no leads",
    "bad leads",
    "qualified leads",
    "prospecting",
    "sales calls",
    "booked calls",
    "appointment booking",
    "client acquisition cost",
    "customer acquisition cost",
    "best CRM",
    "outbound sales",
    "cold outreach",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean_text(value: Any, limit: int = 600) -> str:
    raw = html.unescape(str(value or ""))
    raw = re.sub(r"<br\s*/?>", " ", raw, flags=re.I)
    raw = re.sub(r"<[^>]+>", " ", raw)
    raw = re.sub(r"\s+", " ", raw).strip()
    return raw[:limit].strip()


def stable_id(*parts: Any) -> str:
    base = "|".join(clean_text(x, 1000).lower() for x in parts if str(x or "").strip())
    return hashlib.sha1(base.encode("utf-8", "ignore")).hexdigest()[:14]


def requests_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT, "Accept": "application/rss+xml,application/json,text/xml;q=0.9,*/*;q=0.8"})
    return s


def fetch_text(session: requests.Session, url: str, timeout: int = 25) -> str:
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=timeout)
            if r.status_code in {429, 500, 502, 503, 504}:
                time.sleep(1.0 + attempt)
                continue
            r.raise_for_status()
            return r.text
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            time.sleep(0.7 + attempt)
    raise RuntimeError(f"fetch failed: {url}: {last_exc}")


def reddit_rss_url(subreddit: str, query: str) -> str:
    return f"https://www.reddit.com/r/{subreddit}/search.rss?q={quote_plus(query)}&restrict_sr=1&sort=new"


GLOBAL_REDDIT_QUERIES: tuple[tuple[str, str], ...] = (
    ("marketing_agency", "how to get more clients agency"),
    ("marketing_agency", "agency qualified leads"),
    ("marketing_agency", "agency client acquisition cost"),
    ("marketing_agency", "marketing agency cold outreach"),
    ("b2b_saas", "SaaS first customers"),
    ("b2b_saas", "B2B SaaS customer acquisition"),
    ("b2b_saas", "SaaS outbound sales"),
    ("b2b_saas", "trial conversion SaaS"),
    ("ecommerce", "shopify ads not converting"),
    ("ecommerce", "ecommerce customer acquisition"),
    ("ecommerce", "abandoned cart conversion"),
    ("ecommerce", "DTC email marketing leads"),
    ("local_services", "small business lead generation"),
    ("local_services", "local business google ads leads"),
    ("local_services", "get more customers small business"),
    ("real_estate", "real estate lead generation"),
    ("real_estate", "realtor seller leads"),
    ("real_estate", "real estate CRM follow up"),
    ("legal_accounting", "law firm lead generation"),
    ("legal_accounting", "accounting firm client acquisition"),
    ("legal_accounting", "law firm intake CRM"),
    ("health_clinics", "dental marketing new patients"),
    ("health_clinics", "clinic patient acquisition"),
    ("health_clinics", "chiropractic lead generation"),
    ("coaches_consultants", "consultant find clients"),
    ("coaches_consultants", "coaching clients lead generation"),
    ("coaches_consultants", "book discovery calls consulting"),
    ("recruiting_staffing", "recruiting agency client acquisition"),
    ("recruiting_staffing", "staffing agency lead generation"),
    ("recruiting_staffing", "recruiter business development clients"),
    ("home_services", "contractor lead generation"),
    ("home_services", "HVAC google ads leads"),
    ("home_services", "roofing leads local SEO"),
    ("education_training", "course sales lead generation"),
    ("education_training", "online course enrollment marketing"),
    ("restaurants_hospitality", "restaurant marketing get customers"),
    ("restaurants_hospitality", "catering leads restaurant"),
    ("creator_services", "newsletter sponsorship leads"),
    ("creator_services", "creator business lead generation"),
    ("marketing_agency", "agency no qualified leads"),
    ("marketing_agency", "agency appointment setting"),
    ("marketing_agency", "how do you get leads for agency"),
    ("marketing_agency", "digital agency sales pipeline"),
    ("b2b_saas", "B2B startup outbound sales"),
    ("b2b_saas", "SaaS cold email customers"),
    ("b2b_saas", "SaaS sales pipeline leads"),
    ("b2b_saas", "B2B SaaS trial users not converting"),
    ("ecommerce", "DTC paid ads not converting"),
    ("ecommerce", "shopify conversion rate optimization"),
    ("ecommerce", "ecommerce email marketing customers"),
    ("local_services", "local service business no leads"),
    ("local_services", "small business sales follow up"),
    ("real_estate", "realtor cold outreach leads"),
    ("real_estate", "mortgage broker lead generation"),
    ("legal_accounting", "law firm marketing leads"),
    ("legal_accounting", "law firm intake software"),
    ("legal_accounting", "tax firm client acquisition"),
    ("health_clinics", "med spa marketing leads"),
    ("health_clinics", "physical therapy marketing new patients"),
    ("health_clinics", "optometry patient acquisition"),
    ("coaches_consultants", "online coach find clients"),
    ("coaches_consultants", "freelance consultant find clients"),
    ("coaches_consultants", "consulting sales pipeline"),
    ("recruiting_staffing", "staffing agency business development"),
    ("recruiting_staffing", "recruiter finding clients"),
    ("home_services", "plumber lead generation"),
    ("home_services", "roofing google ads leads"),
    ("home_services", "HVAC lead generation"),
    ("restaurants_hospitality", "restaurant loyalty marketing"),
    ("restaurants_hospitality", "restaurant catering leads"),
    ("education_training", "online course enrollment marketing"),
    ("education_training", "coaching program lead generation"),
    ("creator_services", "newsletter sponsorship sales"),
    ("creator_services", "creator paid community sales"),
)


def reddit_global_rss_url(query: str) -> str:
    return f"https://www.reddit.com/search.rss?q={quote_plus(query)}&sort=new"


def parse_reddit_feed(xml_text: str, industry: IndustryPlan, subreddit: str, query: str, feed_url: str) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    rows: list[dict[str, Any]] = []
    for entry in root.findall("atom:entry", ATOM_NS):
        title = clean_text(entry.findtext("atom:title", default="", namespaces=ATOM_NS), 260)
        content = clean_text(entry.findtext("atom:content", default="", namespaces=ATOM_NS), 700)
        updated = clean_text(entry.findtext("atom:updated", default="", namespaces=ATOM_NS), 80)
        author_el = entry.find("atom:author", ATOM_NS)
        author = ""
        author_url = ""
        if author_el is not None:
            author = clean_text(author_el.findtext("atom:name", default="", namespaces=ATOM_NS), 120)
            author_url = clean_text(author_el.findtext("atom:uri", default="", namespaces=ATOM_NS), 300)
        link = ""
        for link_el in entry.findall("atom:link", ATOM_NS):
            href = link_el.attrib.get("href", "")
            rel = link_el.attrib.get("rel", "alternate")
            if href and rel == "alternate":
                link = href
                break
        if not link:
            link_el = entry.find("atom:link", ATOM_NS)
            link = link_el.attrib.get("href", "") if link_el is not None else ""
        evidence = clean_text(f"{title}. {content}", 700)
        rows.append(
            {
                "source": "reddit_rss",
                "platform": "reddit",
                "industry": industry.key,
                "industry_label": industry.label,
                "segment": industry.segment,
                "source_channel": f"r/{subreddit}",
                "query": query,
                "source_url": link or feed_url,
                "author": author,
                "author_url": author_url,
                "title": title,
                "evidence": evidence,
                "published_at": updated,
                "raw_source_url": feed_url,
            }
        )
    return rows


def parse_reddit_global_feed(xml_text: str, industry: IndustryPlan, query: str, feed_url: str) -> list[dict[str, Any]]:
    rows = parse_reddit_feed(xml_text, industry, "all", query, feed_url)
    for row in rows:
        row["source"] = "reddit_global_rss"
        row["source_channel"] = "reddit/all search"
    return rows


def fetch_reddit_task(args: tuple[str, str, str]) -> list[dict[str, Any]]:
    industry_key, subreddit, query = args
    industry = INDUSTRY_BY_KEY[industry_key]
    url = reddit_rss_url(subreddit, query)
    session = requests_session()
    try:
        xml_text = fetch_text(session, url)
        return parse_reddit_feed(xml_text, industry, subreddit, query, url)
    except Exception as exc:  # noqa: BLE001
        return [
            {
                "source": "fetch_error",
                "platform": "reddit",
                "industry": industry.key,
                "industry_label": industry.label,
                "segment": industry.segment,
                "source_channel": f"r/{subreddit}",
                "query": query,
                "source_url": url,
                "author": "",
                "author_url": "",
                "title": "",
                "evidence": f"FETCH_ERROR: {exc}",
                "published_at": "",
                "raw_source_url": url,
            }
        ]


def fetch_reddit_global_task(args: tuple[str, str]) -> list[dict[str, Any]]:
    industry_key, query = args
    industry = INDUSTRY_BY_KEY[industry_key]
    url = reddit_global_rss_url(query)
    session = requests_session()
    try:
        xml_text = fetch_text(session, url)
        return parse_reddit_global_feed(xml_text, industry, query, url)
    except Exception as exc:  # noqa: BLE001
        return [
            {
                "source": "fetch_error",
                "platform": "reddit",
                "industry": industry.key,
                "industry_label": industry.label,
                "segment": industry.segment,
                "source_channel": "reddit/all search",
                "query": query,
                "source_url": url,
                "author": "",
                "author_url": "",
                "title": "",
                "evidence": f"FETCH_ERROR: {exc}",
                "published_at": "",
                "raw_source_url": url,
            }
        ]


def fetch_hn_for_query(session: requests.Session, industry: IndustryPlan, query: str, pages: int) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for page in range(max(1, pages)):
        url = (
            "https://hn.algolia.com/api/v1/search_by_date?"
            f"query={quote_plus(query)}&tags=story,comment&hitsPerPage=50&page={page}"
        )
        try:
            obj = session.get(url, timeout=25).json()
        except Exception:
            continue
        for hit in obj.get("hits", []) if isinstance(obj, dict) else []:
            title = clean_text(hit.get("title") or hit.get("story_title") or "", 260)
            body = clean_text(hit.get("comment_text") or hit.get("story_text") or hit.get("url") or "", 700)
            object_id = clean_text(hit.get("objectID", ""), 80)
            item_url = f"https://news.ycombinator.com/item?id={object_id}" if object_id else clean_text(hit.get("url", ""), 300)
            rows.append(
                {
                    "source": "hn_algolia",
                    "platform": "hackernews",
                    "industry": industry.key,
                    "industry_label": industry.label,
                    "segment": industry.segment,
                    "source_channel": "Hacker News",
                    "query": query,
                    "source_url": item_url,
                    "author": clean_text(hit.get("author", ""), 120),
                    "author_url": "",
                    "title": title,
                    "evidence": clean_text(f"{title}. {body}", 700),
                    "published_at": clean_text(hit.get("created_at", ""), 80),
                    "raw_source_url": url,
                }
            )
    return rows


def fetch_github_for_query(session: requests.Session, industry: IndustryPlan, query: str) -> list[dict[str, Any]]:
    url = "https://api.github.com/search/repositories?q=" + quote_plus(query + " stars:>1") + "&sort=updated&order=desc&per_page=50"
    rows: list[dict[str, Any]] = []
    try:
        obj = session.get(url, timeout=25).json()
    except Exception:
        return rows
    for repo in obj.get("items", []) if isinstance(obj, dict) else []:
        owner = repo.get("owner") or {}
        desc = clean_text(repo.get("description", ""), 500)
        title = clean_text(repo.get("full_name", ""), 160)
        rows.append(
            {
                "source": "github_repo",
                "platform": "github",
                "industry": industry.key,
                "industry_label": industry.label,
                "segment": industry.segment,
                "source_channel": "GitHub repositories",
                "query": query,
                "source_url": clean_text(repo.get("html_url", ""), 300),
                "author": clean_text(owner.get("login", ""), 120),
                "author_url": clean_text(owner.get("html_url", ""), 300),
                "title": title,
                "evidence": clean_text(f"{title}. {desc}", 700),
                "published_at": clean_text(repo.get("updated_at", ""), 80),
                "raw_source_url": url,
                "stars": int(repo.get("stargazers_count", 0) or 0),
            }
        )
    return rows


def load_existing_self_growth() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if SELF_GROWTH_ACCOUNTS.exists():
        try:
            data = json.loads(SELF_GROWTH_ACCOUNTS.read_text(encoding="utf-8"))
        except Exception:
            data = []
        for item in data if isinstance(data, list) else []:
            evidence = clean_text(item.get("pain_statement", ""), 700)
            rows.append(
                {
                    "source": "existing_self_growth",
                    "platform": clean_text(item.get("primary_channel", "reddit"), 120),
                    "industry": infer_industry_from_text(evidence + " " + clean_text(item.get("segment", ""))),
                    "industry_label": "",
                    "segment": clean_text(item.get("segment", "existing self-growth target"), 120),
                    "source_channel": clean_text(item.get("primary_channel", ""), 120),
                    "query": "existing self_growth",
                    "source_url": "",
                    "author": clean_text(item.get("company_name", ""), 120),
                    "author_url": "",
                    "title": clean_text(item.get("company_name", ""), 160),
                    "evidence": evidence,
                    "published_at": "",
                    "raw_source_url": str(SELF_GROWTH_ACCOUNTS),
                    "existing_score": int(item.get("blended_score", 0) or 0),
                }
            )
    if LIVE_TARGETS.exists():
        try:
            data = json.loads(LIVE_TARGETS.read_text(encoding="utf-8"))
        except Exception:
            data = []
        for item in data if isinstance(data, list) else []:
            evidence = clean_text(item.get("reason", ""), 700)
            rows.append(
                {
                    "source": "existing_live_targets",
                    "platform": clean_text(item.get("channel", "reddit"), 120),
                    "industry": infer_industry_from_text(evidence + " " + clean_text(item.get("segment", ""))),
                    "industry_label": "",
                    "segment": clean_text(item.get("segment", "existing live target"), 120),
                    "source_channel": clean_text(item.get("channel", ""), 120),
                    "query": clean_text(item.get("query", "existing live_targets"), 180),
                    "source_url": clean_text(item.get("url", ""), 300),
                    "author": clean_text(item.get("name", ""), 120),
                    "author_url": "",
                    "title": clean_text(item.get("name", ""), 160),
                    "evidence": evidence,
                    "published_at": clean_text(item.get("found_at", ""), 80),
                    "raw_source_url": str(LIVE_TARGETS),
                    "existing_score": int(item.get("score", 0) or 0),
                }
            )
    for row in rows:
        industry_key = row.get("industry") or "marketing_agency"
        plan = INDUSTRY_BY_KEY.get(str(industry_key), INDUSTRY_BY_KEY["marketing_agency"])
        row["industry"] = plan.key
        row["industry_label"] = plan.label
        if not row.get("segment"):
            row["segment"] = plan.segment
    return rows


def infer_industry_from_text(text: str) -> str:
    blob = text.lower()
    checks = (
        ("b2b_saas", ("saas", "startup", "mrr", "trial")),
        ("marketing_agency", ("agency", "ppc", "seo", "digital marketing", "marketing")),
        ("ecommerce", ("shopify", "ecommerce", "amazon fba", "store")),
        ("real_estate", ("realtor", "real estate", "listing", "seller leads")),
        ("legal_accounting", ("law firm", "lawyer", "accounting", "tax")),
        ("health_clinics", ("patient", "clinic", "dental", "dentist", "chiropr")),
        ("home_services", ("contractor", "hvac", "plumbing", "electrician", "roofing")),
        ("coaches_consultants", ("consultant", "consulting", "coach", "discovery call")),
        ("recruiting_staffing", ("recruiting", "staffing", "recruiter")),
        ("education_training", ("course", "students", "enrollment", "teacher")),
        ("restaurants_hospitality", ("restaurant", "reservation", "catering")),
        ("creator_services", ("newsletter", "youtube", "podcast", "creator")),
        ("study_abroad_agencies", ("留学", "中介", "顾问", "申请", "英港")),
    )
    for key, terms in checks:
        if any(term in blob for term in terms):
            return key
    return "local_services"


def hits(blob: str, terms: dict[str, int]) -> tuple[int, list[str]]:
    score = 0
    found: list[str] = []
    for term, weight in terms.items():
        if term in blob:
            score += weight
            found.append(term)
    return score, found


def source_bonus(source: str) -> int:
    if source.startswith("existing_"):
        return 18
    if source == "reddit_rss":
        return 12
    if source == "reddit_global_rss":
        return 10
    if source == "hn_algolia":
        return 8
    if source == "github_repo":
        return -6
    return 0


def score_row(row: dict[str, Any]) -> dict[str, Any] | None:
    if row.get("source") == "fetch_error":
        return None
    evidence_blob = clean_text(" ".join(str(row.get(k, "")) for k in ("title", "evidence")), 2000).lower()
    context_blob = clean_text(" ".join(str(row.get(k, "")) for k in ("industry_label", "segment", "source_channel")), 800).lower()
    blob = f"{context_blob} {evidence_blob}".strip()
    if not blob or any(p.search(blob) for p in NEGATIVE_PATTERNS):
        return None

    pain_score, pain_found = hits(evidence_blob, PAIN_TERMS)
    persona_score, persona_found = hits(blob, PERSONA_TERMS)
    buying_score, buying_found = hits(evidence_blob, BUYING_LANGUAGE)
    industry = INDUSTRY_BY_KEY.get(str(row.get("industry", "")), INDUSTRY_BY_KEY[infer_industry_from_text(blob)])
    row["industry"] = industry.key
    row["industry_label"] = industry.label
    row["segment"] = row.get("segment") or industry.segment

    score = 22 + source_bonus(str(row.get("source", ""))) + min(34, pain_score) + min(24, persona_score) + min(16, buying_score)
    if row.get("existing_score"):
        score += min(12, int(row.get("existing_score", 0) or 0) // 30)
    if "?" in str(row.get("title", "")) or "?" in str(row.get("evidence", "")):
        score += 6
    if len(clean_text(row.get("evidence", ""), 2000)) >= 120:
        score += 4
    if str(row.get("platform", "")).lower() == "github":
        score += min(8, int(row.get("stars", 0) or 0) // 20)

    risk_flags: list[str] = []
    if not pain_found:
        risk_flags.append("no_explicit_growth_pain")
    if not persona_found:
        risk_flags.append("weak_business_identity")
    if row.get("source") == "github_repo":
        risk_flags.append("repo_not_buyer_intent")
    if row.get("source") == "hn_algolia":
        risk_flags.append("forum_identity_light")
    if not row.get("source_url"):
        risk_flags.append("missing_public_url")
        score -= 28
    if row.get("source") == "existing_study_abroad_snapshot":
        risk_flags.append("existing_vertical_snapshot_review")
        score = min(score, 74)
    if row.get("source") == "github_repo":
        score = min(score, 72)
    if pain_score <= 10:
        score -= 12
    if persona_score == 0:
        score -= 10

    if pain_score == 0 and persona_score < 18:
        return None
    if score < 48:
        return None

    score = max(0, min(100, int(score)))
    has_public_url = bool(row.get("source_url"))
    has_strong_pain = pain_score >= 18
    has_business_identity = persona_score >= 16
    if score >= 82 and has_public_url and has_strong_pain and has_business_identity:
        tier = "A"
        review_status = "strong_signal"
    elif score >= 70:
        tier = "B"
        review_status = "good_candidate"
    elif score >= 58:
        tier = "C"
        review_status = "manual_review"
    else:
        tier = "D"
        review_status = "low_confidence_review"

    pain_tags = list(dict.fromkeys(pain_found + buying_found))[:8]
    persona_tags = list(dict.fromkeys(persona_found))[:6]
    fit_reason = build_fit_reason(industry, pain_tags, persona_tags, risk_flags)
    first_message = build_first_message(row, industry, pain_tags)
    lead_id = stable_id(row.get("source"), row.get("platform"), row.get("source_url"), row.get("author"), row.get("title"))

    scored = dict(row)
    scored.update(
        {
            "lead_id": lead_id,
            "quality_score": score,
            "quality_tier": tier,
            "review_status": review_status,
            "pain_tags": "; ".join(pain_tags),
            "persona_tags": "; ".join(persona_tags),
            "risk_flags": "; ".join(risk_flags),
            "fit_reason": fit_reason,
            "recommended_offer": offer_for_industry(industry),
            "first_message": first_message,
            "collected_at": now_iso(),
        }
    )
    return scored


def offer_for_industry(industry: IndustryPlan) -> str:
    offers = {
        "marketing_agency": "999 pilot: 30-50 high-intent prospects in your niche, with source links and opener angles.",
        "b2b_saas": "999 pilot: find users already asking for tools/workflows like yours, then hand-clean 30-50 prospects.",
        "ecommerce": "999 pilot: identify public posts showing purchase/conversion/ad-waste pain for your category.",
        "local_services": "999 pilot: local demand scan for people asking for quotes, referrals, estimates, or booking help.",
        "real_estate": "999 pilot: buyer/seller/agent lead-intent scan with follow-up angles.",
        "legal_accounting": "999 pilot: intake and consultation demand scan for your practice area.",
        "health_clinics": "999 pilot: public patient-acquisition signal scan; no private health data.",
        "coaches_consultants": "999 pilot: find people asking for recommendations, solutions, and discovery-call help.",
        "recruiting_staffing": "999 pilot: find companies and operators discussing hiring/client acquisition pain.",
        "home_services": "999 pilot: estimate/job request signal scan for your trade and service area.",
        "education_training": "999 pilot: enrollment/course-demand signal scan with outreach angles.",
        "restaurants_hospitality": "999 pilot: local demand and event/catering/reservation intent scan.",
        "creator_services": "999 pilot: sponsor, newsletter, course, and paid-community demand scan.",
        "study_abroad_agencies": "999 pilot: public posts from students asking for applications, agencies, documents, and school selection.",
    }
    return offers.get(industry.key, "999 pilot: 30-50 hand-cleaned public demand signals with source links and opener angles.")


def build_fit_reason(industry: IndustryPlan, pain_tags: list[str], persona_tags: list[str], risk_flags: list[str]) -> str:
    pain = ", ".join(pain_tags[:3]) or "growth-related discussion"
    persona = ", ".join(persona_tags[:2]) or industry.segment
    risk = f" Review flags: {', '.join(risk_flags)}." if risk_flags else ""
    return f"{industry.label}: matched {persona} plus {pain}.{risk}"


def build_first_message(row: dict[str, Any], industry: IndustryPlan, pain_tags: list[str]) -> str:
    author = clean_text(row.get("author", ""), 80) or "there"
    pain = ", ".join(pain_tags[:3]) or "client acquisition"
    evidence = clean_text(row.get("title") or row.get("evidence"), 120)
    return (
        f"Hi {author}, saw your public post about {evidence}. "
        f"I am testing LeadPulse for {industry.segment}s: it finds public posts where buyers are already asking about {pain}, "
        "then hand-cleans source links and opener angles. Want me to send a 5-row sample before any pitch?"
    )


def dedupe_scored(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    best: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = clean_text(row.get("source_url", ""), 400).split("?", 1)[0].lower()
        if not key:
            key = stable_id(row.get("platform"), row.get("author"), row.get("title"), clean_text(row.get("evidence", ""), 180))
        author_fp = stable_id(row.get("source"), row.get("author"), clean_text(row.get("title") or row.get("evidence"), 180))
        if author_fp:
            key = f"{key}|{author_fp}"
        prev = best.get(key)
        if prev is None or int(row.get("quality_score", 0)) > int(prev.get("quality_score", 0)):
            best[key] = row
    return list(best.values())


def load_study_abroad_agency_candidates(limit: int = 300) -> list[dict[str, Any]]:
    if not LEADS_SNAPSHOT.exists():
        return []
    try:
        payload = json.loads(LEADS_SNAPSHOT.read_text(encoding="utf-8"))
    except Exception:
        return []
    source_rows = payload.get("rows", []) if isinstance(payload, dict) else []
    industry = INDUSTRY_BY_KEY["study_abroad_agencies"]
    agency_terms = ("留学", "教育", "顾问", "机构", "老师", "学姐", "学长", "中介", "申请")
    out: list[dict[str, Any]] = []
    seen = set()
    for item in source_rows if isinstance(source_rows, list) else []:
        if not isinstance(item, dict):
            continue
        blob = clean_text(" ".join(str(item.get(k, "")) for k in ("author", "content", "keyword")), 1200)
        if not any(term in blob for term in agency_terms):
            continue
        key = clean_text(item.get("author_url") or item.get("post_url") or item.get("author"), 300).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "source": "existing_study_abroad_snapshot",
                "platform": clean_text(item.get("platform", ""), 80) or "social",
                "industry": industry.key,
                "industry_label": industry.label,
                "segment": industry.segment,
                "source_channel": "LeadPulse study_abroad snapshot",
                "query": clean_text(item.get("keyword", ""), 160),
                "source_url": clean_text(item.get("post_url", ""), 300),
                "author": clean_text(item.get("author", ""), 120),
                "author_url": clean_text(item.get("author_url", ""), 300),
                "title": clean_text(item.get("author", ""), 160),
                "evidence": clean_text(item.get("content", ""), 700),
                "published_at": clean_text(item.get("collected_at", ""), 80),
                "raw_source_url": str(LEADS_SNAPSHOT),
                "existing_score": int(item.get("score", 0) or 0),
            }
        )
        if len(out) >= limit:
            break
    return out


def balanced_select(
    rows: list[dict[str, Any]],
    target: int,
    min_per_industry: int = 25,
    min_score: int = 70,
    require_public_url: bool = True,
    strict_target: bool = False,
) -> list[dict[str, Any]]:
    eligible = [row for row in rows if int(row.get("quality_score", 0)) >= min_score]
    if require_public_url:
        eligible = [row for row in eligible if str(row.get("source_url", "")).strip()]
    if len(eligible) < target and not strict_target:
        eligible = [row for row in rows if int(row.get("quality_score", 0)) >= 58]
        if require_public_url:
            eligible = [row for row in eligible if str(row.get("source_url", "")).strip()]
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in sorted(eligible, key=lambda x: int(x.get("quality_score", 0)), reverse=True):
        groups[str(row.get("industry", "unknown"))].append(row)
    industries = [plan.key for plan in INDUSTRIES if groups.get(plan.key)]
    if not industries:
        return sorted(eligible, key=lambda x: int(x.get("quality_score", 0)), reverse=True)[:target]
    quota = max(1, min(min_per_industry, target // max(1, len(industries))))
    selected: list[dict[str, Any]] = []
    selected_ids = set()
    for key in industries:
        for row in groups[key][:quota]:
            selected.append(row)
            selected_ids.add(row["lead_id"])
    remaining = [r for r in sorted(eligible, key=lambda x: int(x.get("quality_score", 0)), reverse=True) if r["lead_id"] not in selected_ids]
    for row in remaining:
        if len(selected) >= target:
            break
        selected.append(row)
        selected_ids.add(row["lead_id"])
    return sorted(selected[:target], key=lambda x: int(x.get("quality_score", 0)), reverse=True)


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fields = [
        "lead_id",
        "quality_tier",
        "quality_score",
        "review_status",
        "industry_label",
        "segment",
        "source",
        "platform",
        "source_channel",
        "author",
        "author_url",
        "title",
        "source_url",
        "published_at",
        "query",
        "pain_tags",
        "persona_tags",
        "risk_flags",
        "fit_reason",
        "recommended_offer",
        "first_message",
        "evidence",
        "raw_source_url",
        "collected_at",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fields})


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_report(path: Path, rows: list[dict[str, Any]], raw_count: int, scored_count: int, selected_target: int) -> None:
    by_industry = Counter(row["industry_label"] for row in rows)
    by_tier = Counter(row["quality_tier"] for row in rows)
    by_source = Counter(row["source"] for row in rows)
    risk_counter: Counter[str] = Counter()
    for row in rows:
        for flag in str(row.get("risk_flags", "")).split(";"):
            flag = flag.strip()
            if flag:
                risk_counter[flag] += 1

    lines = [
        "# LeadPulse self-prospecting review",
        "",
        f"- Generated at: {now_iso()}",
        f"- Raw candidates fetched: {raw_count}",
        f"- Scored candidates after filters: {scored_count}",
        f"- Selected output target: {selected_target}",
        f"- Final rows: {len(rows)}",
        "",
        "## Quality tiers",
    ]
    for key, count in sorted(by_tier.items()):
        lines.append(f"- {key}: {count}")
    lines.extend(["", "## Industry distribution"])
    for key, count in by_industry.most_common():
        lines.append(f"- {key}: {count}")
    lines.extend(["", "## Source distribution"])
    for key, count in by_source.most_common():
        lines.append(f"- {key}: {count}")
    lines.extend(["", "## Review flags"])
    if risk_counter:
        for key, count in risk_counter.most_common():
            lines.append(f"- {key}: {count}")
    else:
        lines.append("- none")
    lines.extend(["", "## Top 25"])
    for idx, row in enumerate(rows[:25], start=1):
        lines.append(
            f"{idx}. [{row['quality_tier']}/{row['quality_score']}] {row['industry_label']} | "
            f"{row.get('author') or 'unknown'} | {row.get('title') or row.get('source_url')}"
        )
        lines.append(f"   - URL: {row.get('source_url', '')}")
        lines.append(f"   - Fit: {row.get('fit_reason', '')}")
    lines.extend(
        [
            "",
            "## Review protocol",
            "- A: strong public signal; can enter first-touch queue after quick human skim.",
            "- B: good candidate; verify identity and source context before sending.",
            "- C/D: candidate pool only; do not contact without manual confirmation.",
            "- Do not promise private contact data. LeadPulse offer should be public-signal discovery plus manual cleaning.",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def build_tasks(max_reddit_tasks: int) -> list[tuple[str, str, str]]:
    tasks: list[tuple[str, str, str]] = []
    per_industry: list[list[tuple[str, str, str]]] = []
    for industry in INDUSTRIES:
        rows = []
        for subreddit in industry.subreddits:
            for query in industry.queries:
                rows.append((industry.key, subreddit, query))
        per_industry.append(rows)
    max_len = max((len(rows) for rows in per_industry), default=0)
    for idx in range(max_len):
        for rows in per_industry:
            if idx < len(rows):
                tasks.append(rows[idx])
    return tasks[:max_reddit_tasks] if max_reddit_tasks > 0 else tasks


def collect(args: argparse.Namespace) -> tuple[list[dict[str, Any]], int]:
    raw_rows: list[dict[str, Any]] = []
    raw_rows.extend(load_existing_self_growth())
    if args.include_study_abroad_agencies:
        raw_rows.extend(load_study_abroad_agency_candidates(args.study_abroad_limit))

    tasks = build_tasks(args.max_reddit_tasks)
    if tasks:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futs = [executor.submit(fetch_reddit_task, task) for task in tasks]
            for idx, fut in enumerate(as_completed(futs), start=1):
                part = fut.result()
                raw_rows.extend(part)
                if args.verbose and idx % 20 == 0:
                    print(f"[reddit] completed={idx}/{len(futs)} raw={len(raw_rows)}", flush=True)

    global_tasks = list(GLOBAL_REDDIT_QUERIES[: args.max_global_reddit_tasks])
    if global_tasks:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futs = [executor.submit(fetch_reddit_global_task, task) for task in global_tasks]
            for idx, fut in enumerate(as_completed(futs), start=1):
                raw_rows.extend(fut.result())
                if args.verbose and idx % 10 == 0:
                    print(f"[reddit_global] completed={idx}/{len(futs)} raw={len(raw_rows)}", flush=True)

    session = requests_session()
    for industry in INDUSTRIES:
        for query in industry.hn_queries[: args.hn_queries_per_industry]:
            raw_rows.extend(fetch_hn_for_query(session, industry, query, args.hn_pages_per_query))
        for query in industry.github_queries[: args.github_queries_per_industry]:
            raw_rows.extend(fetch_github_for_query(session, industry, query))
    return raw_rows, len(raw_rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run LeadPulse self-prospecting across industries")
    parser.add_argument("--target", type=int, default=1000)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--max-reddit-tasks", type=int, default=0, help="0 means all tasks")
    parser.add_argument("--max-global-reddit-tasks", type=int, default=len(GLOBAL_REDDIT_QUERIES))
    parser.add_argument("--hn-pages-per-query", type=int, default=3)
    parser.add_argument("--hn-queries-per-industry", type=int, default=3)
    parser.add_argument("--github-queries-per-industry", type=int, default=1)
    parser.add_argument("--include-study-abroad-agencies", action="store_true")
    parser.add_argument("--study-abroad-limit", type=int, default=300)
    parser.add_argument("--min-per-industry", type=int, default=25)
    parser.add_argument("--min-output-score", type=int, default=70)
    parser.add_argument("--strict-target", action="store_true", help="Fail instead of filling below-threshold rows when there are not enough qualified rows.")
    parser.add_argument("--allow-missing-public-url", action="store_true")
    parser.add_argument("--out-dir", default=str(SALES_DIR))
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


INDUSTRY_BY_KEY = {plan.key: plan for plan in INDUSTRIES}


def main() -> int:
    args = parse_args()
    out_dir = Path(args.out_dir)
    raw_rows, raw_count = collect(args)

    scored: list[dict[str, Any]] = []
    for row in raw_rows:
        item = score_row(row)
        if item:
            scored.append(item)
    scored = dedupe_scored(scored)
    scored.sort(key=lambda x: int(x.get("quality_score", 0)), reverse=True)
    selected = balanced_select(
        scored,
        max(1, int(args.target)),
        min_per_industry=args.min_per_industry,
        min_score=args.min_output_score,
        require_public_url=not args.allow_missing_public_url,
        strict_target=args.strict_target,
    )

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    base = f"leadpulse_self_prospecting_1000_{ts}"
    csv_path = out_dir / f"{base}.csv"
    jsonl_path = out_dir / f"{base}.jsonl"
    report_path = out_dir / f"{base}_review.md"
    latest_csv = out_dir / "leadpulse_self_prospecting_1000_latest.csv"
    latest_jsonl = out_dir / "leadpulse_self_prospecting_1000_latest.jsonl"
    latest_report = out_dir / "leadpulse_self_prospecting_1000_review_latest.md"
    ready_csv = out_dir / "leadpulse_self_prospecting_ready_to_contact_latest.csv"
    ready_jsonl = out_dir / "leadpulse_self_prospecting_ready_to_contact_latest.jsonl"
    ready_report = out_dir / "leadpulse_self_prospecting_ready_to_contact_review_latest.md"

    write_csv(csv_path, selected)
    write_jsonl(jsonl_path, selected)
    write_report(report_path, selected, raw_count, len(scored), int(args.target))
    write_csv(latest_csv, selected)
    write_jsonl(latest_jsonl, selected)
    write_report(latest_report, selected, raw_count, len(scored), int(args.target))
    write_csv(ready_csv, selected)
    write_jsonl(ready_jsonl, selected)
    write_report(ready_report, selected, raw_count, len(scored), len(selected))

    summary = {
        "generated_at": now_iso(),
        "raw_candidates": raw_count,
        "scored_candidates": len(scored),
        "selected": len(selected),
        "target": int(args.target),
        "csv": str(csv_path),
        "jsonl": str(jsonl_path),
        "report": str(report_path),
        "latest_csv": str(latest_csv),
        "latest_jsonl": str(latest_jsonl),
        "latest_report": str(latest_report),
        "ready_csv": str(ready_csv),
        "ready_jsonl": str(ready_jsonl),
        "ready_report": str(ready_report),
        "quality_tiers": Counter(row["quality_tier"] for row in selected),
        "industries": Counter(row["industry_label"] for row in selected),
        "sources": Counter(row["source"] for row in selected),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2, default=dict))
    if len(selected) < int(args.target):
        print(f"[WARN] selected {len(selected)} rows, below target {args.target}.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
