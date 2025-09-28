@echo off
echo 🚀 CSS Duplicate Checker
echo ========================

REM Check if PowerShell is available
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell is not available on this system
    echo Please install PowerShell or use the Node.js version
    pause
    exit /b 1
)

REM Run the PowerShell script
echo Running CSS duplicate analysis...
powershell -ExecutionPolicy Bypass -File "css-duplicate-checker.ps1" -CssFile "frontend/src/styles/globals.css"

echo.
echo ✅ Analysis complete! Check css-duplicates-report.json for detailed results.
pause
