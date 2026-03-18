@echo off
:: ============================================================
:: AmoebaDB — Start the website
:: ============================================================

cd /d "%~dp0"
title AmoebaDB Server

:: Check Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed.
    echo  Install from: https://nodejs.org
    pause
    exit /b 1
)

:: Check if setup has been done (node_modules must exist)
if not exist "node_modules" (
    echo [INFO] First run detected — running setup...
    echo.
    call setup.bat
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

:: Check frontend is built
if not exist "frontend\dist\index.html" (
    echo [INFO] Frontend not built — building now...
    cd frontend
    call npm run build
    cd ..
)

echo.
echo  Starting AmoebaDB server...
echo  Website will open at: http://localhost:3000
echo  Press Ctrl+C to stop the server.
echo.

:: Start server in foreground so the window stays open
start "" "http://localhost:3000"
timeout /t 2 /nobreak >nul
node server.js
