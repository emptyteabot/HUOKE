@echo off
chcp 65001 >nul
echo ========================================
echo 知乎爬虫 - 快速启动
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python,请先安装Python
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
pip show undetected-chromedriver >nul 2>&1
if errorlevel 1 (
    echo 正在安装 undetected-chromedriver...
    pip install undetected-chromedriver
)

pip show selenium >nul 2>&1
if errorlevel 1 (
    echo 正在安装 selenium...
    pip install selenium
)

pip show pandas >nul 2>&1
if errorlevel 1 (
    echo 正在安装 pandas...
    pip install pandas
)

pip show openpyxl >nul 2>&1
if errorlevel 1 (
    echo 正在安装 openpyxl...
    pip install openpyxl
)

echo.
echo [2/3] 依赖检查完成
echo.
echo [3/3] 启动爬虫...
echo.

python zhihu_scraper.py

echo.
echo ========================================
echo 程序已结束
echo ========================================
pause
