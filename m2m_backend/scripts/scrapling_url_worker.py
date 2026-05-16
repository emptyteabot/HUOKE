from __future__ import annotations

import argparse
import json
from pathlib import Path

import requests


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch URLs through LeadPulse Scrapling endpoint and print qualified signals.")
    parser.add_argument("--url", action="append", default=[], help="URL to fetch. Can be repeated.")
    parser.add_argument("--url-file", default="", help="Text file with one URL per line.")
    parser.add_argument("--api", default="https://leadpulseagi.com", help="LeadPulse site or backend URL.")
    parser.add_argument("--mode", choices=["fetcher", "dynamic", "stealthy"], default="fetcher")
    parser.add_argument("--selector", default="")
    parser.add_argument("--min-budget-usd", type=float, default=3000.0)
    parser.add_argument("--token", default="", help="Optional LeadPulse M2M bearer token.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    urls = list(args.url)
    if args.url_file:
        urls.extend(
            line.strip()
            for line in Path(args.url_file).expanduser().read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        )
    if not urls:
        raise SystemExit("No URLs supplied.")

    headers = {"Content-Type": "application/json"}
    if args.token:
        headers["Authorization"] = f"Bearer {args.token}"

    endpoint = f"{args.api.rstrip('/')}/api/v2/sources/scrapling/fetch"
    for url in urls:
        response = requests.post(
            endpoint,
            json={
                "url": url,
                "source": "scrapling",
                "selector": args.selector,
                "mode": args.mode,
                "min_budget_usd": args.min_budget_usd,
            },
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
