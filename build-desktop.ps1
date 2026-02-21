# GuestSeek 桌面应用构建脚本

Write-Host "🚀 开始构建 GuestSeek 桌面应用..." -ForegroundColor Green

# 检查Node.js
Write-Host "`n检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 Node.js,请先安装: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 检查Python
Write-Host "`n检查 Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✅ Python 版本: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 未安装 Python,请先安装: https://www.python.org/" -ForegroundColor Red
    exit 1
}

# 进入electron目录
Set-Location electron

# 安装依赖
Write-Host "`n安装 Node.js 依赖..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 依赖安装成功" -ForegroundColor Green

# 构建应用
Write-Host "`n开始构建 Windows 应用..." -ForegroundColor Yellow
npm run build:win

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ 构建成功!" -ForegroundColor Green
Write-Host "📦 安装包位置: electron\dist\" -ForegroundColor Cyan

# 返回上级目录
Set-Location ..

Write-Host "`n🎉 完成!" -ForegroundColor Green
