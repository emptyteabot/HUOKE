param(
    [string]$Platform = "xhs",
    [string]$ProspectName = "",
    [string]$Industry = "",
    [string]$Stage = "reply",
    [string]$ProfileContext = "",
    [string]$ChatContext = "",
    [string]$LeadEvidence = "",
    [string]$UserIntent = "",
    [string[]]$ContextFile = @(),
    [switch]$PasteToMuMu,
    [string]$AdbPath = "D:\MuMuPlayer\nx_device\12.0\shell\adb.exe",
    [string]$Device = "127.0.0.1:7555",
    [int]$TapX = 220,
    [int]$TapY = 1555
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$repo = "C:\Users\cyh\HUOKE"
$scriptPath = Join-Path $repo "sales\llm_copy_gate.py"

if (-not (Test-Path $scriptPath)) {
    throw "Missing gate script: $scriptPath"
}

$pyArgs = @(
    $scriptPath,
    "--platform", $Platform,
    "--prospect-name", $ProspectName,
    "--industry", $Industry,
    "--stage", $Stage,
    "--profile-context", $ProfileContext,
    "--chat-context", $ChatContext,
    "--lead-evidence", $LeadEvidence,
    "--user-intent", $UserIntent
)

foreach ($file in $ContextFile) {
    $pyArgs += @("--context-file", $file)
}

$output = & python @pyArgs
$pythonExitCode = $LASTEXITCODE
$raw = ($output | Out-String).Trim()

if (-not $raw) {
    throw "No output from llm_copy_gate.py"
}

$decision = $raw | ConvertFrom-Json
$decision | ConvertTo-Json -Depth 6

if ($pythonExitCode -ne 0 -and $pythonExitCode -ne 2 -and $pythonExitCode -ne 3) {
    throw "llm_copy_gate.py failed with exit code $pythonExitCode"
}

if (-not $decision.should_send) {
    Write-Host ""
    Write-Host "BLOCKED: $($decision.do_not_send_reason)"
    exit 2
}

if ($decision.risk_level -eq "high") {
    Write-Host ""
    Write-Host "BLOCKED: risk_level=high"
    exit 3
}

if (-not $PasteToMuMu) {
    Write-Host ""
    Write-Host "APPROVED_NOT_PASTED"
    exit 0
}

if (-not (Test-Path $AdbPath)) {
    throw "ADB not found: $AdbPath"
}

$text = [string]$decision.message_text
if ([string]::IsNullOrWhiteSpace($text)) {
    throw "Approved decision has empty message_text"
}

$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text))

& $AdbPath -s $Device shell ime enable "com.android.adbkeyboard/.AdbIME" | Out-Null
& $AdbPath -s $Device shell ime set "com.android.adbkeyboard/.AdbIME" | Out-Null
& $AdbPath -s $Device shell input tap $TapX $TapY
Start-Sleep -Milliseconds 300
& $AdbPath -s $Device shell am broadcast -a ADB_CLEAR_TEXT | Out-Null
Start-Sleep -Milliseconds 300
& $AdbPath -s $Device shell am broadcast -a ADB_INPUT_B64 --es msg $b64 | Out-Null
Start-Sleep -Milliseconds 500
& $AdbPath -s $Device shell ime set "com.sohu.inputmethod.sogou.chuizi/com.sohu.inputmethod.sogou.SogouIME" | Out-Null

Write-Host ""
Write-Host "PASTED_NOT_SENT"
exit 0
