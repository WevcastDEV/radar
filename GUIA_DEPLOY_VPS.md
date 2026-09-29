# 🚀 Plano de Ação: Deploy do Radar de Oportunidades 100% Ativo em VPS

Sim! Uma **VPS (Virtual Private Server - Linux Ubuntu)** é o ambiente **mais recomendado, profissional e estável** para o Radar de Oportunidades e o Robô do WhatsApp.

---

## 💡 Por que a VPS resolve 100% dos problemas?

| Plataforma Serverless (Vercel/Render free) | VPS Própria (Ubuntu / PM2 / Docker) |
| :--- | :--- |
| ❌ Servidor "dorme" após minutos sem acesso | ✅ **Fica ligado 24h por dia, 7 dias por semana** |
| ❌ Desconecta o WebSocket do WhatsApp | ✅ **Conexão persistente ininterrupta** |
| ❌ IP muda constantemente (pode gerar bloqueio) | ✅ **IP fixo dedicado** |
| ❌ Apaga a pasta de sessão do WhatsApp ao reiniciar | ✅ **Sessão do QR Code fica salva para sempre no SSD** |
| ❌ Limite de 10 a 60 segundos por requisição | ✅ **Sem limites de timeout para disparos em massa** |

---

## 🖥️ 1. Requisitos Recomendados da VPS

* **Sistema Operacional:** Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS (ou Debian 12)
* **Processador:** 1 ou 2 vCPUs
* **Memória RAM:** 2 GB de RAM *(com 2GB de Swap que o script já cria)*
* **Armazenamento:** 20 GB a 40 GB SSD / NVMe
* **Onde Contratar (Custo-Benefício):**
  * **Hetzner Cloud:** ~€3,79 a €5,00/mês *(Excelente performance e estabilidade)*
  * **Hostinger VPS:** ~R$ 29 a R$ 39/mês *(Servidor no Brasil ou EUA, suporte em português)*
  * **DigitalOcean / Linode:** ~$6,00/mês
  * **Contabo:** ~€4,50/mês *(Muito espaço e memória)*
  * **Oracle Cloud:** Nível gratuito permanente (*Always Free Tier* de até 4 OCPU e 24GB RAM)

---

## 📋 2. Plano de Ação Passo a Passo

### Passo 1: Acessar a VPS via Terminal (SSH)
No seu computador Windows, abra o PowerShell ou terminal e conecte na sua VPS:
```bash
ssh root@IP_DA_SUA_VPS
```
*(Substitua `IP_DA_SUA_VPS` pelo endereço IP fornecido pelo provedor)*

---

### Passo 2: Executar o Script Automático de Instalação
Rode o comando único para instalar Node.js 20, PM2, Git, Nginx e configurar o Swap:
```bash
curl -fsSL https://raw.githubusercontent.com/WevcastDEV/radar/main/setup-vps.sh | bash
```
*(Ou clone o projeto primeiro e rode `./setup-vps.sh`)*

---

### Passo 3: Baixar o Projeto
```bash
cd /var/www
git clone https://github.com/WevcastDEV/radar.git
cd radar
```

---

### Passo 4: Instalar Dependências e Compilar
```bash
# 1. Instalar pacotes
npm install

# 2. Gerar cliente do banco de dados
npm run db:generate

# 3. Compilar a API e o Frontend
cd apps/api && npm run build && cd ../..
cd apps/web && npm run build && cd ../..
```

---

### Passo 5: Iniciar o Sistema 24/7 com PM2
O repositório já possui o arquivo `ecosystem.config.js` pronto:
```bash
# Inicia a API do WhatsApp (porta 3001) e o Frontend (porta 3000)
pm2 start ecosystem.config.js

# Configura o PM2 para ligar sozinho caso a VPS seja reiniciada
pm2 startup
pm2 save
```

Para acompanhar os logs em tempo real:
```bash
pm2 logs
# ou monitor visual:
pm2 monit
```

---

### Passo 6: Configurar o Nginx e Certificado SSL Grátis (HTTPS)
1. Copie o arquivo de configuração do Nginx:
```bash
sudo cp nginx-radar.conf /etc/nginx/sites-available/radar
sudo ln -s /etc/nginx/sites-available/radar /etc/nginx/sites-enabled/
```
2. Edite o domínio (se tiver domínio próprio, ex: `radar.meusite.com`):
```bash
sudo nano /etc/nginx/sites-available/radar
```
3. Teste e reinicie o Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```
4. Gere o certificado SSL Gratuito Let's Encrypt (opcional, se tiver domínio apontado):
```bash
sudo certbot --nginx -d seu-dominio.com
```

---

## 🎯 3. Monitoramento e Comandos Úteis no Dia a Dia

* Ver status de todos os serviços: `pm2 status`
* Ver logs do robô WhatsApp: `pm2 logs radar-api`
* Reiniciar o robô: `pm2 restart radar-api`
* Parar tudo: `pm2 stop all`
* Atualizar para uma versão nova do Git:
  ```bash
  git pull origin main
  npm run db:generate
  cd apps/api && npm run build && cd ../..
  cd apps/web && npm run build && cd ../..
  pm2 restart all
  ```
