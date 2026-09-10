@echo off
title CoreForge 2026 Launcher
echo ============================================================
echo   CoreForge 2026 - Windows Launcher (100%% Local AI IDE)
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/3] Verificare mediu Python & Backend...
if exist "agent_env\Scripts\activate.bat" (
    call agent_env\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo [2/3] Pornire CoreForge Backend (FastAPI :8000)...
start "CoreForge Backend" /min cmd /c "python main.py"

echo [3/3] Pornire CoreForge Web IDE (Next.js :3000)...
cd ai-dashboard
start "CoreForge Frontend" /min cmd /c "npm run dev"
cd ..

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   CoreForge 2026 ruleaza cu succes!
echo   Browser Web:   http://localhost:3000
echo   FastAPI Docs:  http://localhost:8000/docs
echo ============================================================
echo.
echo Daca ai aplicatia Desktop CoreForge instalata (.exe),
echo o poti deschide acum din Start Menu sau Desktop!
echo.
start http://localhost:3000
pause
