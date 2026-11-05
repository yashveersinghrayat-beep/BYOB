@echo off
title Backup ONYX Database
color 0B
cls
echo ======================================================================
echo       💾 ONYX SQLite Database Backup Tool
echo ======================================================================
echo.
cd /d "%~dp0"
if not exist "backups" mkdir "backups"
for /f %%a in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set ts=%%a
copy /y "onyx_restaurant.db" "backups\onyx_backup_%ts%.db"
echo.
echo   [OK] Database successfully backed up to backups\onyx_backup_%ts%.db
echo.
pause
