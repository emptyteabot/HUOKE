#!/usr/bin/env python3
"""
OpenClaw multi-platform BD hunter.

Targets:
- X
- LinkedIn
- Reddit
- TikTok

What it does:
1) Search by label keywords (e.g. UI/UX Agency Founder, SEO Agency Owner).
2) Extract public profile/post signals + public contact clues (email/social).
3) Generate cold-email drafts (LLM if key available, otherwise template fallback).

This script does NOT auto-send any message.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
from urllib.parse import quote


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT_DIR = PROJECT_ROOT / "data" / "openclaw" / "bd_hunter"

DEFAULT_LABELS = [
    "UI/UX Agency Founder",
    "SEO Agency Owner",
]

DEFAULT_PLATFORMS = ["x", "linkedin", "reddit", "tiktok"]

DEFAULT_LEO_RULES = (
    "pain-first, concise, no fluff, one clear CTA for a 15-minute demo, "
    "mention lead quality filtering and wasted discovery-call cost"
)

DEFAULT_PRODUCT_CONTEXT = (
    "LeadPulse captures high-intent prospects from public platform posts and comments, "
    "filters out noise and competitor accounts, and turns them into a contactable lead list."
)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", re.I)
URL_RE = re.compile(r"https?://[^\s)>\"]+", re.I)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


def parse_csv_list(raw: str, default_values: List[str]) -> List[str]:
    rows = [normalize_space(x) for x in str(raw or "").split(",") if normalize_space(x)]
    return rows if rows else list(default_values)


def ensure_base_import():
    if str(PROJECT_ROOT) not in sys.path:
        sys.path.insert(0, str(PROJECT_ROOT))
    import openclaw_lead_acquisition as base

    return base


def search_url(platform: str, label: str) -> str:
    q = quote(label)
    p = platform.lower()
    if p == "x":
        return f"https://x.com/search?q={q}&src=typed_query&f=user"
    if p == "linkedin":
        return f"https://www.linkedin.com/search/results/people/?keywords={q}"
    if p == "reddit":
        return f"https://www.reddit.com/search/?q={q}&sort=new&t=week"
    if p == "tiktok":
        return f"https://www.tiktok.com/search/user?q={q}"
    raise ValueError(f"unsupported platform: {platform}")


def expand_queries(label: str, platform: str) -> List[str]:
    base = normalize_space(label)
    low = base.lower()
    queries = [base]

    if "ui/ux" in low or ("ui" in low and "ux" in low):
        queries.extend(["ui ux agency founder", "design agency founder", "ux agency owner"])
    if "seo" in low:
        queries.extend(["seo agency owner", "seo agency founder", "seo consultant agency"])

    if platform == "x":
        short = normalize_space(re.sub(r"[^a-z0-9 ]+", " ", low))
        if short and short not in [q.lower() for q in queries]:
            queries.append(short)

    out: List[str] = []
    seen = set()
    for q in queries:
        k = q.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(q)
    return out


def extractor_js(platform: str, max_rows: int) -> str:
    if platform == "x":
        return f"""() => {{
  const out = [];
  const seen = new Set();
  const ignore = new Set(['home','explore','notifications','messages','search','settings','compose','i','login','signup','tos']);
  const toAbs = (h) => {{ try {{ return new URL(h, location.origin).href; }} catch (e) {{ return ''; }} }};
  const pickHandle = (url) => {{
    try {{
      const u = new URL(url);
      const seg = (u.pathname || '').replace(/^\\//, '').split('/')[0];
      return seg || '';
    }} catch (e) {{ return ''; }}
  }};

  const cards = Array.from(document.querySelectorAll("div[data-testid='UserCell']"));
  for (const card of cards) {{
    const links = Array.from(card.querySelectorAll("a[href]"));
    let profile = '';
    for (const a of links) {{
      let href = (a.getAttribute('href') || a.href || '').trim();
      if (!href) continue;
      if (href.startsWith('/')) {{
        const seg = href.split('?')[0].split('#')[0].replace(/^\\//,'').split('/')[0];
        if (!seg || seg.includes('@') || ignore.has(seg.toLowerCase()) || seg.includes('/')) continue;
        profile = toAbs('/' + seg);
        break;
      }}
      if (/^https?:\\/\\/(x\\.com|twitter\\.com)\\/[^\\/?#]+$/i.test(href)) {{
        const seg = pickHandle(href).toLowerCase();
        if (seg && !ignore.has(seg)) {{
          profile = href.split('?')[0].split('#')[0];
          break;
        }}
      }}
    }}
    if (!profile || seen.has(profile)) continue;
    seen.add(profile);

    const text = String(card.innerText || '').replace(/\\s+/g, ' ').trim();
    const linksAbs = links.map(a => (a.href || a.getAttribute('href') || '').trim()).filter(Boolean);
    const external = linksAbs.filter(h => /^https?:\\/\\//i.test(h) && !/(x\\.com|twitter\\.com)\\//i.test(h));
    const name = String((card.querySelector("div[dir='ltr'] span")?.innerText || '')).replace(/\\s+/g,' ').trim();
    const handle = pickHandle(profile);
    out.push({{
      platform: 'x',
      profile_url: profile,
      name: name.slice(0, 120),
      handle: handle ? ('@' + handle) : '',
      snippet: text.slice(0, 1000),
      external_links: Array.from(new Set(external)).slice(0, 8)
    }});
    if (out.length >= {max_rows}) break;
  }}

  if (out.length < {max_rows}) {{
    const anchors = Array.from(document.querySelectorAll("a[href^='/']"));
    for (const a of anchors) {{
      const href = String(a.getAttribute('href') || '').trim();
      if (!/^\\/[A-Za-z0-9_]{{1,15}}$/.test(href)) continue;
      const handle = href.slice(1).toLowerCase();
      if (!handle || ignore.has(handle)) continue;
      const profile = toAbs(href);
      if (!profile || seen.has(profile)) continue;
      seen.add(profile);
      const card = a.closest("article,div,li");
      const text = String((card ? card.innerText : a.innerText) || '').replace(/\\s+/g, ' ').trim();
      out.push({{
        platform: 'x',
        profile_url: profile,
        name: '',
        handle: '@' + handle,
        snippet: text.slice(0, 1000),
        external_links: []
      }});
      if (out.length >= {max_rows}) break;
    }}
  }}

  return out;
}}"""

    if platform == "linkedin":
        return f"""() => {{
  const out = [];
  const seen = new Set();
  const toAbs = (h) => {{ try {{ return new URL(h, location.origin).href; }} catch (e) {{ return ''; }} }};
  const anchors = Array.from(document.querySelectorAll("a[href*='/in/'],a[href^='/in/']"));
  for (const a of anchors) {{
    let href = (a.getAttribute('href') || a.href || '').trim();
    if (!href) continue;
    href = toAbs(href).split('?')[0].split('#')[0];
    if (!href.includes('/in/')) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const card = a.closest("li,div.reusable-search__result-container,div.entity-result,div.search-result__info,div");
    const text = String((card ? card.innerText : a.innerText) || '').replace(/\\s+/g, ' ').trim();
    const links = card ? Array.from(card.querySelectorAll("a[href]")) : [];
    const external = links
      .map(x => (x.href || x.getAttribute('href') || '').trim())
      .filter(Boolean)
      .filter(h => /^https?:\\/\\//i.test(h) && !/linkedin\\.com\\//i.test(h));

    out.push({{
      platform: 'linkedin',
      profile_url: href,
      name: String(a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
      handle: '',
      snippet: text.slice(0, 1000),
      external_links: Array.from(new Set(external)).slice(0, 8)
    }});
    if (out.length >= {max_rows}) break;
  }}
  return out;
}}"""

    if platform == "reddit":
        return f"""() => {{
  const out = [];
  const seen = new Set();
  const toAbs = (h) => {{ try {{ return new URL(h, location.origin).href; }} catch (e) {{ return ''; }} }};
  const parseCount = (txt) => {{
    const s = String(txt || '');
    const m = s.match(/([0-9]+(?:\\.[0-9]+)?)\\s*([kKmM])?\\s*(?:comments?|\\u6761\\u8bc4\\u8bba)/i);
    if (!m) return 0;
    const raw = Number(m[1] || 0);
    const unit = String(m[2] || '').toLowerCase();
    let mult = 1;
    if (unit === 'k') mult = 1000;
    else if (unit === 'm') mult = 1000000;
    if (!Number.isFinite(raw)) return 0;
    return Math.round(raw * mult);
  }};

  const anchors = Array.from(document.querySelectorAll("a[href*='/comments/']"));
  for (const a of anchors) {{
    let href = (a.getAttribute('href') || a.href || '').trim();
    if (!href) continue;
    href = toAbs(href).split('?')[0].split('#')[0];
    if (!href.includes('/comments/')) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const card = a.closest("article,div[role='article'],shreddit-post,faceplate-tracker,li,div");
    const text = String((card ? card.innerText : a.innerText) || '').replace(/\\s+/g, ' ').trim();
    const cardLinks = card ? Array.from(card.querySelectorAll("a[href]")) : [];
    const userA = cardLinks.find(x => {{
      const h = String(x.getAttribute('href') || x.href || '');
      return h.includes('/user/') || h.includes('/u/');
    }});
    const userUrl = userA ? toAbs(userA.getAttribute('href') || userA.href || '') : '';

    out.push({{
      platform: 'reddit',
      post_url: href,
      profile_url: userUrl,
      name: '',
      handle: '',
      snippet: text.slice(0, 1000),
      num_comments_hint: parseCount(text),
      external_links: []
    }});
    if (out.length >= {max_rows}) break;
  }}
  return out;
}}"""

    if platform == "tiktok":
        return f"""() => {{
  const out = [];
  const seen = new Set();
  const toAbs = (h) => {{ try {{ return new URL(h, location.origin).href; }} catch (e) {{ return ''; }} }};
  const anchors = Array.from(document.querySelectorAll("a[href*='tiktok.com/@'],a[href^='/@']"));
  for (const a of anchors) {{
    let href = (a.getAttribute('href') || a.href || '').trim();
    if (!href) continue;
    href = toAbs(href).split('?')[0].split('#')[0];
    if (!href.includes('/@')) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    const card = a.closest("div[data-e2e='search-user-item'],div[class*='DivUserContainer'],li,div");
    const text = String((card ? card.innerText : a.innerText) || '').replace(/\\s+/g, ' ').trim();
    const m = href.match(/\\/(@[^\\/?#]+)/);

    out.push({{
      platform: 'tiktok',
      profile_url: href,
      name: String(a.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
      handle: m ? m[1] : '',
      snippet: text.slice(0, 1000),
      external_links: []
    }});
    if (out.length >= {max_rows}) break;
  }}
  return out;
}}"""

    raise ValueError(f"unsupported platform: {platform}")


def extract_emails_and_socials(row: Dict) -> Dict[str, List[str]]:
    bag = " ".join(
        [
            normalize_space(row.get("name", "")),
            normalize_space(row.get("handle", "")),
            normalize_space(row.get("snippet", "")),
            " ".join([normalize_space(x) for x in (row.get("external_links") or [])]),
            normalize_space(row.get("profile_url", "")),
            normalize_space(row.get("post_url", "")),
        ]
    )
    emails = sorted(set(EMAIL_RE.findall(bag)))
    socials = set()

    profile_url = normalize_space(row.get("profile_url", ""))
    post_url = normalize_space(row.get("post_url", ""))
    if profile_url:
        socials.add(profile_url)
    if post_url:
        socials.add(post_url)

    for u in URL_RE.findall(bag):
        lu = u.lower()
        if any(x in lu for x in ("x.com/", "twitter.com/", "linkedin.com/", "reddit.com/", "tiktok.com/")):
            socials.add(u)
    for u in (row.get("external_links") or []):
        u2 = normalize_space(u)
        if u2:
            socials.add(u2)

    return {"emails": emails[:6], "social_accounts": sorted(socials)[:12]}


def label_match_score(label: str, text: str) -> int:
    l = normalize_space(label).lower()
    t = normalize_space(text).lower()
    if not l or not t:
        return 0

    score = 0
    for token in [x for x in re.split(r"[^a-z0-9+/]+", l) if x]:
        if token in t:
            score += 20

    if "agency" in t:
        score += 12
    if "founder" in t or "owner" in t:
        score += 12
    if "ui" in l or "ux" in l:
        if "design" in t or "ux" in t or "ui" in t:
            score += 12
    if "seo" in l and "seo" in t:
        score += 14

    return min(100, score)


def fallback_cold_email(row: Dict, product_context: str) -> Dict[str, str]:
    label = str(row.get("label", "") or "").strip()
    name = str(row.get("name", "") or "").strip() or str(row.get("handle", "") or "").strip() or "there"
    pain = "missing high-intent prospects that are already asking for solutions in public"
    if "agency" in label.lower():
        pain = "needing a steadier stream of contactable prospects without wasting time on low-fit inquiries"
    if "saas" in label.lower():
        pain = "needing more qualified prospects without adding another bloated growth stack"
    if "consult" in label.lower() or "coach" in label.lower():
        pain = "needing lead volume without manually scraping platforms every day"

    subject = "Captured a few high-intent leads you may want"
    body = (
        f"Hi {name},\n\n"
        f"I noticed many {label} teams are dealing with {pain}.\n"
        f"{product_context}\n"
        "If useful, I can send over a small sample pack from the last 48 hours so you can judge quality first.\n\n"
        "Open to seeing the sample?\n"
    )
    return {"subject": subject, "body": body}


def generate_cold_email_llm(row: Dict, args: argparse.Namespace) -> Dict[str, str]:
    api_key = str(args.openai_api_key or "").strip()
    if args.no_llm or not api_key:
        return fallback_cold_email(row, args.product_context)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=args.openai_base_url)
        payload = {
            "prospect": {
                "platform": row.get("platform", ""),
                "label": row.get("label", ""),
                "name": row.get("name", ""),
                "handle": row.get("handle", ""),
                "profile_url": row.get("profile_url", ""),
                "snippet": row.get("snippet", "")[:900],
                "emails": row.get("emails", []),
                "social_accounts": row.get("social_accounts", []),
            },
            "product_context": args.product_context,
            "leo_rules": args.leo_rules,
            "constraints": {
                "language": "English",
                "max_words": 130,
                "tone": "direct and respectful",
                "cta": "ask for a 15-minute demo",
                "output_json": {"subject": "string", "body": "string"},
            },
        }
        resp = client.chat.completions.create(
            model=args.model,
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write outbound B2B cold emails. Return strict JSON only "
                        "with keys: subject, body."
                    ),
                },
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
        )
        txt = (resp.choices[0].message.content or "").strip()
        m = re.search(r"\{[\s\S]*\}", txt)
        if m:
            obj = json.loads(m.group(0))
            subject = normalize_space(obj.get("subject", ""))
            body = str(obj.get("body", "")).strip()
            if subject and body:
                return {"subject": subject[:180], "body": body[:2400]}
    except Exception:
        pass

    return fallback_cold_email(row, args.product_context)


def scan_one_platform(platform: str, labels: List[str], args: argparse.Namespace) -> List[Dict]:
    base = ensure_base_import()
    profile_name = args.browser_profile
    if args.parallel and args.parallel_isolated_profiles:
        profile_name = f"{args.browser_profile}_{platform}"

    browser = base.OpenClawBrowser(browser_profile=profile_name)
    rows: List[Dict] = []
    started = time.monotonic()
    try:
        browser.start()
    except Exception as exc:
        # Some OpenClaw setups emit warnings/no-json on start while browser commands still work.
        # Keep going and attempt direct page operations for better resilience.
        if args.verbose:
            print(f"[WARN] start failed platform={platform}, continue anyway: {exc}")

    for label in labels:
        per_label_count = 0
        queries = expand_queries(label, platform)[: max(1, int(args.max_queries_per_label))]
        for q in queries:
            if int(args.max_runtime_sec) > 0 and (time.monotonic() - started) > int(args.max_runtime_sec):
                if args.verbose:
                    print(f"[WARN] runtime budget hit platform={platform}, partial_rows={len(rows)}")
                return rows
            if per_label_count >= int(args.max_results_per_label):
                break
            tab = None
            target_id = ""
            url = search_url(platform, q)
            try:
                tab = browser.open(url)
                target_id = str(tab.get("targetId", "") or "")
                if not target_id:
                    continue
                browser.wait_load(target_id)
                browser.wait_ms(target_id, 700)
                try:
                    browser.press(target_id, "PageDown")
                    browser.wait_ms(target_id, 450)
                except Exception:
                    pass

                data = browser.evaluate(
                    target_id,
                    extractor_js(platform, max_rows=max(3, int(args.max_results_per_label))),
                    timeout=max(20, int(args.scan_timeout_sec)),
                )
                if not isinstance(data, list):
                    if args.verbose:
                        print(f"[INFO] platform={platform} label={label} q={q} added=0(non-list)")
                    continue

                added = 0
                for row in data:
                    if not isinstance(row, dict):
                        continue
                    row["platform"] = platform
                    row["label"] = label
                    row["search_query"] = q
                    row["search_url"] = url
                    row["collected_at"] = now_iso()
                    rows.append(row)
                    per_label_count += 1
                    added += 1
                    if per_label_count >= int(args.max_results_per_label):
                        break
                if args.verbose:
                    print(f"[INFO] platform={platform} label={label} q={q} added={added} label_total={per_label_count}")
            except Exception as exc:
                if args.verbose:
                    print(f"[WARN] scan failed platform={platform} label={label} q={q}: {exc}")
                continue
            finally:
                try:
                    if target_id:
                        browser.close(target_id)
                except Exception:
                    pass
            time.sleep(max(0.05, float(args.pause_sec)))

    return rows


def dedupe_rows(rows: List[Dict]) -> List[Dict]:
    out: List[Dict] = []
    seen = set()
    for row in rows:
        key = (
            normalize_space(row.get("platform", "")),
            normalize_space(row.get("profile_url", "")),
            normalize_space(row.get("post_url", "")),
            normalize_space(row.get("label", "")),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(row)
    return out


def enrich_and_generate(rows: List[Dict], args: argparse.Namespace) -> List[Dict]:
    out: List[Dict] = []
    for row in rows:
        text = " ".join(
            [
                normalize_space(row.get("name", "")),
                normalize_space(row.get("handle", "")),
                normalize_space(row.get("snippet", "")),
                normalize_space(row.get("label", "")),
            ]
        )
        score = label_match_score(str(row.get("label", "")), text)
        if score < int(args.min_label_score):
            continue

        contacts = extract_emails_and_socials(row)
        row["emails"] = contacts["emails"]
        row["social_accounts"] = contacts["social_accounts"]
        row["label_score"] = score
        email = generate_cold_email_llm(row, args)
        row["cold_email_subject"] = email["subject"]
        row["cold_email_body"] = email["body"]
        out.append(row)

    out.sort(key=lambda x: int(x.get("label_score", 0)), reverse=True)
    return out


def write_outputs(rows: List[Dict], out_dir: Path) -> Dict[str, str]:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    j = out_dir / f"bd_hunter_{ts}.json"
    c = out_dir / f"bd_hunter_{ts}.csv"
    latest_j = out_dir / "bd_hunter_latest.json"
    latest_c = out_dir / "bd_hunter_latest.csv"

    payload = {"generated_at": now_iso(), "count": len(rows), "rows": rows}
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    j.write_text(text, encoding="utf-8")

    # Incremental latest: merge current cycle rows with existing latest rows.
    merged: List[Dict] = []
    seen = set()

    def _key(row: Dict) -> str:
        return "|".join(
            [
                normalize_space(row.get("platform", "")).lower(),
                normalize_space(row.get("profile_url", "")).lower(),
                normalize_space(row.get("post_url", "")).lower(),
                normalize_space(row.get("label", "")).lower(),
            ]
        )

    for row in rows:
        if not isinstance(row, dict):
            continue
        k = _key(row)
        if k in seen:
            continue
        seen.add(k)
        merged.append(dict(row))

    if latest_j.exists():
        try:
            old_obj = json.loads(latest_j.read_text(encoding="utf-8", errors="ignore") or "{}")
            old_rows = old_obj.get("rows", []) if isinstance(old_obj, dict) else []
            for row in old_rows if isinstance(old_rows, list) else []:
                if not isinstance(row, dict):
                    continue
                k = _key(row)
                if k in seen:
                    continue
                seen.add(k)
                merged.append(dict(row))
        except Exception:
            pass

    merged.sort(key=lambda x: str(x.get("collected_at", "")), reverse=True)
    merged = merged[:5000]

    by_platform: Dict[str, int] = {}
    for row in merged:
        p = str(row.get("platform", "")).strip().lower() or "unknown"
        by_platform[p] = by_platform.get(p, 0) + 1

    latest_payload = {
        "generated_at": now_iso(),
        "count": len(merged),
        "by_platform": by_platform,
        "rows": merged,
    }
    latest_j.write_text(json.dumps(latest_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    fields = [
        "platform",
        "label",
        "name",
        "handle",
        "profile_url",
        "post_url",
        "emails",
        "social_accounts",
        "label_score",
        "snippet",
        "cold_email_subject",
        "cold_email_body",
        "search_query",
        "search_url",
        "collected_at",
    ]
    # snapshot csv for current cycle
    for path in (c,):
        with path.open("w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for row in rows:
                line = {k: row.get(k, "") for k in fields}
                line["emails"] = "; ".join(row.get("emails", []))
                line["social_accounts"] = "; ".join(row.get("social_accounts", []))
                w.writerow(line)

    # cumulative latest csv
    with latest_c.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for row in merged:
            line = {k: row.get(k, "") for k in fields}
            line["emails"] = "; ".join(row.get("emails", []))
            line["social_accounts"] = "; ".join(row.get("social_accounts", []))
            w.writerow(line)

    return {
        "json": str(j),
        "csv": str(c),
        "json_latest": str(latest_j),
        "csv_latest": str(latest_c),
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="OpenClaw parallel BD hunter")
    p.add_argument("--platforms", default=",".join(DEFAULT_PLATFORMS))
    p.add_argument("--labels", default=",".join(DEFAULT_LABELS))
    p.add_argument("--max-results-per-label", type=int, default=12)
    p.add_argument("--max-queries-per-label", type=int, default=2)
    p.add_argument("--scan-timeout-sec", type=int, default=35)
    p.add_argument("--max-runtime-sec", type=int, default=180)
    p.add_argument("--pause-sec", type=float, default=0.2)
    p.add_argument("--min-label-score", type=int, default=22)
    p.add_argument("--browser-profile", default="openclaw")
    p.add_argument("--parallel", action="store_true")
    p.add_argument("--max-workers", type=int, default=4)
    p.add_argument("--parallel-isolated-profiles", action="store_true")
    p.add_argument("--checkpoint-each-platform", action="store_true")
    p.add_argument("--loop", action="store_true")
    p.add_argument("--interval-minutes", type=int, default=10)
    p.add_argument("--verbose", action="store_true")
    p.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR))

    p.add_argument("--leo-rules", default=DEFAULT_LEO_RULES)
    p.add_argument("--product-context", default=DEFAULT_PRODUCT_CONTEXT)
    p.add_argument("--no-llm", action="store_true")
    p.add_argument("--openai-api-key", default=os.getenv("OPENAI_API_KEY", ""))
    p.add_argument("--openai-base-url", default=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
    p.add_argument("--model", default=os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    return p.parse_args()


def main() -> int:
    args = parse_args()
    platforms = [x.lower() for x in parse_csv_list(args.platforms, DEFAULT_PLATFORMS)]
    labels = parse_csv_list(args.labels, DEFAULT_LABELS)
    platforms = [p for p in platforms if p in {"x", "linkedin", "reddit", "tiktok"}]
    if not platforms:
        print("[ERR] no valid platforms")
        return 2

    interval_sec = max(120, int(args.interval_minutes) * 60)
    while True:
        all_rows: List[Dict] = []
        if args.parallel and len(platforms) > 1:
            workers = max(1, min(int(args.max_workers), len(platforms)))
            with ThreadPoolExecutor(max_workers=workers) as ex:
                futs = {ex.submit(scan_one_platform, p, labels, args): p for p in platforms}
                for fut in as_completed(futs):
                    p = futs[fut]
                    try:
                        all_rows.extend(fut.result())
                    except Exception as exc:
                        print(f"[WARN] platform failed: {p}: {exc}", flush=True)
        else:
            for p in platforms:
                part = scan_one_platform(p, labels, args)
                all_rows.extend(part)
                if args.checkpoint_each_platform:
                    deduped_ck = dedupe_rows(all_rows)
                    final_ck = enrich_and_generate(deduped_ck, args)
                    paths_ck = write_outputs(final_ck, Path(args.out_dir))
                    ck = {
                        "at": now_iso(),
                        "checkpoint": True,
                        "after_platform": p,
                        "raw_rows": len(all_rows),
                        "deduped_rows": len(deduped_ck),
                        "final_rows": len(final_ck),
                        "outputs": paths_ck,
                    }
                    print(json.dumps(ck, ensure_ascii=False), flush=True)

        deduped = dedupe_rows(all_rows)
        final_rows = enrich_and_generate(deduped, args)
        paths = write_outputs(final_rows, Path(args.out_dir))

        by_platform: Dict[str, int] = {}
        for row in final_rows:
            p = str(row.get("platform", ""))
            by_platform[p] = by_platform.get(p, 0) + 1

        summary = {
            "at": now_iso(),
            "platforms": platforms,
            "labels": labels,
            "parallel": bool(args.parallel),
            "raw_rows": len(all_rows),
            "deduped_rows": len(deduped),
            "final_rows": len(final_rows),
            "by_platform": by_platform,
            "llm_mode": "off" if args.no_llm or not str(args.openai_api_key or "").strip() else args.model,
            "outputs": paths,
        }
        print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
        if not args.loop:
            return 0
        time.sleep(interval_sec)


if __name__ == "__main__":
    raise SystemExit(main())
