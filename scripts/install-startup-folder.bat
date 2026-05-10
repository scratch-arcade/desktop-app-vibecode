@echo off
setlocal

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\start-arcade.bat"

copy /Y "%~dp0start-arcade.bat" "%TARGET%"
if errorlevel 1 (
  echo Echec copie vers Startup.
  exit /b 1
)

echo Auto-start configure via Startup folder:
echo %TARGET%
