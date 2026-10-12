@echo off
setlocal

REM Stop the local KOPRUQ backend and frontend processes started by start-dev.bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $backend = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'java.exe' -and $_.CommandLine -match 'kopruq-backend' }; $frontend = Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ( $_.CommandLine -match 'vite' -or $_.CommandLine -match 'KOPRUQ\\frontend' ) }; foreach ($p in @($backend + $frontend)) { if ($p) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } }; Write-Host 'KOPRUQ backend/frontend stopped.' }"

exit /b 0
