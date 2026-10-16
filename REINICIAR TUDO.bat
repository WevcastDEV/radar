@echo off
title REINICIAR TUDO - Radar de Oportunidades PRO
color 0B

echo ===================================================================
echo     REINICIANDO RADAR DE OPORTUNIDADES PRO - WCTECH
echo ===================================================================
echo.

:: 1. ENCERRAR PROCESSOS ANTERIORES NAS PORTAS 3000 E 3001
echo [1/3] Finalizando processos ativos nas portas 3000 e 3001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1
ping 127.0.0.1 -n 3 >nul

:: 2. VERIFICA SE O BUILD DO PAINEL EXISTE
if not exist "%~dp0apps\web\.next\BUILD_ID" (
    echo [!] Compilacao nao encontrada. Gerando build do Painel Web...
    cd /d "%~dp0apps\web"
    call npm run build
    cd /d "%~dp0"
)

:: 3. INICIAR BACKEND (API & WHATSAPP)
echo [2/3] Iniciando Servidor API e Robo WhatsApp (Porta 3001)...
start "Radar - API e WhatsApp" cmd /k "cd /d ""%~dp0apps\api"" && title Radar - API e WhatsApp && echo Servidor API Ativo... && node dist/main.js"

:: 4. INICIAR FRONTEND (PAINEL WEB)
echo [3/3] Iniciando Painel Web (Porta 3000)...
start "Radar - Painel Web" cmd /k "cd /d ""%~dp0apps\web"" && title Radar - Painel Web && echo Painel Web Ativo... && npm run start"

echo.
echo Aguardando inicializacao completa do sistema...
powershell -NoProfile -Command "$ready = $false; for ($i = 0; $i -lt 35; $i++) { try { $r1 = (Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 1).StatusCode; $r2 = (Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 1).StatusCode; if ($r1 -eq 200 -and $r2 -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 700 }; if ($ready) { Write-Host '  [OK] Todos os servicos estao 100% online!' -ForegroundColor Green } else { Write-Host '  [!] Abrindo navegador...' -ForegroundColor Yellow }"

set LOCAL_IP=
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "((Get-NetIPAddress -AddressFamily IPv4) | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' }).IPAddress | Select-Object -First 1"') do set LOCAL_IP=%%a
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo Abrindo o navegador no computador principal...
start http://localhost:3000/login

echo.
echo ===================================================================
echo   [OK] Radar de Oportunidades reiniciado com sucesso!
echo.
echo   - ACESSO NESTE COMPUTADOR (Servidor):
echo     http://localhost:3000
echo.
echo   - ACESSO EM OUTROS COMPUTADORES NA REDE LOCAL:
echo     http://%LOCAL_IP%:3000
echo.
echo   * Para liberar outros PCs pela primeira vez, execute:
echo     LIBERAR_REDE_LOCAL_ADMIN.bat
echo ===================================================================
ping 127.0.0.1 -n 4 >nul
exit
