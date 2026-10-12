@echo off
setlocal

rem --- database settings from .env (copy .env.example to .env and set DB_PASSWORD) ---
if not exist "%~dp0.env" (
    echo.
    echo .env not found. Copy .env.example to .env, set DB_PASSWORD in it, then run this script again.
    pause
    exit /b 1
)
for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%~dp0.env") do set "%%A=%%B"
if not defined DB_PASSWORD (
    echo.
    echo DB_PASSWORD is empty in .env - set it, then run this script again.
    pause
    exit /b 1
)
if not defined DB_NAME set "DB_NAME=kopruq"
if not defined DB_USERNAME set "DB_USERNAME=kopruq"
if not defined DB_PORT set "DB_PORT=5432"
if not defined DB_URL set "DB_URL=jdbc:postgresql://localhost:%DB_PORT%/%DB_NAME%"

echo === Starting PostgreSQL (docker compose) ===
docker compose --project-directory "%~dp0." -f "%~dp0compose.yaml" up -d --wait postgres
if errorlevel 1 (
    echo.
    echo Could not start PostgreSQL - is Docker Desktop running? See errors above.
    pause
    exit /b 1
)

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
rem The new window inherits DB_URL / DB_USERNAME / DB_PASSWORD from this script's environment.
start "KOPRUQ Backend" cmd /k "cd /d %~dp0backend && java -jar target\kopruq-backend-0.1.0-SNAPSHOT.jar"

echo === Starting frontend (new window) ===
start "KOPRUQ Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo Backend:  http://localhost:8080/actuator/health
echo Frontend: http://localhost:5173
echo.
echo Two new windows just opened - close them (or Ctrl+C inside each) to stop.
echo PostgreSQL keeps running in Docker: stop it with `docker compose stop postgres` (data stays in the kopruq-pgdata volume).
