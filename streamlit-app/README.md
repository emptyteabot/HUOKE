# GuestSeek (Streamlit SaaS)

Vertical B2B SaaS for study-abroad lead generation:
- OpenClaw-first prospect discovery
- AI intent filtering and competitor exclusion
- Personalized outreach + SDR handoff
- Funnel analytics + channel ROI + A/B significance

## App Entry
- Main app: `streamlit-app/Home.py`
- Streamlit config: `streamlit-app/.streamlit/config.toml`

## Product Pages
- `Lead Pack`: one-form order intake, queued processing, CSV outcome delivery
- `Overview`: command center and high-level metrics
- `Acquisition`: ingest OpenClaw exports and sync filtered leads
- `AI SDR`: personalized outreach generation + inbound triage + forced handoff
- `Analytics`: channel ROI/CAC attribution and A/B significance
- `Leads`: lead pool management
- `Billing`: Stripe subscription management

## Architecture
- `Home.py`: UI composition and workflow orchestration
- `services/analytics_engine.py`: funnel/ROI/A-B analytics
- `services/sdr_agent.py`: outreach generation, intent probability, handoff logic
- `database.py`: Supabase + local JSON fallback backend
- `auth.py`: PBKDF2 password hashing and JWT session auth

## Local Run
```bash
cd streamlit-app
pip install -r requirements.txt
streamlit run Home.py
```

## Required Config
Set via Streamlit secrets or environment variables:
- `SUPABASE_URL`, `SUPABASE_KEY` (optional, local fallback works)
- `JWT_SECRET`
- `OPENAI_API_KEY` (optional, fallback copy generation works without it)
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE` (billing)

## Deployment (Streamlit Cloud)
- Repository: `emptyteabot/HUOKE`
- Branch: `main`
- App file: `streamlit-app/Home.py`

If the UI looks stale after push:
1. Open Streamlit Cloud app settings.
2. Confirm app file path is exactly `streamlit-app/Home.py`.
3. Trigger `Reboot app` / `Rerun from latest commit`.
4. Verify latest commit hash matches GitHub.
