@echo off
setlocal

set "TASK_NAME=ArcadeLauncherBoot"
set "CMD=%~dp0start-arcade.bat"

schtasks /Create /TN "%TASK_NAME%" /SC ONLOGON /RL HIGHEST /F /TR "\"%CMD%\""
if errorlevel 1 (
  echo Echec creation tache planifiee.
  exit /b 1
)

echo Tache planifiee creee: %TASK_NAME%
