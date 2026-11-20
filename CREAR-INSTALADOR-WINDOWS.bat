@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Falta Node.js 22 o posterior.
  echo Descargalo desde https://nodejs.org/
  goto error
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo Falta Rust y Cargo. Instala Rust desde https://rustup.rs/
  goto error
)

echo Instalando dependencias de NeoApp...
call npm ci
if errorlevel 1 goto error

echo Generando instaladores de Windows...
call npm run build:windows
if errorlevel 1 goto error

echo.
echo Instalador EXE:
echo   src-tauri\target\release\bundle\nsis\
echo.
echo Abre el archivo .exe de la carpeta NSIS para instalar NeoApp.
pause
exit /b 0

:error
echo.
echo No se pudo generar el instalador. Revisa los requisitos de Windows en README.md.
pause
exit /b 1
