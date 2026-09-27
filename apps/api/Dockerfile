# ==============================================================================
# Dockerfile Multi-stage para Deploy do Servidor API & Robô WhatsApp 24/7
# Compatível com Railway, Render, Fly.io e VPS
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências necessárias para compilação (Python/Make se necessário)
RUN apk add --no-cache python3 make g++ git

# Copia arquivos de dependências
COPY package*.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Instala todas as dependências do monorepo
RUN npm install

# Gera o cliente Prisma para o banco de dados
RUN cd packages/database && npx prisma generate

# Compila o NestJS da API
RUN cd apps/api && npm run build

# ==============================================================================
# Imagem Final de Execução
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copia build e dependências de produção
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api

# Volume persistente para salvar a sessão do WhatsApp e banco local SQLite
VOLUME ["/app/apps/api/auth_info_baileys", "/app/apps/api/data"]

EXPOSE 3001

CMD ["node", "dist/main.js"]
