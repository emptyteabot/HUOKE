[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("x", "twitter", "reddit", "xhs", "xiaohongshu")]
  [string]$Pipeline,
  [string]$Query = "",
  [string]$FeedgrabTarget = "",
  [int]$Limit = 25,
  [int]$XDays = 1,
  [int]$XMinFaves = 0,
  [string]$XSort = "latest",
  [string]$RedditSort = "new",
  [int]$RedditLimit = 25,
  [string]$XhsSort = "latest",
  [int]$XhsLimit = 50,
  [string]$Api = "https://leadpulseagi.com",
  [double]$MinBudgetUsd = 3000,
  [int]$MaxResults = 10,
  [string]$Token = "",
  [string]$KeepOutput = "",
  [string]$VenvDir = ""
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if ([string]::IsNullOrWhiteSpace($VenvDir)) {
  $VenvDir = Join-Path $RepoRoot ".venv-public-sources"
}

$PythonExe = Join-Path $VenvDir "Scripts\python.exe"
$FeedgrabExe = Join-Path $VenvDir "Scripts\feedgrab.exe"
if (-not (Test-Path $PythonExe) -or -not (Test-Path $FeedgrabExe)) {
  throw "Worker venv is missing. Run: powershell -ExecutionPolicy Bypass -File ops/public_sources/setup_worker_venv.ps1"
}

$runId = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$stateRoot = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "leadpulse-public-sources" } else { Join-Path $RepoRoot ".leadpulse-public-sources" }
$outputDir = Join-Path $stateRoot ("feedgrab\" + $Pipeline + "\" + $runId)
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$feedgrabArgs = @()
switch ($Pipeline) {
  { $_ -in @("x", "twitter") } {
    if ([string]::IsNullOrWhiteSpace($Query)) {
      throw "Query is required for x pipeline."
    }
    $feedgrabArgs = @("x-so", $Query, "--days", "$XDays", "--min-faves", "$XMinFaves", "--sort", $XSort, "--save", "--output", $outputDir)
  }
  "reddit" {
    if ([string]::IsNullOrWhiteSpace($Query)) {
      throw "Query is required for reddit pipeline."
    }
    $feedgrabArgs = @("reddit-sub", $Query, "--sort", $RedditSort, "--limit", "$RedditLimit", "--save", "--output", $outputDir)
  }
  { $_ -in @("xhs", "xiaohongshu") } {
    if (-not [string]::IsNullOrWhiteSpace($FeedgrabTarget)) {
      $feedgrabArgs = @($FeedgrabTarget, "--save", "--output", $outputDir)
    } else {
      if ([string]::IsNullOrWhiteSpace($Query)) {
        throw "Query is required for xhs pipeline unless FeedgrabTarget is set."
      }
      $feedgrabArgs = @("xhs-so", $Query, "--sort", $XhsSort, "--limit", "$XhsLimit", "--save", "--output", $outputDir)
    }
  }
}

& $FeedgrabExe @feedgrabArgs

$ingestScript = Join-Path $RepoRoot "m2m_backend\scripts\ingest_feedgrab_output.py"
$ingestArgs = @(
  $ingestScript,
  "--dir", $outputDir,
  "--api", $Api,
  "--min-budget-usd", "$MinBudgetUsd",
  "--max-results", "$MaxResults"
)
if (-not [string]::IsNullOrWhiteSpace($Token)) {
  $ingestArgs += @("--token", $Token)
}

& $PythonExe @ingestArgs

if (-not [string]::IsNullOrWhiteSpace($KeepOutput)) {
  New-Item -ItemType Directory -Force -Path $KeepOutput | Out-Null
  Get-ChildItem -Path $outputDir -Filter *.md -Recurse | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $KeepOutput $_.Name) -Force
  }
  Write-Host "kept_markdown_dir=$KeepOutput"
}

Write-Host "output_dir=$outputDir"
