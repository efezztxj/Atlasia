@echo off
rem ============================================================================
rem  Agent Relay - kurulumsuz calistirici (Windows)
rem  Node.js kurulu degilse bu klasore tasinabilir (portable) Node indirir,
rem  sonra paneli acar. Ilk calistirmada ~35 MB indirir, sonrasinda beklemez.
rem ============================================================================
setlocal enabledelayedexpansion
chcp 65001 >nul
title Agent Relay
cd /d "%~dp0"

set "NODE_DIR="

rem 1) Once sistemde kurulu Node var mi?
where node >nul 2>nul && set "NODE_DIR=system"

rem 2) Yoksa bu klasordeki tasinabilir surumu ara
if not defined NODE_DIR (
  for /d %%d in ("runtime\node-*") do if exist "%%d\node.exe" set "NODE_DIR=%%d"
)

rem 3) O da yoksa indir
if not defined NODE_DIR (
  echo.
  echo   Node.js bulunamadi, tasinabilir surum indiriliyor...
  echo   ^(bir kerelik, ~35 MB^)
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' };" ^
    "$idx = Invoke-RestMethod 'https://nodejs.org/dist/index.json';" ^
    "$rel = $idx | Where-Object { $_.version -like 'v22.*' } | Select-Object -First 1;" ^
    "if (-not $rel) { throw 'Node 22 surumu bulunamadi' };" ^
    "$name = 'node-' + $rel.version + '-win-' + $arch;" ^
    "Write-Host ('   indiriliyor: ' + $name);" ^
    "$zip = Join-Path $env:TEMP ($name + '.zip');" ^
    "Invoke-WebRequest ('https://nodejs.org/dist/' + $rel.version + '/' + $name + '.zip') -OutFile $zip;" ^
    "New-Item -ItemType Directory -Force -Path 'runtime' | Out-Null;" ^
    "Expand-Archive -Path $zip -DestinationPath 'runtime' -Force;" ^
    "Remove-Item $zip -Force;" ^
    "Write-Host '   tamam.'"
  if errorlevel 1 (
    echo.
    echo   Indirme basarisiz oldu. Internet baglantisini kontrol et ya da
    echo   https://nodejs.org adresinden Node 22 LTS kurup bu dosyayi tekrar calistir.
    echo.
    pause
    exit /b 1
  )
  for /d %%d in ("runtime\node-*") do if exist "%%d\node.exe" set "NODE_DIR=%%d"
)

if not defined NODE_DIR (
  echo   Node bulunamadi ya da indirilemedi.
  pause
  exit /b 1
)

if "%NODE_DIR%"=="system" (
  set "NODE=node"
) else (
  set "NODE=%CD%\%NODE_DIR%\node.exe"
)

echo.
echo   Agent Relay baslatiliyor -^> http://localhost:8787
echo   Kapatmak icin bu pencereyi kapatin.
echo.

start "Agent Relay sunucusu" /min cmd /c ""%NODE%" server.mjs"
timeout /t 2 >nul
start "" http://localhost:8787
endlocal
