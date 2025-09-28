@echo off
echo ========================================
echo   TalentTrack - Network Launch Helper
echo ========================================
echo.

echo Getting your IP address...
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
    set ip=%%i
    goto :found
)
:found
set ip=%ip: =%
echo Your IP address is: %ip%
echo.

echo ========================================
echo   Launch Instructions:
echo ========================================
echo.
echo 1. Backend Server (Terminal 1):
echo    cd backend
echo    python main.py
echo.
echo 2. Frontend Server (Terminal 2):
echo    cd frontend
echo    npm run dev
echo.
echo 3. Access URLs:
echo    Your computer: http://localhost:3000
echo    Other devices: http://%ip%:3000
echo.
echo ========================================
echo   Press any key to continue...
echo ========================================
pause > nul
