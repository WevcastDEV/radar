@echo off
title Radar de Oportunidades - Servidor WhatsApp e API
color 0A
cd /d "%~dp0apps\api"
echo ======================================================
echo   RADAR DE OPORTUNIDADES - ROBO DO WHATSAPP ^& API
echo   Banco de Dados: SQLite Local (Zero Docker)
echo ======================================================
echo.
echo Liberando porta 3001 caso esteja em uso...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1

echo Iniciando Servidor e Robo do WhatsApp...
echo O QR Code aparecera aqui no terminal e tambem no painel web!
echo.
node dist/main.js
pause
