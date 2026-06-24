@echo off
title Canal Directo - Dashboard Ejecutivo
color 0B

echo ========================================================
echo   Iniciando Dashboard Ejecutivo - Canal Directo
echo ========================================================
echo.

:: Verifica si node.js está instalado
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js no esta instalado. Por favor instala Node.js para continuar.
    pause
    exit /b
)

echo [1/3] Verificando dependencias de Node.js...
call npm install --no-audit --no-fund

echo.
echo [2/3] Preparando el entorno de Next.js...
:: Puedes cambiar "npm run dev" a "npm run start" si ya esta buildeado en prod
echo.
echo [3/3] Iniciando el servidor local...
echo La aplicacion se abrira en tu navegador predeterminado en unos segundos.

:: Abre el navegador apuntando al localhost
start http://localhost:3000

:: Inicia Next.js
call npm run dev
