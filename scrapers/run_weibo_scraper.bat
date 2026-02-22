@echo off
chcp 65001 >nul
echo ========================================
echo 微博评论爬虫启动器
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python,请先安装Python 3.8+
    pause
    exit /b 1
)

REM 检查依赖是否安装
echo [1/3] 检查依赖...
pip show undetected-chromedriver >nul 2>&1
if errorlevel 1 (
    echo [提示] 正在安装依赖包...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [2/3] 依赖检查完成
echo [3/3] 启动爬虫...
echo.

python weibo_scraper.py

echo.
echo ========================================
echo 程序已结束
echo ========================================
pause
