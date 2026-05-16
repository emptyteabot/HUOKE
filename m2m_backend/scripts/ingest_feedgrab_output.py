from __future__ import annotations

import argparse
from pathlib import Path

import requests


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Post feedgrab Markdown output into LeadPulse scoring.")
    parser.add_argument("--dir", required=True, help="Directory containing feedgrab .md files.")
    parser.add_argument("--api", default="https://leadpulseagi.com", help="LeadPulse site or backend URL.")
    parser.add_argument("--min-budget-usd", type=float, default=3000.0)
    parser.add_argument("--max-results", type=int, default=10)
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--token", default="", help="Optional LeadPulse M2M bearer token.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.dir).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Directory not found: {root}")

    paths = sorted(root.rglob("*.md"), key=lambda path: path.stat().st_mtime, reverse=True)[: args.limit]
    documents = [{"source": "feedgrab", "markdown": path.read_text(encoding="utf-8", errors="ignore")} for path in paths]
    if not documents:
        print("No Markdown files found.")
        return 0

    headers = {"Content-Type": "application/json"}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    endpoint = f"{args.api.rstrip('/')}/api/v2/sources/feedgrab/ingest"
    response = requests.post(
        endpoint,
        json={
            "documents": documents,
            "min_budget_usd": args.min_budget_usd,
            "max_results": args.max_results,
        },
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    print(
        "processed={processed} qualified={qualified} meeting_ready={meeting_ready}".format(
            processed=payload.get("scored", 0),
            qualified=payload.get("qualified_signal_count", 0),
            meeting_ready=payload.get("meeting_ready_count", 0),
        )
    )
    for result in payload.get("qualified_meetings", []):
        item = result.get("item", {})
        scoring = result.get("scoring", {})
        print(f"- {scoring.get('score')} {item.get('source')} {item.get('title')} {item.get('url')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
