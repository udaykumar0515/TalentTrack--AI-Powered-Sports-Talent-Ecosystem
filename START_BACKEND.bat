@echo off
REM Backend Server Launcher
cd /d "%~dp0backend"

if not exist "venv\" (
    echo Creating Python virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -r requirements.txt
python main.py
