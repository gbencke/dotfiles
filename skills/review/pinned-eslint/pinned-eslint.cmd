@echo off
setlocal
powershell.exe -NoProfile -File "%~dp0pinned-eslint.ps1" %*
exit /b %ERRORLEVEL%
