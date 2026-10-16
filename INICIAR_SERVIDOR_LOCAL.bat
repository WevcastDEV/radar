@echo off
title Radar de Oportunidades PRO - SERVIDOR CENTRAL (Rede Local ^& Multi-Maquinas)
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
    echo   Instale o Node.js v20 LTS para executar o servidor.
    start https://nodejs.org/
    pause
    exit /b 1
)

:: ============================================================
:: 2. AMBIENTE E CONFIGURACOES (.env)
:: ============================================================
if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" copy "%~dp0.env.example" "%~dp0.env" >nul
)

if not exist "%~dp0apps\web\.env.local" (
    echo INTERNAL_API_URL=http://127.0.0.1:3001/api> "%~dp0apps\web\.env.local"
    echo NEXT_PUBLIC_API_URL=/api>> "%~dp0apps\web\.env.local"
)

:: ============================================================
:: 3. LIMPEZA DE PROCESSOS NAS PORTAS 3000 E 3001
:: ============================================================
echo [1/4] Liberando portas 3000 e 3001...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }" >nul 2>&1

:: ============================================================
:: 4. DETECCAO DO IP DA REDE LOCAL (IPv4)
:: ============================================================
set LOCAL_IP=
for /f "tokens=*" %%a in ('node -e "const os=require('os');const ifaces=os.networkInterfaces();let ip='127.0.0.1';for(const k in ifaces){for(const i of ifaces[k]){if(i.family==='IPv4'&&!i.internal&&!i.address.startsWith('169.254.')){ip=i.address;break;}}if(ip!=='127.0.0.1')break;}console.log(ip);"') do set LOCAL_IP=%%a
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

:: ============================================================
:: 5. INICIALIZACAO DOS SERVICOS DO SERVIDOR CENTRAL
:: ============================================================
cls
echo ===================================================================
echo     RADAR DE OPORTUNIDADES PRO - SERVIDOR CENTRAL (LAN)
echo     Modo Servidor Dedicado com WhatsApp Compartilhado
echo ===================================================================
echo.
echo   IP Local Detectado: %LOCAL_IP%
echo.
echo [2/4] Iniciando Servidor API e Modulo WhatsApp (Porta 3001)...
start "Radar [Servidor API]" cmd /k "cd /d ""%~dp0apps\api"" && title Radar [Servidor API] && echo Servidor API ativo na porta 3001... && node --max-old-space-size=2048 dist/main.js"

echo [3/4] Iniciando Servidor Web (Porta 3000)...
start "Radar [Servidor Web]" cmd /k "cd /d ""%~dp0apps\web"" && title Radar [Servidor Web] && echo Painel Web ativo na porta 3000... && set NODE_OPTIONS=--max-old-space-size=2048 && npm run start"

echo [4/4] Aguardando servidores ficarem 100%% operacionais...
powershell -NoProfile -Command "$ready = $false; for ($i = 0; $i -lt 40; $i++) { try { $r1 = (Invoke-WebRequest -Uri 'http://localhost:3000/login' -UseBasicParsing -TimeoutSec 1).StatusCode; $r2 = (Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 1).StatusCode; if ($r1 -eq 200 -and $r2 -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Milliseconds 700 }; if ($ready) { Write-Host '  [OK] Servidor Central conectado e operando!' -ForegroundColor Green } else { Write-Host '  [!] Aguardando resposta final...' -ForegroundColor Yellow }"

echo Abrindo o painel no navegador deste computador...
start http://localhost:3000/login

cls
color 0A
echo.
echo ===================================================================
echo    SERVIDOR CENTRAL RADAR DE OPORTUNIDADES ESTA ONLINE!
echo ===================================================================
echo.
echo   1. NESTE COMPUTADOR SERVIDOR (Localhost):
echo      http://localhost:3000
echo.
echo   2. EM QUALQUER OUTRO COMPUTADOR OU NOTEBOOK NA MESMA REDE:
echo      http://%LOCAL_IP%:3000
echo.
echo   3. WHATSAPP MULTI-OPERADOR:
echo      - O WhatsApp conectado neste PC Servidor alimenta TODAS
echo        as maquinas que acessarem pelo link acima.
echo      - Cada atendente pode logar com seu proprio usuario
echo        e suas mensagens sairao assinadas com seu nome.
echo.
echo   * NOTA: Se outro computador nao conseguir abrir a pagina,
echo     execute o arquivo LIBERAR_REDE_LOCAL_ADMIN.bat como Administrador
echo     para liberar as portas 3000 e 3001 no Firewall do Windows.
echo ===================================================================
echo.
echo Pressione qualquer tecla para fechar este aviso (os servidores continuarao rodando).
pause >nul
exit
