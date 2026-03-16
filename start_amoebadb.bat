@echo off
cd /d "%~dp0"

REM Start backend server in a separate window
start "AmoebaDB Server" cmd /k "npm start"

REM Wait a few seconds so server can boot
timeout /t 4 /nobreak >nul

REM Open website
start "" "http://localhost:3000"
