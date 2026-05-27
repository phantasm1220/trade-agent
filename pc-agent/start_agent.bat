@echo off
cd /d "%~dp0"
title moomoo Agent

echo.
echo ================================================
echo  moomoo Real-time Stock Price Agent
echo ================================================
echo.

REM Python path - no quotes needed
set PYTHON=C:\Users\yuusu\AppData\Local\Python\bin\python.exe

if not exist %PYTHON% (
    echo [ERROR] Python not found: %PYTHON%
    echo Please edit PYTHON= line in this bat file.
    pause
    exit /b 1
)

%PYTHON% --version
echo [OK] Python found.
echo.

REM moomoo-api check
%PYTHON% -c "import moomoo" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [SETUP] Installing moomoo-api...
    %PYTHON% -m pip install moomoo-api
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] pip install failed.
        pause
        exit /b 1
    )
    echo [OK] moomoo-api installed.
) else (
    echo [OK] moomoo-api already installed.
)

REM .env check
if not exist ".env" (
    echo [ERROR] .env file not found.
    pause
    exit /b 1
)

findstr /c:"your-project" .env >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SETUP REQUIRED] Please edit .env file
    echo Set VERCEL_URL and PUSH_SECRET then restart.
    notepad .env
    pause
    exit /b 0
)

echo [OK] .env verified.
echo.
echo ------------------------------------------------
echo  Make sure moomoo OpenD is running and logged in
echo ------------------------------------------------
echo.
echo Starting agent... (Ctrl+C to stop)
echo.

%PYTHON% moomoo_agent.py
set EXIT_CODE=%ERRORLEVEL%

echo.
echo ================================================
if %EXIT_CODE% EQU 0 (
    echo  Agent stopped normally.
) else (
    echo  [ERROR] Agent exited with code: %EXIT_CODE%
    echo  Check the log above.
)
echo ================================================
echo.
pause
