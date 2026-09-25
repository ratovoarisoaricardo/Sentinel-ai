@echo off
title Sentinel AI - Demarrage Universel
setlocal enabledelayedexpansion

echo ======================================================
echo           Demarrage Automatique de Sentinel AI
echo ======================================================
echo.

cd /d "%~dp0"

:: 1. Verification de Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH.
    pause
    exit /b 1
)

:: 2. Verification de Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH.
    pause
    exit /b 1
)

:: 3. Backend
echo [1/3] Preparation du Backend...
cd backend
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creation du virtualenv dans backend\venv...
    python -m venv venv
)
call "venv\Scripts\activate.bat"
if exist "requirements.txt" (
    pip install -r requirements.txt
)
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Fichier backend\.env cree. N'oubliez pas d'y ajouter votre GEMINI_API_KEY.
    )
)
cd ..

:: 4. Frontend
echo.
echo [2/3] Preparation du Frontend...
cd frontend
if not exist "node_modules" (
    echo [INFO] Installation des dependances React...
    call npm install
)
cd ..

:: 5. Lancement
echo.
echo [3/3] Lancement des serveurs...
start "Sentinel AI Backend" cmd /k "cd /d ""%~dp0backend"" && call venv\Scripts\activate.bat && python app.py"
timeout /t 3 /nobreak >nul
start "Sentinel AI Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ======================================================
echo [SUCCES] Sentinel AI est lance !
echo ======================================================
pause