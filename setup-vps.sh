#!/bin/bash
# ==============================================================================
# Script de Inicialização Automatizada para VPS - Radar de Oportunidades PRO
# Sistema Operacional Suportado: Ubuntu 22.04 LTS / 24.04 LTS / Debian 12
# ==============================================================================

set -e

echo "=========================================================="
echo "🚀 Iniciando Configuração da VPS para o Radar de Oportunidades"
echo "=========================================================="

# 1. Atualização do Sistema
echo "📦 Atualizando repositórios e pacotes do sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalação de Utilitários Essenciais
echo "🔧 Instalando pacotes básicos (curl, git, ufw, nginx, certbot)..."
sudo apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx

# 3. Configuração de SWAP (2GB) para prevenir estouro de memória no build
if [ ! -f /swapfile ]; then
    echo "💾 Criando Swap de 2GB para estabilidade do sistema..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap configurada com sucesso!"
fi

# 4. Instalação do Node.js 20 LTS
echo "🟢 Instalando Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 5. Instalação do PM2 para manter o robô rodando 24/7
echo "⚡ Instalando PM2 e ferramentas globais..."
sudo npm install -g pm2 turbo

# 6. Configuração de Firewall Básico
echo "🛡️ Configurando Firewall (SSH, HTTP, HTTPS)..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "=========================================================="
echo "🎉 VPS Configurada com Sucesso!"
echo "Node.js Versão: $(node -v)"
echo "NPM Versão:     $(npm -v)"
echo "PM2 Versão:     $(pm2 -v)"
echo "=========================================================="
echo "Próximo passo: Clone seu repositório e rode o deploy!"
