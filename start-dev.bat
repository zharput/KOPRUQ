@echo off
setlocal

echo === Building backend ===
cd /d "%~dp0backend"
call mvn -q -B package
if errorlevel 1 (
    echo.
    echo Backend build failed - see errors above.
    pause
    exit /b 1
)

echo === Starting backend (new window) ===
start "KOPRUQ Backend" cmd /k "cd /d %~dp0backend && java -jar api\target\api-0.1.0-SNAPSHOT.jar"

echo === Starting frontend (new window) ===
start "KOPRUQ Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo Backend:  http://localhost:8080/actuator/health
echo Frontend: http://localhost:5173
echo.
echo Two new windows just opened - close them (or Ctrl+C inside each) to stop.
