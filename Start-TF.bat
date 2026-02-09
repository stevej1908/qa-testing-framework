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
echo Cleaning up any existing processes on ports 3000, 3001, 3002, 5000...

:: Kill process on port 3000 (React app)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 3001 (TF Portal)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 3002 (Playwright Service)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 5000 (API Server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
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
set APP_DIR=%~dp0
set BEHAVIORAL_HEALTH_DIR=%APP_DIR%..
set TF_APP_DIR=%APP_DIR%app
set TF_SERVER_DIR=%APP_DIR%app\server

echo [1/4] Starting Behavioral Health App (port 3000)...
cd /d "%BEHAVIORAL_HEALTH_DIR%"
start "Behavioral Health App" cmd /c "npm start"

:: Wait for app to start
timeout /t 5 /nobreak >nul

echo [2/4] Starting Behavioral Health API Server (port 5000)...
cd /d "%BEHAVIORAL_HEALTH_DIR%\server"
start "API Server" cmd /c "npm start"

:: Wait for server to start
timeout /t 3 /nobreak >nul

echo [3/4] Starting Playwright Service (port 3002)...
cd /d "%TF_SERVER_DIR%"
start "Playwright Service" cmd /c "node playwright-service.js"

:: Wait for playwright service
timeout /t 2 /nobreak >nul

echo [4/4] Starting TF Portal (port 3001)...
cd /d "%TF_APP_DIR%"
start "TF Portal" cmd /c "npm start"

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  All services starting!                                     ║
echo ╠════════════════════════════════════════════════════════════╣
echo ║  TF Portal:        http://localhost:3001                    ║
echo ║  Behavioral App:   http://localhost:3000                    ║
echo ║  API Server:       http://localhost:5000                    ║
echo ║  Playwright:       http://localhost:3002                    ║
echo ╠════════════════════════════════════════════════════════════╣
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
echo To stop services, close each command window individually.
echo.
pause
