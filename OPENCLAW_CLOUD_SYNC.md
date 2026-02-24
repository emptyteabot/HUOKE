# OpenClaw 本机 -> 云端实时同步

目标：本机持续读取最新 OpenClaw 抓取结果，实时写入云端 Supabase，网页端可直接看到。

## 1. 环境变量

```powershell
$env:SUPABASE_URL="你的 Supabase URL"
$env:SUPABASE_KEY="你的 Supabase Key"
$env:SYNC_USER_EMAIL="你在网站登录的邮箱"
```

## 2. 启动持续同步

```powershell
python .\openclaw_realtime_sync.py --user-email $env:SYNC_USER_EMAIL --loop --interval 20 --min-score 60 --max-rows 500
```

说明：
- 默认会排除同业机构
- 默认每 20 秒同步一次
- 会自动按 `external_id` 去重，避免重复写入

## 3. 网页查看位置

登录网站后进入：
- `潜客采集`：可看到云端同步来源 `supabase_synced`
- `线索池`：可看到已入库线索

## 4. 单次手动同步（调试）

```powershell
python .\openclaw_realtime_sync.py --user-email $env:SYNC_USER_EMAIL --min-score 60 --max-rows 200
```
