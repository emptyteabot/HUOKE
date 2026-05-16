# Xiaohongshu Login on Windows

Use the worker venv and feedgrab's own login flow. Do this on the machine that stores your cookies and browser profile.

## 1. Prepare the worker environment

```powershell
cd C:\Users\cyh\Desktop\项目线\LeadPulse\LeadPulse_work
powershell -ExecutionPolicy Bypass -File .\ops\public_sources\setup_worker_venv.ps1
```

## 2. Log in to Xiaohongshu with feedgrab

```powershell
cd C:\Users\cyh\Desktop\项目线\LeadPulse\LeadPulse_work
$env:CHROME_CDP_LOGIN = "true"
.\.venv-public-sources\Scripts\feedgrab.exe login xhs
```

When Chrome opens, sign in normally. Keep the worker cookies and browser profile on this machine. Do not commit them into Git.

## 3. Run an XHS search and send results into LeadPulse

```powershell
cd C:\Users\cyh\Desktop\项目线\LeadPulse\LeadPulse_work
powershell -ExecutionPolicy Bypass -File .\ops\public_sources\run_feedgrab_pipeline.ps1 `
  -Pipeline xhs `
  -Query "找代运营 预算" `
  -XhsLimit 50 `
  -Api "https://leadpulseagi.com"
```

## 4. Run against a specific profile or note

```powershell
cd C:\Users\cyh\Desktop\项目线\LeadPulse\LeadPulse_work
powershell -ExecutionPolicy Bypass -File .\ops\public_sources\run_feedgrab_pipeline.ps1 `
  -Pipeline xhs `
  -FeedgrabTarget "https://www.xiaohongshu.com/user/profile/<profile-id>" `
  -Api "https://leadpulseagi.com"
```

## 5. Recommended first keyword set for LeadPulse dogfooding

- 获客太难了
- 线索质量差
- 找代运营
- 出海销售怎么做
- 投放成本太高
