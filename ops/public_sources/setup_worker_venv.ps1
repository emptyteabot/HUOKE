[CmdletBinding()]
param(
  [string]$PythonBin = "python",
  [string]$VenvDir = "",
  [switch]$InstallScrapling
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if ([string]::IsNullOrWhiteSpace($VenvDir)) {
  $VenvDir = Join-Path $RepoRoot ".venv-public-sources"
}

if (-not (Test-Path $VenvDir)) {
  & $PythonBin -m venv $VenvDir
}

$PythonExe = Join-Path $VenvDir "Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
  throw "Python executable not found in venv: $PythonExe"
}

& $PythonExe -m pip install --upgrade pip
& $PythonExe -m pip install --upgrade requests

$feedgrabSpec = if ($env:FEEDGRAB_SPEC) { $env:FEEDGRAB_SPEC } else { "feedgrab[all] @ git+https://github.com/iBigQiang/feedgrab.git" }
& $PythonExe -m pip install --upgrade "$feedgrabSpec"

if ($InstallScrapling.IsPresent) {
  & $PythonExe -m pip install --upgrade "scrapling[all]"
  $scraplingExe = Join-Path $VenvDir "Scripts\scrapling.exe"
  if (Test-Path $scraplingExe) {
    & $scraplingExe install
  } else {
    & $PythonExe -m scrapling install
  }
}

$feedgrabExe = Join-Path $VenvDir "Scripts\feedgrab.exe"
$scraplingPath = Join-Path $VenvDir "Scripts\scrapling.exe"

Write-Host "LeadPulse public-source worker venv is ready."
Write-Host "venv=$VenvDir"
Write-Host "python=$PythonExe"
Write-Host "feedgrab=$feedgrabExe"
if (Test-Path $scraplingPath) {
  Write-Host "scrapling=$scraplingPath"
} else {
  Write-Host "scrapling=not installed"
}
