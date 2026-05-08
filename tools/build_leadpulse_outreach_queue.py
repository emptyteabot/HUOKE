#!/usr/bin/env python3
from __future__ import annotations

import csv
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from textwrap import shorten


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SALES_DIR = PROJECT_ROOT / "sales"
INPUT = SALES_DIR / "leadpulse_self_prospecting_ready_to_contact_latest.csv"
OUT_CSV = SALES_DIR / "leadpulse_strict_outreach_queue.csv"
OUT_MD = SALES_DIR / "leadpulse_strict_outreach_queue.md"
TODAY_CSV = SALES_DIR / "leadpulse_today_contact_20.csv"


EXCLUDE_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bresume\b",
        r"\bjob\b",
        r"\bcareer\b",
        r"\brole(s)?\b",
        r"\bsalary\b",
        r"\blayoffs?\b",
        r"\bunemployed\b",
        r"\bhiring\b",
        r"\binterview\b",
        r"\bcandidate\b",
        r"\bfor hire\b",
        r"\bavailable for\b",
        r"\bsales closer\b",
        r"\bbreak into\b",
        r"\bhigher paying\b",
        r"\bswitch to .*freelanc",
        r"\btransition into .*freelanc",
        r"\bfreelanc(ing|er)?\b",
        r"\blearn(ing)? .*smm\b",
        r"\blearn(ing)? .*meta ads\b",
        r"\blearn .*for freelanc",
        r"\bi will not promote\b",
        r"\bwill not promote\b",
        r"\bdo not promote\b",
        r"\bplaybook\b",
        r"\bcase study\b",
        r"\bnewsletter\b",
        r"\broundup\b",
        r"\bguide\b",
        r"\btips?\b",
        r"\btutorial\b",
        r"\bread this\b",
        r"\bwanna get\b",
        r"\byou aren't booked\b",
        r"\bcheaper than\b",
        r"\blead generation 101\b",
        r"\bconsistent pipeline of leads\b",
        r"\bgenerated \d+ .*leads\b",
        r"\bfrom someone who generated\b",
        r"\$?\d+\/hour\b",
        r"\bbusiness owners i speak with\b",
        r"\bmost business owners\b",
        r"\bfree services\b",
        r"\bdoing some research\b",
        r"\bmarketing budgets and spending habits\b",
        r"\bi built\b",
        r"\bi made\b",
        r"\blaunched\b",
        r"\bwhat did you ship\b",
        r"\bship this week\b",
        r"\btgif\b",
        r"\bshow hn\b",
        r"\bwould you use\b",
        r"\blooking for testers\b",
        r"\bco-?founder\b",
        r"\bpartner\b",
        r"\bmentor\b",
        r"\bproven results\b",
        r"\bfree .*tool\b",
        r"\bleads available\b",
        r"\bselling leads\b",
        r"\bbuy leads\b",
        r"\baca\b",
        r"\bmedicare\b",
        r"\bfinal expense\b",
        r"\bfree:?\s+seo audit\b",
        r"\bfree .*audit\b",
        r"\bhow .*shaping .*industry\b",
        r"\bwhat do you think about\b",
        r"\bmy strategy\b",
        r"\bcurious what others\b",
        r"\bwould love to hear\b",
        r"\breal examples\b",
        r"\badvice online\b",
        r"\bhere'?s how\b",
        r"\bhow i\b",
        r"\bi stopped\b",
        r"\bi made \$",
        r"\bpost \d+ of\b",
        r"\bfree spots\b",
        r"\bcourse download\b",
        r"\bcommunity for\b",
        r"\bdifferences between\b",
        r"\bjust drop your clients url\b",
        r"\btitanium university\b",
        r"\bmy skill set\b",
        r"\bgiving up\b",
        r"\b9 to 5\b",
        r"\b\d+% .*struggle\b",
        r"\bcame across this stat\b",
        r"\bkinda shook me\b",
        r"\bnever make it past\b",
        r"\blabou?r shortage\b",
        r"\bdemand money\b",
    )
)

