@echo off
title Radar - Leitor de IP da Maquina Principal
color 0B
echo =======================================================
echo          LEITOR DE IP DO SERVIDOR (RADAR)
echo =======================================================
echo.
echo Use este IP nos computadores dos funcionarios para
echo conectarem neste Servidor (Maquina Principal).
echo.
echo =======================================================
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr "IPv4"') do (
    echo SEU IP E: %%A
)
echo =======================================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
