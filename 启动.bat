@echo off
echo ========================================
echo    LeadPulse - 启动中...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 启动Streamlit前端...
cd streamlit-app
start /B streamlit run app.py

echo.
echo ========================================
echo    启动完成!
echo ========================================
echo.
echo 前端地址: http://localhost:8501
echo.
echo 提示:
echo - 如需部署到公网,查看 STREAMLIT-DEPLOY.md
echo - 按 Ctrl+C 停止服务
echo.

pause
