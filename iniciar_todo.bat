@echo off
title Viajes La Nena - Iniciando Servicios
set PATH=D:\herramientas\pgsql\bin;D:\herramientas\node-v22.14.0-win-x64;%PATH%

echo [1/3] Iniciando PostgreSQL desde D:\herramientas...
"D:\herramientas\pgsql\bin\pg_ctl.exe" -D "D:\herramientas\pgdata" -l "D:\herramientas\postgres.log" status >nul 2>&1
if %errorlevel% neq 0 (
    "D:\herramientas\pgsql\bin\pg_ctl.exe" -D "D:\herramientas\pgdata" -l "D:\herramientas\postgres.log" start
) else (
    echo PostgreSQL ya esta en ejecucion.
)

echo [2/3] Iniciando Backend FastAPI en http://localhost:8000 ...
start "Backend - Viajes La Nena" cmd /k "cd /d "%~dp0" && .\venv\Scripts\uvicorn.exe main:app --reload --port 8000"

echo [3/3] Iniciando Frontend React en http://localhost:5173 ...
start "Frontend - Viajes La Nena" cmd /k "set PATH=D:\herramientas\node-v22.14.0-win-x64;%%PATH%% && cd /d "%~dp0frontend" && npm run dev"

echo Listo! Todos los servicios se han iniciado.
pause
