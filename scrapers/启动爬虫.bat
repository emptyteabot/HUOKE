@echo off
chcp 65001 >nul
echo ========================================
echo 小红书评论爬虫 - 快速启动
echo ========================================
echo.

REM 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到Python,请先安装Python 3.8+
    pause
    exit /b 1
)

REM 检查依赖
echo [1/3] 检查依赖...
pip show undetected-chromedriver >nul 2>&1
if errorlevel 1 (
    echo [安装] 正在安装依赖包...
    pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
) else (
    echo [完成] 依赖已安装
)

REM 运行爬虫
echo.
echo [2/3] 启动爬虫...
echo.
python xiaohongshu_scraper.py

echo.
echo [3/3] 程序结束
pause
