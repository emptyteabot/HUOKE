@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 🎯 完整获客系统 - 一键启动
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python,请先安装Python 3.8+
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo ✅ Python已安装
echo.

REM 检查依赖
echo 📦 检查依赖...
pip show selenium >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 缺少依赖,正在安装...
    pip install selenium undetected-chromedriver pandas openpyxl
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装成功
) else (
    echo ✅ 依赖已安装
)

echo.
echo ========================================
echo 🚀 启动程序...
echo ========================================
echo.

REM 运行主程序
python lead_generation_complete.py

echo.
echo ========================================
echo 程序已结束
echo ========================================
pause
