@echo off
title IoT Motor Monitoring System - Launcher
color 0b

echo =====================================================================
echo    SMART PREDICTIVE MAINTENANCE FOR INDUSTRIAL MOTORS (IIoT + AI)
echo =====================================================================
echo  Launching all 4 distributed system components in separate windows...
echo.

:: 1. Launch AI Engine Microservice (FastAPI on Port 8000)
echo [1/4] Starting AI Inference Engine (FastAPI Port 8000)...
start "1. AI Engine (Port 8000)" cmd /k "cd /d %~dp0ai-engine\api && python -m uvicorn main:app --host 127.0.0.1 --port 8000"
timeout /t 3 /nobreak >nul

:: 2. Launch Fastify Gateway & Socket.IO (Port 3001)
echo [2/4] Starting Fastify Backend Gateway (Port 3001)...
start "2. Backend Gateway (Port 3001)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul

:: 3. Launch React SCADA Dashboard (Port 5173)
echo [3/4] Starting SCADA Dashboard Frontend (Port 5173)...
start "3. Frontend SCADA Web (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

:: 4. Launch Edge Motor Simulator (2 Hz Telemetry)
echo [4/4] Starting Motor Edge Simulator (2 Hz Telemetry)...
start "4. Motor Simulator (Edge)" cmd /k "cd /d %~dp0simulator && python main.py"

echo.
echo =====================================================================
echo  ALL 4 SYSTEM COMPONENTS LAUNCHED SUCCESSFULLY!
echo =====================================================================
echo  * AI Engine API:    http://127.0.0.1:8000/health
echo  * Backend Gateway:  http://localhost:3001/health
echo  * SCADA Dashboard:  http://localhost:5173
echo.
echo  To inject a fault for thesis demo, open another terminal and run:
echo    cd simulator
echo    python inject_fault.py --type spike
echo    python inject_fault.py --type critical
echo =====================================================================
echo.
pause
