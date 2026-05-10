@echo off
setlocal

start "Arcade Backend Dev" cmd /k "cd /d %~dp0..\backend && npm install && npm run dev"
start "Arcade Frontend Dev" cmd /k "cd /d %~dp0..\frontend && npm install && npm run dev"

echo Environnement dev lance.
echo Backend: http://localhost:3030
echo Frontend: http://localhost:5173
