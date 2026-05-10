@echo off
setlocal

cd /d %~dp0..

if not exist "frontend\dist\index.html" (
  echo Le build frontend est absent. Lance d'abord scripts\build-all.bat
  pause
  exit /b 1
)

start "Arcade Backend" /min cmd /c "cd /d %cd%\backend && npm start"
timeout /t 2 /nobreak >nul

start "" msedge.exe --kiosk http://localhost:3030 --edge-kiosk-type=fullscreen --kiosk-idle-timeout-minutes=0 --no-first-run --disable-pinch --overscroll-history-navigation=0
