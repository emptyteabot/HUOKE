from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Any

import requests


DEFAULT_JOBS = [
    {
        "name": "reddit_saas",
        "args": ["reddit-sub", "SaaS", "--sort", "new", "--limit", "25"],
    },
    {
        "name": "reddit_entrepreneur",
        "args": ["reddit-sub", "Entrepreneur", "--sort", "new", "--limit", "25"],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run public-source collection jobs and push the summary to Feishu.")
    parser.add_argument("--api", default=os.getenv("LEADPULSE_API_URL", "https://leadpulseagi.com"))
    parser.add_argument("--token", default=os.getenv("LEADPULSE_M2M_API_KEY", ""))
    parser.add_argument("--min-budget-usd", type=float, default=float(os.getenv("MIN_BUDGET_USD", "3000")))
    parser.add_argument("--max-results", type=int, default=int(os.getenv("MAX_RESULTS", "10")))
    parser.add_argument("--feishu-webhook", default=os.getenv("LEADPULSE_FEISHU_WEBHOOK_URL", ""))
    parser.add_argument("--feedgrab-bin", default=os.getenv("FEEDGRAB_BIN", "feedgrab"))
    parser.add_argument("--jobs-json", default=os.getenv("LEADPULSE_PUBLIC_SOURCE_JOBS", ""))
    return parser.parse_args()


def load_jobs(raw_jobs: str) -> list[dict[str, Any]]:
    if not raw_jobs.strip():
        return list(DEFAULT_JOBS)
    payload = json.loads(raw_jobs)
    jobs: list[dict[str, Any]] = []
    for index, job in enumerate(payload):
        args = [str(part) for part in job.get("args", [])]
        if not args:
            raise SystemExit(f"Job {index} is missing args")
        jobs.append(
            {
                "name": str(job.get("name") or f"job_{index + 1}"),
                "args": args,
            }
        )
    return jobs


def collect_markdown(root: Path) -> list[dict[str, str]]:
    return [
        {"source": "feedgrab", "markdown": path.read_text(encoding="utf-8", errors="ignore")}
        for path in sorted(root.rglob("*.md"), key=lambda path: path.stat().st_mtime, reverse=True)
        if path.is_file()
    ]


def run_job(
    *,
    feedgrab_bin: str,
    api: str,
    token: str,
    min_budget_usd: float,
    max_results: int,
    job: dict[str, Any],
) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix=f"leadpulse-{job['name']}-") as temp_dir:
        output_dir = Path(temp_dir)
        command = [feedgrab_bin, *job["args"], "--save", "--output", str(output_dir)]
        completed = subprocess.run(command, capture_output=True, text=True)
        if completed.returncode != 0:
            return {
                "name": job["name"],
                "ok": False,
                "error": completed.stderr.strip() or completed.stdout.strip() or "feedgrab failed",
            }

        documents = collect_markdown(output_dir)
        if not documents:
            return {
                "name": job["name"],
                "ok": True,
                "received": 0,
                "qualified_signal_count": 0,
                "meeting_ready_count": 0,
                "results": [],
            }

        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        response = requests.post(
            f"{api.rstrip('/')}/api/v2/sources/feedgrab/ingest",
            json={
                "documents": documents,
                "min_budget_usd": min_budget_usd,
                "max_results": max_results,
            },
            headers=headers,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        payload["name"] = job["name"]
        payload["ok"] = True
        return payload


def push_feishu(webhook: str, job_results: list[dict[str, Any]]) -> None:
    top_lines: list[str] = []
    for job in job_results:
        if not job.get("ok"):
            top_lines.append(f"{job['name']}: failed - {job.get('error', 'unknown error')}")
            continue
        top_lines.append(
            f"{job['name']}: received {job.get('received', 0)}, queued {job.get('queued', 0)}, deduped {job.get('deduped', 0)}, qualified {job.get('qualified_signal_count', 0)}"
        )
        for result in job.get("qualified_meetings", [])[:3]:
            item = result.get("item", {})
            scoring = result.get("scoring", {})
            top_lines.append(
                f"- {item.get('source', '')} | {scoring.get('score', '')} | {item.get('title', '')} | {item.get('url', '')}"
            )

    content = "\n".join(top_lines) if top_lines else "No public-source jobs were executed."
    requests.post(
        webhook,
        json={
            "msg_type": "text",
            "content": {"text": f"LeadPulse 公域线索定时任务\n{content}"},
        },
        timeout=20,
    ).raise_for_status()


def main() -> int:
    args = parse_args()
    api = args.api.strip() or "https://leadpulseagi.com"
    jobs = load_jobs(args.jobs_json)
    results = [
        run_job(
            feedgrab_bin=args.feedgrab_bin,
            api=api,
            token=args.token,
            min_budget_usd=args.min_budget_usd,
            max_results=args.max_results,
            job=job,
        )
        for job in jobs
    ]

    for result in results:
        if result.get("ok"):
            print(
                "{name}: received={received} queued={queued} deduped={deduped} scored={scored} qualified={qualified} meeting_ready={meeting_ready}".format(
                    name=result.get("name", "job"),
                    received=result.get("received", 0),
                    queued=result.get("queued", 0),
                    deduped=result.get("deduped", 0),
                    scored=result.get("scored", 0),
                    qualified=result.get("qualified_signal_count", 0),
                    meeting_ready=result.get("meeting_ready_count", 0),
                )
            )
        else:
            print(f"{result.get('name', 'job')}: failed={result.get('error', 'unknown error')}")

    if args.feishu_webhook.strip():
        push_feishu(args.feishu_webhook, results)

    return 0 if all(result.get("ok") for result in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
