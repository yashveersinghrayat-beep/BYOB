@echo off
title ONYX Restaurant POS Server
color 0A
cls
echo ======================================================================
echo       💎 ONYX COMMERCIAL RESTAURANT ENGINE - BYOB INDIRAPURAM
echo ======================================================================
echo.
echo   [1] Loading SQLite WAL Database (onyx_restaurant.db)...
echo   [2] Launching Multi-Device Server on Port 3000...
echo.
cd /d "%~dp0"
node server.js
pause

