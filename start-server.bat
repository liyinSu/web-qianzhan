@echo off
chcp 65001 >nul
title 前詹镇综合展示平台 · 本地预览
cd /d "%~dp0"

echo ============================================
echo   前詹镇综合展示平台 - 本地预览服务
echo ============================================
echo.
echo   启动后请在浏览器访问：
echo   http://localhost:8000/index.html
echo.

rem 优先使用 Python（加载快、兼容好），没有则用系统自带 PowerShell
where python >nul 2>nul
if %errorlevel%==0 (
  echo [1/2] 已检测到 Python，正在启动服务...
  start "" "http://localhost:8000/index.html"
  echo [2/2] 浏览器已打开，本窗口请保持开启。按 Ctrl+C 停止服务。
  echo.
  python -m http.server 8000 --bind 127.0.0.1
  goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo [1/2] 已检测到 Python，正在启动服务...
  start "" "http://localhost:8000/index.html"
  echo [2/2] 浏览器已打开，本窗口请保持开启。按 Ctrl+C 停止服务。
  echo.
  py -m http.server 8000 --bind 127.0.0.1
  goto :end
)

echo [1/2] 未检测到 Python，使用 Windows 自带 PowerShell 启动服务...
start "" "http://localhost:8000/index.html"
echo [2/2] 浏览器已打开，本窗口请保持开启。关闭本窗口即停止服务。
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"

:end
echo.
echo 服务已停止。
pause
