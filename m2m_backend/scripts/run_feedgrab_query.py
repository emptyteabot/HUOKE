from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

import requests


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run feedgrab, then send Markdown output to LeadPulse scoring.")
    parser.add_argument("feedgrab_args", nargs=argparse.REMAINDER, help="Arguments passed to feedgrab, for example: xhs-so 代运营 --limit 50")
    parser.add_argument("--api", default="https://leadpulseagi.com", help="LeadPulse site or backend URL.")
    parser.add_argument("--min-budget-usd", type=float, default=3000.0)
    parser.add_argument("--max-results", type=int, default=10)
    parser.add_argument("--token", default="", help="Optional LeadPulse M2M bearer token.")
    parser.add_argument("--keep-output", default="", help="Optional directory to keep generated Markdown files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.feedgrab_args:
        raise SystemExit("Missing feedgrab arguments. Example: python run_feedgrab_query.py xhs-so 代运营 --limit 50")

    with tempfile.TemporaryDirectory(prefix="leadpulse-feedgrab-") as temp_dir:
        output_dir = Path(temp_dir)
        command = ["feedgrab", *args.feedgrab_args, "--save", "--output", str(output_dir)]
        subprocess.run(command, check=True)

        markdown_paths = sorted(output_dir.rglob("*.md"))
        documents = [
            {
                "source": "feedgrab",
                "markdown": path.read_text(encoding="utf-8", errors="ignore"),
            }
            for path in markdown_paths
        ]
        if not documents:
            print("feedgrab finished, but no Markdown files were generated.")
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
            timeout=45,
        )
        response.raise_for_status()
        payload = response.json()

        print(
            "documents={docs} scored={scored} qualified={qualified} meeting_ready={meeting_ready}".format(
                docs=len(documents),
                scored=payload.get("scored", 0),
                qualified=payload.get("qualified_signal_count", 0),
                meeting_ready=payload.get("meeting_ready_count", 0),
            )
        )
        for result in payload.get("qualified_meetings", []):
            item = result.get("item", {})
            scoring = result.get("scoring", {})
            print(f"- score={scoring.get('score')} source={item.get('source')} title={item.get('title')} url={item.get('url')}")

        if args.keep_output:
            destination = Path(args.keep_output).expanduser().resolve()
            destination.mkdir(parents=True, exist_ok=True)
            for path in markdown_paths:
                shutil.copy2(path, destination / path.name)
            print(f"kept_markdown_dir={destination}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