BUYER_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bhow (do|can) i\b",
        r"\bhow to\b",
        r"\bneed help\b",
        r"\bstruggl",
        r"\bstuck\b",
        r"\bnot converting\b",
        r"\bconversion rate\b",
        r"\blead generation\b",
        r"\bqualified leads\b",
        r"\bfind clients\b",
        r"\bget clients\b",
        r"\bclient acquisition\b",
        r"\bcustomer acquisition\b",
        r"\bnew customers\b",
        r"\bnew patients\b",
        r"\bbook calls\b",
        r"\bappointments?\b",
        r"\bgoogle ads\b",
        r"\blocal seo\b",
        r"\boutreach\b",
        r"\bcold email\b",
        r"\bsales pipeline\b",
        r"\bcrm\b",
        r"\bintake\b",
        r"\bfollow up\b",
        r"\breferrals\b",
        r"\brecommend",
        r"\bwhere to start\b",
        r"\bhow much do you pay for leads\b",
        r"\bgetting cases\b",
        r"\bmore calls\b",
        r"\bbooked jobs\b",
        r"\bestimate requests\b",
        r"\btraffic to (my|our|the) (shop|site|store)\b",
        r"\bsales (just )?(aren't|are not|not) picking up\b",
    )
)

STRONG_ACQUISITION_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\blead generation\b",
        r"\blead gen\b",
        r"\bgenerate (quality )?.*leads\b",
        r"\bqualified leads\b",
        r"\bfind clients\b",
        r"\bget clients\b",
        r"\bgetting clients\b",
        r"\bchasing clients\b",
        r"\bclient acquisition\b",
        r"\bcustomer acquisition\b",
        r"\bget more customers\b",
        r"\bnew customers\b",
        r"\bnew patients\b",
        r"\bpatient acquisition\b",
        r"\bgetting cases\b",
        r"\bbook sales calls\b",
        r"\bsales calls\b",
        r"\bbooked calls\b",
        r"\bappointment setting\b",
        r"\bappointments? for potential\b",
        r"\bcold outreach\b",
        r"\bcold email\b",
        r"\boutreach to acquire clients\b",
        r"\bchannels are actually working for client acquisition\b",
        r"\bmarketing agency for lead generation\b",
        r"\bmarketing agency for lead gen\b",
    )
)

OPERATOR_CONTEXT_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bi run\b",
        r"\bwe run\b",
        r"\bi started\b",
        r"\bwe started\b",
        r"\bmy agency\b",
        r"\bour agenc",
        r"\bmy practice\b",
        r"\bour practice\b",
        r"\bmy business\b",
        r"\bour business\b",
        r"\bfamily business\b",
        r"\bopened my own\b",
        r"\bwe are a\b",
        r"\bwe're a\b",
        r"\bwe have a\b",
        r"\bi own\b",
        r"\bfounder\b",
        r"\bowner\b",
        r"\bbusiness owner\b",
        r"\bsmall business\b",
        r"\bagenc",
        r"\bpractice\b",
        r"\bshop\b",
        r"\brestaurant\b",
        r"\bcompany\b",
    )
)

NON_ACQUISITION_OPS_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bscheduling\b",
        r"\bdeposit\b",
        r"\bintake\b",
        r"\bbusiness software\b",
        r"\bcontact management\b",
        r"\bpersonal crm\b",
        r"\bretention\b",
        r"\bcancellation\b",
        r"\bloyalty points\b",
        r"\bpayment provider\b",
        r"\bbot attack\b",
        r"\bsubcontractor\b",
        r"\bpay splits\b",
        r"\blabou?r shortage\b",
    )
)

