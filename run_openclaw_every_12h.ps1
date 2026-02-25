$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$syncEmail = $env:SYNC_USER_EMAIL
if (-not $syncEmail) {
  $syncEmail = ""
}
$keywords = $env:OPENCLAW_KEYWORDS
if (-not $keywords) {
  $keywords = ""
}

$cmd = @(
  "tools/openclaw_halfday_scheduler.py",
  "--loop",
  "--interval-hours", "12",
  "--platforms", "xhs",
  "--xhs-sort-mode", "both",
  "--max-posts-per-keyword", "6",
  "--max-comments-per-post", "30",
  "--enable-funnel-agent",
  "--funnel-min-confidence", "50",
  "--platform-timeout-sec", "900",
  "--global-timeout-sec", "1800",
  "--run-report",
  "--report-platform", "xhs",
  "--report-top-n", "30",
  "--enable-sync",
  "--sync-min-score", "60",
  "--sync-max-rows", "900"
)

if ($syncEmail) {
  $cmd += @("--sync-user-email", $syncEmail)
}
if ($keywords) {
  $cmd += @("--keywords", $keywords)
}

python @cmd
