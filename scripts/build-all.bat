@echo off
setlocal

echo [1/2] Build frontend...
cd /d %~dp0..\frontend
call npm install
call npm run build
if errorlevel 1 exit /b 1

echo [2/2] Install backend deps...
cd /d %~dp0..\backend
call npm install
if errorlevel 1 exit /b 1

echo Build termine.