CORE_GROWTH_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\blead generation\b",
        r"\bqualified leads\b",
        r"\bfind clients\b",
        r"\bget clients\b",
        r"\bchasing clients\b",
        r"\bclient acquisition\b",
        r"\bcustomer acquisition\b",
        r"\bget more customers\b",
        r"\bnew customers\b",
        r"\bnew patients\b",
        r"\bgetting cases\b",
        r"\bbook calls\b",
        r"\bappointments?\b",
        r"\bgoogle ads\b",
        r"\blocal seo\b",
        r"\boutreach\b",
        r"\bcold email\b",
        r"\bsales pipeline\b",
        r"\bcrm\b",
        r"\bintake\b",
        r"\bfollow up\b",
        r"\breferrals\b",
        r"\bmarketing recommendations\b",
        r"\bmore calls\b",
        r"\bbooked jobs\b",
        r"\bestimate requests?\b",
        r"\btraffic to (my|our|the) (shop|site|store)\b",
        r"\bsales (just )?(aren't|are not|not) picking up\b",
    )
)

BUSINESS_PATTERNS = tuple(
    re.compile(pattern, re.I)
    for pattern in (
        r"\bagenc",
        r"\bowner\b",
        r"\bfounder\b",
        r"\bsmall business\b",
        r"\bshopify\b",
        r"\becommerce\b",
        r"\bsaas\b",
        r"\bstartup\b",
        r"\bconsult",
        r"\bcoach",
        r"\bclinic\b",
        r"\bpractice\b",
        r"\bchiro\b",
        r"\bdent",
        r"\blaw\b",
        r"\battorney\b",
        r"\brealtor\b",
        r"\bcontractor\b",
        r"\bjunk removal\b",
        r"\bhvac\b",
        r"\broof",
        r"\brestaurant\b",
        r"\bstaffing\b",
        r"\brecruiting\b",
        r"\bclient\b",
        r"\bcustomer\b",
        r"\bpatients?\b",
    )
)

INDUSTRY_QUOTAS = {
    "Marketing agencies": 18,
    "B2B SaaS and startups": 14,
    "Ecommerce and DTC": 14,
    "Local services": 12,
    "Coaches and consultants": 10,
    "Clinics and wellness": 8,
    "Restaurants and hospitality": 6,
    "Home services and contractors": 6,
    "Legal and accounting": 5,
    "Real estate": 4,
    "Recruiting and staffing": 2,
    "Creator and content services": 1,
}

FIELDNAMES = [
    "rank",
    "priority",
    "industry_label",
    "quality_score",
    "source",
    "platform",
    "author",
    "source_url",
    "published_at",
    "title",
    "signal_summary",
    "recommended_offer",
    "first_message",
    "next_action",
]

TEXT_REPLACEMENTS = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": "\"",
    "\u201d": "\"",
    "\u2013": "-",
    "\u2014": "-",
    "\u2022": "-",
    "\u00e2\u20ac\u2122": "'",
    "\u00e2\u20ac\u0153": "\"",
    "\u00e2\u20ac\ufffd": "\"",
    "\u00e2\u20ac\u201d": "-",
    "\u00e2\u20ac\u201c": "-",
}


def blob(row: dict[str, str]) -> str:
    return " ".join(row.get(key, "") for key in ("title", "evidence"))


def has_any(patterns: tuple[re.Pattern[str], ...], text: str) -> bool:
    return any(pattern.search(text) for pattern in patterns)


def hit_count(patterns: tuple[re.Pattern[str], ...], text: str) -> int:
    return sum(1 for pattern in patterns if pattern.search(text))


def clean_display(text: str) -> str:
    value = " ".join(str(text or "").split())
    for src, dst in TEXT_REPLACEMENTS.items():
        value = value.replace(src, dst)
    return value


def parse_published_at(row: dict[str, str]) -> datetime | None:
    value = row.get("published_at", "").strip()
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def days_old(row: dict[str, str]) -> int | None:
    published_at = parse_published_at(row)
    if published_at is None:
        return None
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - published_at.astimezone(timezone.utc)).days


