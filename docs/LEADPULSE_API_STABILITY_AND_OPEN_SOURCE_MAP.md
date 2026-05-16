# LeadPulse API Stability and Open Source Replacement Map

This is the current engineering map for replacing fragile LeadPulse surfaces with mature open-source building blocks.

## P0: Keep Stable Now

| Surface | Current State | Risk | Replacement / Hardening |
| --- | --- | --- | --- |
| Payment callback | FastAPI + Xunhupay signature + idempotent wallet credit | High business risk if changed casually | Keep custom, add real DB backup and callback replay job |
| Credit ledger | SQLite-backed wallet | Good enough for early sales | Move to Postgres with row-level transaction locks before scale |
| Lead scoring schema | Pydantic strict models | Good | Keep Pydantic; optionally add instructor/outlines only for LLM JSON enforcement |
| MCP/REST API | FastAPI with strict schemas | Good | Keep FastAPI; add OpenAPI schema snapshot tests |
| Frontend proxy | Next.js proxy to M2M backend | Good | Keep, but add uptime check for `/api/v2/sources/providers` and payment routes |

## Data Acquisition

| Job | Use This | Why |
| --- | --- | --- |
| X, Reddit, HackerNews, YouTube public source pumping | feedgrab | Already normalizes output into Markdown suitable for LLM/scoring |
| Non-standard forum/page extraction | Scrapling | Python-native extraction, browser-capable worker path, adaptive selectors |
| Simple RSS/news polling | feedparser or feedgrab | Keep cheap and deterministic |
| Queueing scheduled crawls | APScheduler for MVP, Celery/RQ later | Cron-like worker first, queue when volume grows |

## AI and Scoring

| Job | Use This | Why |
| --- | --- | --- |
| JSON guarantee | Pydantic first, instructor/outlines later | Current deterministic scoring already avoids schema crash |
| Long-context intent scoring | DeepSeek/Gemini/OpenAI behind one adapter | Vendor-switchable; never scatter model calls across handlers |
| Ranking/reranking | sentence-transformers or bge-reranker later | Only after there is enough labeled data |

## Delivery and Operations

| Job | Use This | Why |
| --- | --- | --- |
| CRM/webhook push | Existing webhook + retry table | Do not lose paid signals |
| Email delivery | Resend/Postmark | Better deliverability than custom SMTP |
| Observability | Sentry + Uptime Kuma | Catch checkout, callback, and scoring failures early |
| Background jobs | RQ/Celery + Redis once volume rises | Avoid doing crawl/LLM work inside request lifecycle |
| Persistent DB | Postgres/Supabase | Required before real team usage |

## Near-Term Execution Order

1. Keep payment and wallet code stable; do not rewrite for style.
2. Add Feedgrab Markdown ingestion as the public-source pump.
3. Add Scrapling as an optional worker dependency, not a hard web dependency.
4. Add callback replay and paid-order reconciliation.
5. Add API contract tests for OpenAPI and MCP tool count.
6. Move ledger and orders from SQLite to Postgres when real paid usage starts.

The principle: replace fragile commodity layers with open-source projects, but keep LeadPulse's proprietary part as the scoring, credit deduction, and Qualified Meeting routing contract.
