@echo off
title Radar de Oportunidades - Conector WhatsApp
color 0A

echo ===================================================================
echo     RADAR DE OPORTUNIDADES - CONECTOR WHATSAPP OFICIAL
echo ===================================================================
echo.
echo  Conectando o WebSocket do WhatsApp diretamente no seu computador...
echo.

:: 1. Verifica se o Node.js esta instalado
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo [!] Node.js nao foi encontrado neste computador.
    echo     Tentando instalar automaticamente via Windows Package Manager...
    echo.
    winget install OpenJS.NodeJS.LTS -h --accept-package-agreements --accept-source-agreements
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo [!] Nao foi possivel instalar automaticamente.
        echo     Abrindo o site oficial do Node.js para download...
        start https://nodejs.org/
        echo.
        echo Apos instalar o Node.js, feche esta janela e execute o INICIAR_CONECTOR.bat novamente.
        pause
        exit /b 1
    )
)

:: 2. Instala dependencias na primeira execucao (apenas 1 vez)
if not exist "%~dp0node_modules" (
    color 0E
    echo ======================================================
    echo   PRIMEIRA EXECUCAO DETECTADA!
    echo   Configurando o conector no seu computador...
    echo   Isso acontece apenas uma vez, por favor aguarde...
    echo ======================================================
    echo.
    cd /d "%~dp0"
    call npm install --omit=dev
    color 0A
)

:: 3. Libera a porta 3001 caso esteja travada
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1

:: 4. Inicia o conector do WhatsApp
cls
echo ===================================================================
echo     RADAR DE OPORTUNIDADES - CONECTOR WHATSAPP ATIVO
echo ===================================================================
echo.
echo   [OK] Servico WebSocket rodando na porta 3001!
echo.
echo   COMO CONECTAR:
echo   1. O QR Code aparecera abaixo nesta janela preta e abrira no navegador!
echo   2. Aponte a camera do seu WhatsApp (Aparelhos Conectados) e escaneie.
echo   3. Pronto! A conexao sincronizara automaticamente com o site na nuvem.
echo   4. Mantenha esta janela aberta minimizada enquanto usar o robo.
echo.
echo ===================================================================
echo.
cd /d "%~dp0"
start /b "" node sync-cloud.js
node dist/main.js
pause
