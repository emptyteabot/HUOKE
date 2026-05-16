# LeadPulse Public Source Workers

Small worker scripts for collecting public buying signals with feedgrab and optional Scrapling, then posting them into the LeadPulse M2M source endpoints. These files are separate from `ops/public_deploy` and do not deploy or restart the web app.

## Setup

Create a dedicated worker venv:

```bash
bash ops/public_sources/setup_worker_venv.sh
```

The script creates `.venv-public-sources`, installs feedgrab from GitHub with:

```bash
pip install "git+https://github.com/iBigQiang/feedgrab.git"
```

Install Scrapling only on workers that need browser-backed extraction:

```bash
INSTALL_SCRAPLING=1 bash ops/public_sources/setup_worker_venv.sh
```

## Configuration

Set runtime values in the process environment, a systemd unit, or cron. Do not commit secrets.

```bash
export LEADPULSE_API_URL="https://leadpulseagi.com"
export LEADPULSE_M2M_API_KEY="..."  # optional; required only when the M2M backend enforces it
export MIN_BUDGET_USD=3000
export MAX_RESULTS=10
```

## Manual Runs

X search pipeline:

```bash
PIPELINE=x QUERY='need B2B lead generation agency' \
  bash ops/public_sources/run_feedgrab_pipeline.sh
```

Reddit search pipeline:

```bash
PIPELINE=reddit QUERY='looking for outbound lead generation agency' \
  bash ops/public_sources/run_feedgrab_pipeline.sh
```

XHS keyword pipeline:

```bash
PIPELINE=xhs QUERY='lead generation growth' LIMIT=50 \
  bash ops/public_sources/run_feedgrab_pipeline.sh
```

XHS profile or note URL:

```bash
PIPELINE=xhs FEEDGRAB_TARGET='https://www.xiaohongshu.com/user/profile/<id>' \
  bash ops/public_sources/run_feedgrab_pipeline.sh
```

Scrapling fallback URL fetch:

```bash
URL='https://example.com/forum/thread' MODE=fetcher \
  bash ops/public_sources/run_scrapling_fetch.sh
```

All feedgrab runs POST Markdown documents to:

```text
POST /api/v2/sources/feedgrab/ingest
```

Scrapling URL fetches POST to:

```text
POST /api/v2/sources/scrapling/fetch
```

## Cron Examples

Use absolute repo paths in cron. Inject `LEADPULSE_M2M_API_KEY` from the host secret manager only if the endpoint requires auth; do not write real tokens into this repository.

```cron
LEADPULSE_API_URL=https://leadpulseagi.com
REPO=/var/www/LeadPulse

*/30 * * * * cd $REPO && PIPELINE=x QUERY='need B2B lead generation agency' bash ops/public_sources/run_feedgrab_pipeline.sh >> /var/log/leadpulse-public-sources.log 2>&1
15 * * * * cd $REPO && PIPELINE=reddit QUERY='looking for outbound lead generation agency' bash ops/public_sources/run_feedgrab_pipeline.sh >> /var/log/leadpulse-public-sources.log 2>&1
45 */2 * * * cd $REPO && PIPELINE=xhs QUERY='lead generation growth' LIMIT=50 bash ops/public_sources/run_feedgrab_pipeline.sh >> /var/log/leadpulse-public-sources.log 2>&1
5 */6 * * * cd $REPO && URL='https://example.com/forum/thread' MODE=fetcher bash ops/public_sources/run_scrapling_fetch.sh >> /var/log/leadpulse-public-sources.log 2>&1
```

For local testing against the M2M backend:

```bash
LEADPULSE_API_URL=http://127.0.0.1:8008 PIPELINE=reddit QUERY='lead generation help' \
  bash ops/public_sources/run_feedgrab_pipeline.sh
```
