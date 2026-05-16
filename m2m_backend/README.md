# LeadPulse M2M Backend

LeadPulse V2 exposes one vertical machine-to-machine pipeline:

1. Dynamic budget interview
2. Budget and authority scoring
3. Discovery-call availability
4. Booking submission

It deliberately does not expose generic form templates, surveys, HR forms, file uploads, or logic-tree funnels.

## Local Run

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn leadpulse_m2m.main:app --host 127.0.0.1 --port 8008
```

Linux:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn leadpulse_m2m.main:app --host 127.0.0.1 --port 8008
```

## Public Endpoints

- `GET /.well-known/mcp.json`
- `POST /mcp`
- `POST /api/mcp`
- `GET /api/v2/tools`
- `POST /api/v2/scoring`
- `POST /api/v2/funnel/next-question`
- `GET|POST /api/v2/availability`
- `POST /api/v2/booking`
- `POST /api/v2/qualify-and-book`
- `GET /api/v2/sources/providers`
- `POST /api/v2/sources/feedgrab/ingest`
- `POST /api/v2/sources/score`
- `POST /api/v2/sources/scrapling/fetch`

If `LEADPULSE_M2M_API_KEY` is set, POST/REST tool APIs require `Authorization: Bearer <key>`. If it is unset, the gateway is open for external agent routing.

## Public Source Ingestion

Feedgrab and Scrapling are connected as adapters, not vendored into the web service.

- Feedgrab should run as a source worker and POST its Markdown output to `/api/v2/sources/feedgrab/ingest`.
- Feedgrab worker dependencies live in `requirements-workers.txt`.
- Xiaohongshu should use the worker login/session path, for example `CHROME_CDP_LOGIN=true feedgrab login xhs`, then `feedgrab xhs-so "<keyword>" --limit 50 --save`.
- Scrapling is optional on worker nodes. Install it with `pip install "scrapling[all]" && scrapling install`, then use `/api/v2/sources/scrapling/fetch` for non-standard pages.

See `../docs/DATA_SOURCE_INGESTION.md` for the exact runbook.
