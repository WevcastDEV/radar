# 🚀 Guia de Deploy 24/7 do Robô WhatsApp na Nuvem

Este guia ensina como colocar o seu **Robô do WhatsApp e API do Radar de Oportunidades** rodando 100% do tempo ativo na nuvem (24 horas por dia, 7 dias por semana), sem depender do seu computador ficar ligado e sem nenhuma interrupção.

---

## 🌟 Opção 1: Deploy no Railway (Mais Recomendado - Rápido e Estável)

O [Railway](https://railway.app) é a melhor plataforma para robôs Baileys/WhatsApp porque suporta conexões contínuas de WebSocket e volumes para não deslogar o WhatsApp.

### Passo a passo (2 minutos):

1. Acesse **[railway.app](https://railway.app)** e entre com a sua conta do **GitHub**.
2. Clique no botão **"New Project"** (ou "+ New").
3. Selecione **"Deploy from GitHub repo"** e escolha o repositório **`WevcastDEV/radar`**.
4. O Railway detectará automaticamente o arquivo `railway.json` e o `apps/api/Dockerfile` que já configuramos.
5. Clique no card do projeto gerado e vá na aba **"Variables"**:
   - Adicione: `DATABASE_URL` = `file:./radar.db`
   - Adicione: `JWT_SECRET` = `radar-jwt-secret-change-in-production-2024`
   - Adicione: `NODE_ENV` = `production`
6. Vá na aba **"Settings"** > Seção **"Networking"**:
   - Clique em **"Generate Domain"** (ele gerará uma URL pública segura HTTPS, ex: `https://radar-api-production.up.railway.app`).
7. *(Opcional, para salvar a sessão do QR Code permanentemente)*:
   - Vá na aba **"Volumes"** > **"Add Volume"** > Monte o caminho como `/app/apps/api/auth_info_baileys`.

---

## 🌐 Conectando seu Painel Vercel com a API na Nuvem

Depois que a sua API estiver rodando no Railway:

1. Acesse o painel da **Vercel** ([vercel.com](https://vercel.com)).
2. Clique no seu projeto do **Radar de Oportunidades**.
3. Vá em **Settings** > **Environment Variables**.
4. Adicione (ou edite) as variáveis:
   - **`NEXT_PUBLIC_API_URL`**: A URL que o Railway gerou (ex: `https://radar-api-production.up.railway.app`)
   - **`INTERNAL_API_URL`**: A mesma URL do Railway (ex: `https://radar-api-production.up.railway.app`)
5. Vá na aba **Deployments** da Vercel e clique em **Redeploy**.

🎉 **Pronto!** Agora o painel na Vercel e o Robô no WhatsApp estão integrados 100% na nuvem. Você pode fechar o computador e o robô continuará atendendo seus clientes dia e noite!

---

## ⚡ Como rodar no seu computador sem fechar enquanto não faz o deploy:

Se quiser manter rodando no seu computador:
- Basta dar dois cliques no arquivo **`INICIAR_WHATSAPP.bat`** na pasta do projeto.
- Uma janela preta do Windows se abrirá com o QR Code e os logs em tempo real.
- **Deixe essa janela aberta minimizada** na sua barra de tarefas. Enquanto ela estiver aberta, o robô não para nunca!
