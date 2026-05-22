@echo off
rem 主要用途：Windows 下一键用默认浏览器打开 client\index.html（并设置 UTF-8 控制台编码）
setlocal
cd /d "%~dp0"
chcp 65001 >nul
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$utf8 = New-Object System.Text.UTF8Encoding($false); [Console]::InputEncoding = $utf8; [Console]::OutputEncoding = $utf8; $OutputEncoding = $utf8; Start-Process (Join-Path $PWD 'client\index.html')"

