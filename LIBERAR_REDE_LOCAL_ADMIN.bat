@echo off
title Liberar Radar na Rede Local - WCTECH
color 0A

:: 1. Verificacao e elevacao de privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ===================================================================
    echo   SOLICITANDO PERMISSAO DE ADMINISTRADOR DO WINDOWS...
    echo ===================================================================
    echo   Clique em "SIM" na janela que abrir para permitir que o
    echo   Radar configure o Firewall do Windows.
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 2. Deteccao automatica do IP local IPv4
set LOCAL_IP=
for /f "tokens=*" %%a in ('node -e "const os=require('os');const ifaces=os.networkInterfaces();let ip='127.0.0.1';for(const k in ifaces){for(const i of ifaces[k]){if(i.family==='IPv4'&&!i.internal&&!i.address.startsWith('169.254.')){ip=i.address;break;}}if(ip!=='127.0.0.1')break;}console.log(ip);"') do set LOCAL_IP=%%a
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

cls
echo ===================================================================
echo     CONFIGURANDO FIREWALL DO WINDOWS - RADAR DE OPORTUNIDADES
echo     Permitindo acesso de outros computadores na rede local
echo ===================================================================
echo.

echo [1/2] Liberando porta 3000 (Painel Web)...
netsh advfirewall firewall delete rule name="Radar Web (Porta 3000)" >nul 2>&1
netsh advfirewall firewall add rule name="Radar Web (Porta 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1

echo [2/2] Liberando porta 3001 (API e WhatsApp)...
netsh advfirewall firewall delete rule name="Radar API (Porta 3001)" >nul 2>&1
netsh advfirewall firewall add rule name="Radar API (Porta 3001)" dir=in action=allow protocol=TCP localport=3001 profile=any >nul 2>&1

echo.
echo ===================================================================
echo   [SUCESSO] REDE LOCAL E FIREWALL 100%% CONFIGURADOS!
echo ===================================================================
echo.
echo   1. NESTE COMPUTADOR (Servidor):
echo      Acesse pelo navegador: http://localhost:3000
echo.
echo   2. EM QUALQUER OUTRO COMPUTADOR OU CELULAR NA MESMA REDE WI-FI/CABO:
echo      Basta abrir o navegador e digitar o endereco:
echo.
echo         http://%LOCAL_IP%:3000
echo.
echo   Todos os computadores acessarao o mesmo sistema com:
echo   - Metas sincronizadas em tempo real
echo   - Gestao de vendas compartilhada
echo   - Leads e WhatsApp centralizados
echo ===================================================================
echo.
pause
exit /b 0
