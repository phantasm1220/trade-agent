@echo off
cd /d "%~dp0"
title kabuStation JP Agent

echo.
echo ================================================
echo  kabuStation JP Realtime Agent
echo ================================================
echo.

set PYTHON=C:\Users\yuusu\AppData\Local\Python\bin\python.exe

if not exist %PYTHON% (
    echo [ERROR] Python not found: %PYTHON%
    pause
    exit /b 1
)
%PYTHON% --version
echo [OK] Python found.
echo.

REM .env check
if not exist ".env" (
    echo [ERROR] .env file not found.
    pause
    exit /b 1
)

findstr /c:"your-kabu-api-password" .env >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SETUP REQUIRED] Please edit .env file
    echo Set KABU_PASSWORD to your kabuStation API password.
    notepad .env
    pause
    exit /b 0
)

echo [OK] .env verified.
echo.
echo ------------------------------------------------
echo  Make sure kabuStation is running and logged in
echo  JP market hours: 09:00-15:30 weekdays
echo ------------------------------------------------
echo.
echo Starting agent... (Ctrl+C to stop)
echo.

%PYTHON% kabu_agent.py
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
