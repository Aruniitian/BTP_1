@echo off
:: ============================================================
:: AmoebaDB — One-time Setup Script for Windows
:: Run this ONCE on a new PC after copying the project folder.
:: Requires: Node.js (v18+) installed — https://nodejs.org
:: ============================================================

cd /d "%~dp0"
title AmoebaDB Setup

echo.
echo ============================================
echo   AmoebaDB — First-Time Setup
echo ============================================
echo.

:: ---------- Check Node.js ----------
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is NOT installed on this PC.
    echo.
    echo  Please install Node.js first:
    echo    https://nodejs.org  (download the LTS version)
    echo.
    echo  After installing, close this window and run setup.bat again.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js found: %NODE_VER%

:: ---------- Check npm ----------
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is NOT installed. It usually comes with Node.js.
    echo  Please reinstall Node.js from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo [OK] npm found: v%NPM_VER%
echo.

:: ---------- Install backend dependencies ----------
echo [1/4] Installing backend dependencies...
call npm install --production
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.
echo.

:: ---------- Install frontend dependencies ----------
echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install frontend dependencies.
    cd ..
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

:: ---------- Build frontend ----------
echo [3/4] Building frontend (React + Tailwind)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build failed.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Frontend built successfully.
echo.

:: ---------- Create .env if missing ----------
echo [4/4] Checking configuration...
if not exist ".env" (
    echo PORT=3000> .env
    echo ADMIN_USERNAME=admin>> .env
    echo ADMIN_PASSWORD=change_me_in_production>> .env
    echo MAX_BACKUPS=10>> .env
    echo [OK] Created default .env file.
) else (
    echo [OK] .env file already exists.
)
echo.

:: ---------- Done ----------
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo  To start the website, double-click:
echo    start_amoebadb.bat
echo.
echo  Or run:  npm start
echo  Then open:  http://localhost:3000
echo.
pause
