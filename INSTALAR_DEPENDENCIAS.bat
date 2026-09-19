@echo off
setlocal EnableExtensions
title Radar de Oportunidades - Dependencias

wsl --status >nul 2>nul
if errorlevel 1 (
  echo O WSL2, necessario para o backend Linux do Docker, nao esta instalado.
  echo Iniciando a instalacao do WSL. O Windows pode exigir reinicializacao.
  wsl --install --no-distribution
  echo Reinicie o Windows e execute este arquivo novamente.
  pause
  exit /b 0
)

where docker >nul 2>nul
if errorlevel 1 (
  echo Docker nao encontrado. Tentando instalar Docker Desktop via winget...
  where winget >nul 2>nul
  if errorlevel 1 (
    echo ERRO: winget nao esta disponivel. Instale o Docker Desktop manualmente.
    exit /b 1
  )
  winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo ERRO: a instalacao do Docker Desktop falhou ou foi cancelada.
    exit /b 1
  )
  echo Docker instalado. Feche e abra este arquivo novamente se o comando docker ainda nao estiver disponivel.
)

where docker >nul 2>nul
if errorlevel 1 (
  echo ERRO: reinicie o terminal apos instalar o Docker Desktop e execute novamente.
  exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
  echo Iniciando o Docker Desktop...
  start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
  echo Aguardando o Docker ficar pronto...
  for /l %%N in (1,1,30) do (
    docker info >nul 2>nul
    if not errorlevel 1 goto docker_ready
    timeout /t 2 /nobreak >nul
  )
  echo ERRO: Docker Desktop nao ficou pronto. Abra-o e execute novamente.
  exit /b 1
)

:docker_ready
echo Subindo PostgreSQL do projeto...
docker compose up -d postgres
if errorlevel 1 exit /b 1

echo Aplicando schema do banco...
call npx prisma db push
if errorlevel 1 exit /b 1

echo Concluido. O PostgreSQL esta ativo e o login pode ser testado.
pause
