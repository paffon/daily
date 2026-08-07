@echo off
rem Frees the dev ports. Vite steps 5173 -> 5174 -> 5175 when one is busy, and
rem only 5173 is an authorised JavaScript origin for the Google client ID, so a
rem server left running in a window nobody looks at any more is enough to break
rem sign-in in the next one. Node only: anything else holding a port is named
rem and left alone, since this is a dev-server broom, not a task manager.
cd /d "%~dp0"

powershell -NoProfile -Command "$ids = Get-NetTCPConnection -State Listen -LocalPort 5173,5174,5175,5176,5177 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $ids) { 'nothing listening on 5173-5177'; exit }; foreach ($id in $ids) { $p = Get-Process -Id $id -ErrorAction SilentlyContinue; if (-not $p) { continue }; if ($p.ProcessName -eq 'node') { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue; 'stopped node, PID ' + $id } else { 'left ' + $p.ProcessName + ' alone, PID ' + $id + ', not a dev server' } }"

if not "%~1"=="quiet" pause
