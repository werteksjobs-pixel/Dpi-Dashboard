@echo off
REM ──────────────────────────────────────────────────────────────────────────
REM  DPI Dashboard — quick launcher / builder
REM  Run this script from the project root: scripts\setup.cmd
REM ──────────────────────────────────────────────────────────────────────────

WHERE node >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download from: https://nodejs.org/en/download
    pause
    exit /b 1
)

FOR /F "delims=" %%i IN ('node -v') DO SET NODE_VER=%%i
echo [OK] Node.js found: %NODE_VER%

WHERE npm >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
)

echo.
echo Choose an action:
echo   1) Install dependencies  (npm install)
echo   2) Run in dev mode       (npm run dev)
echo   3) Build TypeScript only (npm run build)
echo   4) Build installer       (npm run dist)
echo   Q) Quit
echo.

SET /P CHOICE="Enter choice [1/2/3/4/Q]: "

IF /I "%CHOICE%"=="1" (
    echo Installing dependencies...
    npm install
) ELSE IF /I "%CHOICE%"=="2" (
    echo Starting dev mode...
    npm run dev
) ELSE IF /I "%CHOICE%"=="3" (
    echo Building TypeScript...
    npm run build
) ELSE IF /I "%CHOICE%"=="4" (
    echo Building installer...
    npm run dist
) ELSE (
    echo Bye!
)

pause
