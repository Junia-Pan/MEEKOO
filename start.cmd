@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$utf8 = New-Object System.Text.UTF8Encoding($false); [Console]::InputEncoding = $utf8; [Console]::OutputEncoding = $utf8; $OutputEncoding = $utf8; Start-Process (Join-Path $PWD 'client\index.html')"

