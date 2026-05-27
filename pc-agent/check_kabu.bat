@echo off
cd /d "%~dp0"
title kabuStation Check
echo.
echo kabuStation API Check Tool
echo.
set PYTHON=C:\Users\yuusu\AppData\Local\Python\bin\python.exe
if not exist %PYTHON% (
    echo [ERROR] Python not found.
    pause
    exit /b 1
)
%PYTHON% check_kabu.py
