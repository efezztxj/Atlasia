@echo off
chcp 65001 >nul
title Agent Relay
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js bulunamadi.
  echo   https://nodejs.org adresinden LTS surumunu kur ^(22 veya ustu^), sonra bunu tekrar calistir.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 22 (
  echo   Node surumun %NODE_MAJOR% - en az 22 gerekiyor. https://nodejs.org
  pause
  exit /b 1
)

echo.
echo   Agent Relay baslatiliyor -^> http://localhost:8787
echo   Kapatmak icin bu pencereyi kapatin.
echo.

start "Agent Relay sunucusu" /min cmd /c "node server.mjs"
timeout /t 2 >nul
start "" http://localhost:8787
