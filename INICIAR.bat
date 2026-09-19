@echo off
title Radar de Oportunidades PRO - WCTECH
color 0B

:: ============================================================
:: 1. VERIFICACAO DO NODE.JS
:: ============================================================
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ======================================================
    echo   [!] ERRO: Node.js nao foi encontrado neste PC!
    echo ======================================================
    echo.
    echo   Para rodar o Radar de Oportunidades, voce precisa
    echo   instalar o Node.js - versao 20 LTS recomendada.
    echo.
    echo   Abrindo a pagina oficial do Node.js...
    start https://nodejs.org/
    echo.
    echo   Apos concluir a instalacao, feche esta janela
    echo   e execute o INICIAR.bat novamente.
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: 2. CONFIGURACAO AUTOMATICA DE AMBIENTE (.env)
:: ============================================================
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" copy "%~dp0.env.example" "%~dp0.env" >nul
)

if not exist "%~dp0apps\web\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:3001/api> "%~dp0apps\web\.env.local"
)

:: ============================================================
:: 3. LIMPEZA DE PORTAS (EVITA ERRO DE PORTA JA EM USO)
:: ============================================================
REM Processos existentes devem ser encerrados pelo operador antes de reiniciar.
REM Processos existentes devem ser encerrados pelo operador antes de reiniciar.

:: ============================================================
:: 4. INSTALACAO AUTOMATICA DE DEPENDENCIAS
:: ============================================================
if not exist "%~dp0node_modules" (
    color 0E
    echo.
    echo ======================================================
    echo   PRIMEIRA EXECUCAO DETECTADA NESTE COMPUTADOR!
    echo   Instalando dependencias do sistema...
    echo   Isso acontece apenas uma vez, por favor aguarde...
    echo ======================================================
    echo.
    cd /d "%~dp0"
    call npm install
    if exist "%~dp0packages\database" (
        echo Configurando banco de dados Prisma...
        cd /d "%~dp0packages\database"
        call npx prisma generate
    )
    cd /d "%~dp0"
    color 0B
)

:: ============================================================
:: 5. MENU DE INICIALIZACAO INTELIGENTE WCTECH
:: ============================================================
cls
echo.
echo ===================================================================
echo     RADAR DE OPORTUNIDADES PRO - PLATAFORMA B2B
echo     Powered by WCTECH ^| Weverton Castelo Branco
echo ===================================================================
echo.
echo   [1] Iniciar Sistema Completo (Modo Turbo Otimizado - Padrao)
echo   [2] Recompilar e Iniciar (Use quando houver alteracoes no visual)
echo   [3] Iniciar em Modo Desenvolvedor (Atualizacao em Tempo Real)
echo   [4] Abrir Landing Page de Vendas (Apresentacao para Clientes)
echo.
echo ===================================================================
echo   Iniciando automaticamente a opcao [1] em 5 segundos...
echo   (Ou digite o numero da opcao desejada e aperte ENTER)
echo ===================================================================

choice /C 1234 /T 5 /D 1 /M "Selecione uma opcao:"
set opcao=%errorlevel%

if "%opcao%"=="4" (
    echo.
    echo Abrindo Landing Page de Vendas...
    start "" "%~dp0landing-page-vendas.html"
    exit /b 0
)

if "%opcao%"=="2" (
    color 0E
    echo.
    echo ======================================================
    echo   Recompilando Painel Web com as novas modificacoes...
    echo   Aguarde a geracao dos arquivos atualizados...
    echo ======================================================
    echo.
    cd /d "%~dp0apps\web"
    call npm run build
    cd /d "%~dp0"
    color 0A
)

:: Compilacao automatica se .next nao existir
if not exist "%~dp0apps\web\.next" (
    color 0E
    echo.
    echo Compilando Painel Web inicial...
    cd /d "%~dp0apps\web"
    call npm run build
    cd /d "%~dp0"
    color 0A
)

:: ============================================================
:: 6. INICIALIZACAO DOS SERVICOS
:: ============================================================
cls
echo.
echo ===================================================================
echo    RADAR DE OPORTUNIDADES PRO - WCTECH
echo    Sistema 100%% Ativo e Operacional
echo ===================================================================
echo.

echo [1/2] Iniciando Servidor API e Robô WhatsApp (Porta 3001)...
start "Radar - API e WhatsApp" cmd /k "cd /d ""%~dp0apps\api"" && title Radar - API e WhatsApp && echo Iniciando Servidor API... && npm run start:dev"

if "%opcao%"=="3" (
    echo [2/2] Iniciando Painel Web em Modo DEV (Live Reload)...
    start "Radar - Painel Web" cmd /k "cd /d ""%~dp0apps\web"" && title Radar - Painel Web [DEV] && echo Iniciando Painel Web Modo Dev... && npm run dev"
) else (
    echo [2/2] Iniciando Painel Web em Alta Velocidade Turbo (Porta 3000)...
    start "Radar - Painel Web" cmd /k "cd /d ""%~dp0apps\web"" && title Radar - Painel Web [TURBO] && echo Iniciando Painel Web Turbo... && npm run start"
)

echo.
echo Aguardando inicializacao dos servidores...
ping 127.0.0.1 -n 6 >nul

echo Abrindo o navegador no Radar de Oportunidades...
start http://localhost:3000/login

echo.
echo ===================================================================
echo   [OK] Radar de Oportunidades PRO iniciado com sucesso!
echo   Pressione qualquer tecla ou feche esta janela para sair.
echo ===================================================================
ping 127.0.0.1 -n 3 >nul
exit