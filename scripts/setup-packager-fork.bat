@echo off
setlocal

cd /d %~dp0..
if not exist "tools" mkdir tools

if exist "tools\turbowarp-packager-fork\.git" (
  echo Fork local deja present: tools\turbowarp-packager-fork
  exit /b 0
)

git clone https://github.com/TurboWarp/packager.git tools\turbowarp-packager-fork
if errorlevel 1 (
  echo Echec du clone packager.
  exit /b 1
)

echo Clone local cree: tools\turbowarp-packager-fork
echo Ensuite:
echo 1) Cree ton fork GitHub de TurboWarp/packager
echo 2) cd tools\turbowarp-packager-fork
echo 3) git remote rename origin upstream
echo 4) git remote add origin https://github.com/TON_USER/packager.git
