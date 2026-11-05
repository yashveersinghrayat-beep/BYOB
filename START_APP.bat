@echo off
title Launching ONYX POS Application...
cd /d "%~dp0"

:: Check if server is already running
curl -s http://localhost:3000/api/ping >nul 2>&1
if %errorlevel% neq 0 (
  echo Starting ONYX Restaurant Engine in background...
  start "ONYX POS Server" /min node server.js
  timeout /t 2 /nobreak >nul
)

:: Launch in Dedicated Standalone App Mode (No URL bar, No tabs)
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="http://localhost:3000"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="http://localhost:3000"
) else (
  start http://localhost:3000
)
exit