def best_title(row: dict[str, str]) -> str:
    title = clean_display(row.get("title", ""))
    author = clean_display(row.get("author", "")).replace("/u/", "")
    if title and title.lower() != author.lower():
        return title

    evidence = clean_display(row.get("evidence", ""))
    match = re.match(r"(.{18,130}?[?!.])\s", evidence)
    if match:
        return match.group(1).strip()
    return shorten(evidence or title or "your post", width=92, placeholder="...")


def candidate_score(row: dict[str, str]) -> int:
    text = blob(row)
    score = int(row.get("quality_score") or 0)
    if row.get("quality_tier") == "A":
        score += 12
    if row.get("source", "").startswith("existing_"):
        score += 10
    if row.get("source") == "reddit_rss":
        score += 4
    if row.get("source") == "github_repo":
        score -= 20
    if re.search(r"\b(struggl|need help|stuck|not converting|how do i|how to)\b", text, re.I):
        score += 8
    if re.search(r"\b(lead generation|client acquisition|find clients|appointments?|book calls|google ads|crm)\b", text, re.I):
        score += 8
    score += min(10, hit_count(BUYER_PATTERNS, text) * 2)
    score += min(18, hit_count(STRONG_ACQUISITION_PATTERNS, text) * 6)
    score += min(8, hit_count(BUSINESS_PATTERNS, text) * 2)
    score += min(8, hit_count(OPERATOR_CONTEXT_PATTERNS, text) * 2)
    if hit_count(NON_ACQUISITION_OPS_PATTERNS, text):
        score -= 10
    age = days_old(row)
    if age is not None:
        if age <= 45:
            score += 8
        elif age <= 180:
            score += 4
        elif age > 395:
            score -= 18
    if len(row.get("evidence", "")) >= 120:
        score += 3
    return score


def is_ready(row: dict[str, str]) -> bool:
    text = blob(row)
    if not row.get("source_url"):
        return False
    if row.get("risk_flags"):
        return False
    if row.get("source") == "github_repo":
        return False
    age = days_old(row)
    if row.get("source") != "existing_live_targets" and age is not None and age > 395:
        return False
    if int(row.get("quality_score") or 0) < 82:
        return False
    if has_any(EXCLUDE_PATTERNS, text):
        return False
    if hit_count(STRONG_ACQUISITION_PATTERNS, text) < 1:
        return False
    if hit_count(OPERATOR_CONTEXT_PATTERNS, text) < 1:
        return False
    if hit_count(NON_ACQUISITION_OPS_PATTERNS, text) and hit_count(STRONG_ACQUISITION_PATTERNS, text) < 2:
        return False
    if hit_count(BUYER_PATTERNS, text) < 2:
        return False
    if hit_count(CORE_GROWTH_PATTERNS, text) < 1:
        return False
    if hit_count(BUSINESS_PATTERNS, text) < 1:
        return False
    return True


def contact_message(row: dict[str, str]) -> str:
    title = shorten(best_title(row), width=92, placeholder="...")
    offer = row.get("recommended_offer", "I can send a small sample of hand-cleaned demand signals.")
    offer = offer.replace("estimate/job request", "estimate request")
    return (
        f"Hi {row.get('author') or 'there'}, saw your post about \"{title}\". "
        "I run LeadPulse, which finds public buying-intent posts and turns them into cleaned lead lists with source links and opener angles. "
        f"For your case, the relevant offer is: {offer} "
        "Want me to send a 5-lead sample first?"
    )


def signal_summary(row: dict[str, str]) -> str:
    text = row.get("evidence") or row.get("fit_reason") or row.get("title", "")
    return shorten(clean_display(text), width=220, placeholder="...")


