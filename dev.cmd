@echo off
rem Starts the dev server and opens it. Always on 5173, because that is the one
rem origin the Google OAuth client authorises and `strictPort` in vite.config.ts
rem will not start anywhere else, so the port is cleared before vite is asked
rem for it. Ctrl-C, or closing this window, stops the server.
cd /d "%~dp0"

call "%~dp0stop.cmd" quiet

if not exist node_modules (
  echo installing dependencies, first run only...
  call npm install
)

if not exist .env.local echo NOTE: no .env.local in this checkout, so VITE_GOOGLE_CLIENT_ID is missing and sign-in will fail. Copy it in from the main one.

call npm run dev -- --open
if errorlevel 1 pause
