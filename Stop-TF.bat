@echo off
title Testing Framework - Stop All Services
color 0C

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║           Testing Framework (TF) - Stop Services            ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  Stopping all services...                                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Kill process on port 3001 (TF Portal)
echo Stopping TF Portal (port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo   - Stopped PID %%a
)

:: Kill process on port 3002 (Playwright Service)
echo Stopping Playwright Service (port 3002)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo   - Stopped PID %%a
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  All services stopped!                                      ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
