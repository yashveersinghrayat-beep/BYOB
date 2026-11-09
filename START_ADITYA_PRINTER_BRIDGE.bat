@echo off
title ONYX POS - Aditya Mall Kitchen Printer Bridge
color 0B
cls
echo ======================================================================
echo    💎 ONYX RESTAURANT POS — ADITYA MALL KITCHEN PRINTER BRIDGE
echo    Branch: Aditya Mall (Indirapuram)
echo    🖨️ Printer: 192.168.1.222:9100 (Kitchen ESC/POS 80mm)
echo    ☁️ Cloud: Supabase Realtime + Poller (ekvksqsondvyeaoidgcw)
echo ======================================================================
echo.
echo   [1] Checking Node.js runtime...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

echo   [2] Launching 24/7 Wireless Printer Bridge & Relayer...
echo.
cd /d "%~dp0"
node aditya-mall/printer-bridge.js
pause
