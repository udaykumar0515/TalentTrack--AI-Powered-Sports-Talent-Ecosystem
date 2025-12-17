@echo off
REM Full Application Launcher
echo Starting TalentTrack Application...
echo.

start "TalentTrack Backend" cmd /k "%~dp0START_BACKEND.bat"
timeout /t 5 /nobreak >nul
start "TalentTrack Frontend" cmd /k "%~dp0START_FRONTEND.bat"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
