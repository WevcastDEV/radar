@echo off
title Radar de Oportunidades - Wev Engineer
color 0B

echo.
echo ======================================================
echo           RADAR DE OPORTUNIDADES
echo    Plataforma SaaS de Prospeccao Comercial
echo    Wev Engineer Servicos - CFTV, Alarmes e TI
echo ======================================================
echo.

:MENU
echo ------------------------------------------------------
echo   Selecione uma opcao:
echo.
echo   [1] INICIAR TUDO (Painel Web + Robo do WhatsApp)
echo   [2] Iniciar apenas o Painel Web (Next.js)
echo   [3] Iniciar apenas o Robo do WhatsApp (NestJS)
echo   [4] Parar todos os servicos em execucao
echo   [5] Reinstalar dependencias do sistema
echo   [0] Sair
echo ------------------------------------------------------
echo.

set /p opcao="  Digite a opcao (1 a 5, ou 0): "

if "%opcao%"=="1" goto START_ALL
if "%opcao%"=="2" goto FRONTEND
if "%opcao%"=="3" goto API
if "%opcao%"=="4" goto STOP_ALL
if "%opcao%"=="5" goto REINSTALL
if "%opcao%"=="0" goto EXIT

echo.
echo   [!] Opcao invalida. Tente novamente.
echo.
goto MENU

:START_ALL
echo.
echo ======================================================
echo   INICIANDO RADAR DE OPORTUNIDADES + ROBO WHATSAPP
echo ======================================================
echo.
echo Liberando portas 3000 e 3001 caso estejam em uso...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1

echo [1/3] Iniciando Servidor Backend e Robo do WhatsApp (Banco SQLite Local)...
start "Radar - API e WhatsApp" cmd /k "cd /d ""%~dp0apps\api"" && title Radar - API e WhatsApp && echo Iniciando Servidor e WhatsApp... && node dist/main.js"
echo       OK - Terminal do WhatsApp aberto!

echo [2/3] Iniciando Painel Web Otimizado (Modo Turbo)...
start "Radar - Painel Web" cmd /k "cd /d ""%~dp0apps\web"" && title Radar - Painel Web && echo Iniciando Painel Web... && npm run start"
echo       OK - Terminal do Painel Web aberto!

echo [3/3] Aguardando inicializacao completa dos servidores (API e Painel Web)...
powershell -NoProfile -Command "$ready = $false; for ($i = 0; $i -lt 40; $i++) { try { $r1 = (Invoke-WebRequest -Uri 'http://localhost:3000/login' -UseBasicParsing -TimeoutSec 1).StatusCode; $r2 = (Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 1).StatusCode; if ($r1 -eq 200 -and $r2 -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 700 }; if ($ready) { Write-Host '      [OK] Servidores 100% prontos e conectados!' -ForegroundColor Green } else { Write-Host '      [!] Abrindo navegador...' -ForegroundColor Yellow }"

echo ======================================================
echo   SISTEMA INICIADO COM SUCESSO!
echo ======================================================
echo.
echo   Painel Web:      http://localhost:3000
echo   Conectar Whats:  http://localhost:3000/settings
echo   API Backend:     http://localhost:3001/api
echo.
echo Abrindo o navegador automaticamente...
start http://localhost:3000
echo.
pause
goto MENU

:FRONTEND
echo.
echo Iniciando Painel Web...
start "Radar - Painel Web" cmd /k "cd /d ""%~dp0apps\web"" && title Radar - Painel Web && npm run dev"
timeout /t 4 /nobreak >nul
start http://localhost:3000
echo OK - Painel aberto em http://localhost:3000
echo.
pause
goto MENU

:API
echo.
echo Iniciando Servidor e Robo do WhatsApp...
start "Radar - API e WhatsApp" cmd /k "cd /d ""%~dp0apps\api"" && title Radar - API e WhatsApp && echo Iniciando Servidor e WhatsApp... && node dist/main.js"
echo OK - Terminal aberto.
echo.
pause
goto MENU

:STOP_ALL
echo.
echo Encerrando servicos...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Radar - API*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Radar - Painel*" >nul 2>&1
echo OK - Todos os servicos foram encerrados.
echo.
pause
goto MENU

:REINSTALL
echo.
echo Atualizando dependencias do projeto...
call npm install
if exist "%~dp0packages\database" (
    cd /d "%~dp0packages\database"
    call npx prisma generate
    cd /d "%~dp0"
)
echo.
echo OK - Dependencias atualizadas com sucesso!
echo.
pause
goto MENU

:EXIT
echo.
echo Ate logo!
echo.
timeout /t 2 >nul
exit /b 0