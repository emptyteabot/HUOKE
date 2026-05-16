# LeadPulse Public Source Ingestion

LeadPulse now treats public discussions as a first-class input layer before scoring and booking.

## Runtime Roles

- `feedgrab`: primary public-source pump for X/Twitter, Reddit, HackerNews, YouTube, RSS, and simple forum URLs. LeadPulse consumes its Markdown output instead of vendoring its internals.
- `Scrapling`: optional generic extraction engine for non-standard vertical forums, directory pages, niche blogs, and pages that need a browser-backed parser.
- `LeadPulse scoring`: the only place that decides whether a source item becomes a paid high-value signal.

## API Surface

- `GET /api/v2/sources/providers`
- `POST /api/v2/sources/feedgrab/ingest`
- `POST /api/v2/sources/score`
- `POST /api/v2/sources/scrapling/fetch`

The public website proxies these through the same paths on `https://leadpulseagi.com`.

## Feedgrab Flow

Run feedgrab outside the LeadPulse web process, then post generated Markdown into LeadPulse:

```bash
feedgrab x-so "looking for agency" --days 1 --save
feedgrab reddit-sub SaaS
feedgrab xhs-so "代运营 报价" --limit 50 --save
```

For Xiaohongshu, use feedgrab's own login/session flow on the worker node:

```bash
CHROME_CDP_LOGIN=true feedgrab login xhs
feedgrab xhs-so "找代运营 预算" --limit 50 --save
feedgrab "https://www.xiaohongshu.com/user/profile/<profile-id>"
```

On Windows, see `docs/XHS_LOGIN_WINDOWS.md` for the PowerShell path using `.venv-public-sources\Scripts\feedgrab.exe`.

Keep cookies and logged-in browser profiles on the worker host. Do not put them in Git.

Then send each Markdown document:

```bash
curl -X POST https://leadpulseagi.com/api/v2/sources/feedgrab/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "min_budget_usd": 3000,
    "max_results": 10,
    "documents": [
      {
        "source": "feedgrab",
        "markdown": "---\ntitle: Looking for agency\nsource: reddit\nurl: https://example.test/thread\ncompany: Example SaaS\n---\n\nFounder here. Need an agency this week. Budget USD 8500. Email founder@example.com."
      }
    ]
  }'
```

For a directory produced by feedgrab:

```bash
python m2m_backend/scripts/ingest_feedgrab_output.py \
  --dir ./output \
  --api https://leadpulseagi.com \
  --limit 50
```

Or run feedgrab and ingestion in one step:

```bash
python m2m_backend/scripts/run_feedgrab_query.py \
  --api https://leadpulseagi.com \
  --min-budget-usd 3000 \
  xhs-so "找代运营 预算" --limit 50
```

LeadPulse returns sorted results with:

- `qualified_signal`
- `meeting_ready`
- `charge_event`: `noise` or `high_value`
- strict scoring output including budget evidence and next action

## Scrapling Flow

Scrapling is optional on the worker node. Install it only where browser extraction is needed:

```bash
pip install "scrapling[all]"
scrapling install
```

Use the fetch endpoint for one-off extraction and scoring:

```bash
curl -X POST https://leadpulseagi.com/api/v2/sources/scrapling/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/forum/thread",
    "mode": "fetcher",
    "source": "scrapling",
    "min_budget_usd": 3000
  }'
```

For a URL batch:

```bash
python m2m_backend/scripts/scrapling_url_worker.py \
  --api https://leadpulseagi.com \
  --mode fetcher \
  --url-file ./forum_urls.txt
```

Browser, proxy, and target-specific settings should live in worker deployment config, not public request payloads.

## Why Not Vendor Third-Party Fetchers

Scrapling is BSD-3-Clause and feedgrab is MIT, so both are usable. The safer engineering boundary is still adapter-based:

- lower merge conflict risk
- easier upstream upgrades
- no accidental secret/cookie leakage into the main repo
- no product outage when one platform changes its private API

If a source becomes mission-critical, promote it into a separate worker package with its own tests, cookies, proxies, and rate-limit policies.
