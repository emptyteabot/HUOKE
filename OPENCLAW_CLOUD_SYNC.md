# OpenClaw Local -> Cloud Realtime Sync

Goal: continuously read local OpenClaw outputs and sync filtered leads to Supabase so the web app can show them in realtime.

## 1. Environment Variables

```powershell
$env:SUPABASE_URL="your Supabase URL"
$env:SUPABASE_KEY="your Supabase Key"
$env:SYNC_USER_EMAIL="your app login email"
$env:SYNC_HEARTBEAT_PATH="data/openclaw/sync_heartbeat.json"
```

## 2. Start Continuous Sync

```powershell
python .\openclaw_realtime_sync.py --user-email $env:SYNC_USER_EMAIL --loop --interval 20 --min-score 60 --max-rows 500 --heartbeat-path $env:SYNC_HEARTBEAT_PATH
```

Notes:
- Competitor-like rows are excluded by default.
- Default interval is 20 seconds.
- Dedup is based on `external_id`.
- Exponential backoff is applied on repeated errors.

## 3. Web Visibility

The web workspace can show:
- `Acquisition`: synced source `supabase_synced` and heartbeat status.
- `Lead Pool`: imported leads.

Guest auto-login is enabled by default (`ENABLE_GUEST_AUTOLOGIN=true`).

## 4. One-Time Debug Sync

```powershell
python .\openclaw_realtime_sync.py --user-email $env:SYNC_USER_EMAIL --min-score 60 --max-rows 200
```

## 5. Heartbeat File

Path: `data/openclaw/sync_heartbeat.json`

Key fields:
- `status`: `ok` or `error`
- `loop_count`
- `last_success_at`
- `last_error`
- `error_streak`
