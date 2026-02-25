# Product Architecture (AI获客增长引擎)

## Goal
Build a web B2B SaaS for study-abroad agencies with an AI-first acquisition funnel.

## Core Loop
1. OpenClaw reads social content and comments.
2. Acquisition pipeline normalizes signals and excludes competitors.
3. High-intent leads are synced to Lead Pool.
4. AI SDR creates personalized outreach (A/B variants).
5. Inbound messages are triaged by AI; high-probability/high-ticket cases are force-handed to human.
6. Analytics computes funnel, channel ROI, CAC, and A/B statistical significance.

## Modules
- `Home.py`: UX layer + orchestration
- `services/analytics_engine.py`: ROI/CAC/funnel/A-B statistics
- `services/sdr_agent.py`: conversion probability + handoff + webhook
- `database.py`: persistence (Supabase or local fallback)
- `billing.py`: Stripe plan gating and subscription state

## Deployment Contract
- Streamlit app path: `streamlit-app/Home.py`
- Browser navigation should only show custom sidebar pages (legacy multipage disabled via `config.toml`).
- Latest lead artifacts consumed from:
  - `data/openclaw/openclaw_leads_latest.csv|json`
  - `data/exports/high_value_leads_latest.csv|json`

## Handoff Events
- Logged in `data/sdr/handoff_events.jsonl`
- Optional webhook dispatch for real-time human takeover
