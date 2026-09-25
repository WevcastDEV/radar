@echo off
title Radar de Oportunidades - API e Robo WhatsApp
color 0A
cd /d "%~dp0"
echo ======================================================
echo   RADAR DE OPORTUNIDADES - SERVIDOR API ^& WHATSAPP
echo   Banco de Dados: SQLite Local (Zero Docker)
echo ======================================================
echo.
node dist/main.js
pause
