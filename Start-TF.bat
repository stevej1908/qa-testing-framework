@echo off
title Testing Framework Launcher
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║           Testing Framework (TF) Launcher                   ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  Starting all services...                                   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Kill any existing processes on our ports
echo Cleaning up any existing processes on ports 3001, 3002...

:: Kill process on port 3001 (TF Portal)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 3002 (Playwright Service)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Ports cleared.
echo.

:: Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

:: Set directory paths
set TF_DIR=%~dp0
set TF_APP_DIR=%TF_DIR%app
set TF_SERVER_DIR=%TF_DIR%app\server

echo [1/2] Starting Playwright Service (port 3002)...
cd /d "%TF_SERVER_DIR%"
start "Playwright Service" cmd /c "node playwright-service.js"

:: Wait for playwright service
timeout /t 2 /nobreak >nul

echo [2/2] Starting TF Portal (port 3001)...
cd /d "%TF_APP_DIR%"
start "TF Portal" cmd /c "npm start"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  All services starting!                                     ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  TF Portal:        http://localhost:3001                    ║
echo ║  Playwright:       http://localhost:3002                    ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  NOTE: Configure your target app URL in the TF Portal       ║
echo ║  Opening TF Portal in browser in 10 seconds...              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Wait for all services to be ready
timeout /t 10 /nobreak >nul

:: Open TF Portal in default browser
start http://localhost:3001

echo.
echo TF Portal should now be open in your browser.
echo Close this window to stop monitoring, but services will continue running.
echo To stop services, close each command window individually or run Stop-TF.bat
echo.
pause