def load_rows() -> list[dict[str, str]]:
    with INPUT.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def select_rows(rows: list[dict[str, str]], limit: int = 100) -> list[dict[str, str]]:
    ready = [row for row in rows if is_ready(row)]
    ready.sort(key=candidate_score, reverse=True)

    selected: list[dict[str, str]] = []
    seen_urls: set[str] = set()
    seen_authors: set[tuple[str, str]] = set()
    by_industry: defaultdict[str, list[dict[str, str]]] = defaultdict(list)
    for row in ready:
        by_industry[row.get("industry_label", "")].append(row)

    def maybe_add(row: dict[str, str]) -> bool:
        url = row.get("source_url", "").strip().lower()
        author_key = (row.get("industry_label", ""), row.get("author", "").strip().lower())
        if not url or url in seen_urls:
            return False
        if author_key[1] and author_key in seen_authors:
            return False
        selected.append(row)
        seen_urls.add(url)
        if author_key[1]:
            seen_authors.add(author_key)
        return True

    for industry, quota in INDUSTRY_QUOTAS.items():
        added = 0
        for row in by_industry.get(industry, []):
            if maybe_add(row):
                added += 1
            if added >= quota:
                break

    for row in ready:
        if len(selected) >= limit:
            break
        maybe_add(row)

    selected = selected[:limit]
    selected.sort(key=candidate_score, reverse=True)
    return selected


def render_output(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    rendered: list[dict[str, str]] = []
    for rank, row in enumerate(rows, 1):
        priority = "P0" if rank <= 20 else "P1" if rank <= 60 else "P2"
        rendered.append(
            {
                "rank": str(rank),
                "priority": priority,
                "industry_label": row.get("industry_label", ""),
                "quality_score": row.get("quality_score", ""),
                "source": row.get("source", ""),
                "platform": row.get("platform", ""),
                "author": row.get("author", ""),
                "source_url": row.get("source_url", ""),
                "published_at": row.get("published_at", ""),
                "title": best_title(row),
                "signal_summary": signal_summary(row),
                "recommended_offer": row.get("recommended_offer", ""),
                "first_message": contact_message(row),
                "next_action": "Open source URL, verify the poster is a real buyer, then send the sample-first message.",
            }
        )
    return rendered


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)


def write_md(path: Path, rows: list[dict[str, str]], source_count: int, ready_count: int) -> None:
    by_industry = Counter(row["industry_label"] for row in rows)
    lines = [
        "# LeadPulse strict outreach queue",
        "",
        f"- Source file: `{INPUT.relative_to(PROJECT_ROOT)}`",
        f"- Source rows: {source_count}",
        f"- Strict ready rows after second-stage filter: {ready_count}",
        f"- Queue rows: {len(rows)}",
        "",
        "## Industry mix",
    ]
    lines.extend(f"- {industry}: {count}" for industry, count in by_industry.most_common())
    lines.extend(["", f"## First {min(20, len(rows))} to contact today", ""])
    for row in rows[:20]:
        lines.extend(
            [
                f"### {row['rank']}. {row['industry_label']} | {row['author']}",
                f"- URL: {row['source_url']}",
                f"- Signal: {row['signal_summary']}",
                f"- Message: {row['first_message']}",
                "",
            ]
        )
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    if not INPUT.exists():
        raise SystemExit(f"missing input: {INPUT}")
    source_rows = load_rows()
    strict_rows = [row for row in source_rows if is_ready(row)]
    selected = select_rows(source_rows)
    output_rows = render_output(selected)

    write_csv(OUT_CSV, output_rows)
    write_csv(TODAY_CSV, output_rows[:20])
    write_md(OUT_MD, output_rows, len(source_rows), len(strict_rows))

    print(f"source_rows={len(source_rows)}")
    print(f"strict_ready_rows={len(strict_rows)}")
    print(f"queue_rows={len(output_rows)}")
    print(f"today_rows={min(20, len(output_rows))}")
    print(f"wrote={OUT_CSV.relative_to(PROJECT_ROOT)}")
    print(f"wrote={TODAY_CSV.relative_to(PROJECT_ROOT)}")
    print(f"wrote={OUT_MD.relative_to(PROJECT_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
