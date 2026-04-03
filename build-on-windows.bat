@echo off
setlocal enabledelayedexpansion

echo ########################################################
echo #         Mersal Info Center - Windows Build Script        #
echo ########################################################
echo.

:: 1. Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js was not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: 2. Check for Git
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Git was not found. Please install Git from https://git-scm.com/
    pause
    exit /b
)

:: 3. Initializing Setup
echo [+] Step 1: Cleaning up old node_modules...
if exist node_modules rmdir /s /q node_modules

echo [+] Step 2: Installing project dependencies...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies. Ensure you have Build Tools for VS installed.
    echo Read WINDOWS_SETUP.md for more info.
    pause
    exit /b
)

:: 4. Rebuild Native Modules (extremely important for better-sqlite3)
echo [+] Step 3: Rebuilding native modules (SQLite) for Windows...
call npm run rebuild

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to rebuild native modules.
    pause
    exit /b
)

:: 5. Generate EXE
echo.
echo [+] Step 4: Generating the Windows executable (.exe)...
call npm run build:win

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to build Windows application.
    pause
    exit /b
)

echo.
echo ########################################################
echo #   SUCCESS: The Windows app is ready in the build/ folder #
echo ########################################################
echo.
pause
