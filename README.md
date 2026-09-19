# 🎯 Radar de Oportunidades

**Plataforma SaaS de Prospecção Comercial para Segurança Eletrônica**

CRM geográfico com inteligência comercial, mapas interativos, scoring de leads, gestão de pipeline, automações e IA — projetado para equipes que vendem soluções de CFTV, alarmes, controle de acesso e monitoramento 24 horas.

---

## 📋 Funcionalidades Principais

### MVP (v1.0)
- ✅ **Login & Autenticação** — JWT + Refresh Token + RBAC (6 perfis)
- ✅ **Dashboard** — 8 indicadores em tempo real + mapa interativo + leads em potencial
- ✅ **Mapa Interativo** — Leaflet/OpenStreetMap com marcadores por segmento, clusters, busca
- ✅ **Leads** — CRUD completo com 50+ campos, filtros avançados, geolocalização
- ✅ **Score de Segurança** — Pontuação 0-100 com 20+ fatores configuráveis
- ✅ **Pipeline CRM** — Kanban com 7 etapas e drag-and-drop
- ✅ **Visitas** — Agendamento com status e localização
- ✅ **Propostas** — Módulo completo com itens, valores e status
- ✅ **Ligações** — Registro com resultado e próxima ação
- ✅ **WhatsApp** — Botão com templates de mensagem
- ✅ **Produtos & Serviços** — Catálogo de segurança eletrônica
- ✅ **Clientes** — Conversão de lead para cliente
- ✅ **Equipe** — Gestão com ranking e produtividade
- ✅ **Metas** — Por vendedor, equipe e mês
- ✅ **Relatórios** — Gráficos com exportação (Excel, CSV, PDF)
- ✅ **IA Comercial** — Recomendações, rota inteligente, ranking de regiões
- ✅ **Notificações** — Alertas inteligentes

### Futuro (v2.0+)
- 🔜 Mapa de calor avançado
- 🔜 Rota inteligente com IA
- 🔜 WhatsApp Business API oficial
- 🔜 Machine Learning para previsão de conversão
- 🔜 Assinatura digital de propostas
- 🔜 Automações de follow-up
- 🔜 Inteligência de mercado territorial

---

## 🏗️ Arquitetura

```
radar-de-oportunidades/
├── apps/
│   ├── web/            → Next.js 14 (React, TypeScript, Tailwind, Shadcn/UI)
│   ├── api/            → NestJS (TypeScript, Prisma, PostgreSQL/PostGIS)
│   └── ai-service/     → FastAPI (Python, Pandas, Scikit-learn)
├── packages/
│   ├── database/       → Prisma schema, migrations, seeds
│   ├── types/          → TypeScript shared types/interfaces
│   ├── config/         → Shared configuration
│   └── utils/          → Shared utilities
├── docker/
│   └── postgres/       → PostgreSQL + PostGIS init scripts
├── docker-compose.yml  → PostgreSQL + PostGIS + Redis
└── turbo.json          → Turborepo monorepo config
```

---

## 🚀 Quick Start

### Pré-requisitos

- [Node.js](https://nodejs.org/) >= 20.0
- [Docker](https://www.docker.com/) & Docker Compose
- [Python](https://www.python.org/) >= 3.11 (para o serviço de IA)

### 1. Clone e configure

```bash
git clone <repo-url> radar-de-oportunidades
cd radar-de-oportunidades

# Copie as variáveis de ambiente
cp .env.example .env
```

### 2. Inicie os serviços de infraestrutura

```bash
# Sobe PostgreSQL + PostGIS + Redis
docker-compose up -d

# Aguarde os serviços ficarem saudáveis
docker-compose ps
```

### 3. Instale dependências e configure o banco

```bash
# Instale todas as dependências do monorepo
npm install

# Gere o Prisma Client
npm run db:generate

# Execute as migrations
npm run db:migrate

# Popule com dados de demonstração
npm run db:seed
```

### 4. Inicie o serviço de IA (Python)

```bash
cd apps/ai-service
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 5. Inicie a API e o Frontend

```bash
# Na raiz do projeto (em terminais separados)
cd apps/api && npm run start:dev    # API em http://localhost:3001
cd apps/web && npm run dev           # Frontend em http://localhost:3000
```

### 6. Acesse o sistema

Abra **http://localhost:3000** no navegador.

---

## 🔑 Credenciais de Demonstração

| Perfil | Email | Senha |
|--------|-------|-------|
| Administrador | admin@radar.com | radar123 |
| Gestor | gestor@radar.com | radar123 |
| Vendedor | carlos@radar.com | radar123 |
| Vendedor | rafael@radar.com | radar123 |
| Vendedor | andre@radar.com | radar123 |
| Vendedor | lucas@radar.com | radar123 |

---

## 🛠️ Stack Tecnológica

### Front-end
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Next.js | 14 | Framework React com App Router |
| React | 18 | Biblioteca UI |
| TypeScript | 5.5 | Tipagem estática |
| Tailwind CSS | 3.4 | Estilos utilitários |
| Shadcn/UI | - | Componentes de interface |
| Recharts | 2 | Gráficos e visualizações |
| Leaflet | 1.9 | Mapas interativos |
| Zustand | 4 | Gerenciamento de estado |
| TanStack Query | 5 | Cache e fetch de dados |

### Back-end
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| NestJS | 10 | Framework API |
| Prisma | 5 | ORM com PostgreSQL |
| PostgreSQL | 16 | Banco de dados |
| PostGIS | 3.4 | Extensão geoespacial |
| Redis | 7 | Cache |
| JWT | - | Autenticação |
| bcrypt | - | Criptografia de senhas |

### IA & Dados
| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| Python | 3.11 | Linguagem |
| FastAPI | 0.110 | Framework API |
| Pandas | 2 | Manipulação de dados |
| Scikit-learn | 1.5 | Machine Learning |
| NumPy | 1.26 | Computação numérica |

---

## 📊 Banco de Dados

O schema contém **32 tabelas** com suporte a PostGIS para geolocalização:

- **Autenticação**: users, roles, permissions, role_permissions
- **Segmentos**: segments (22 categorias de negócio)
- **Leads & CRM**: leads, contacts, addresses, scores, score_rules, score_factors
- **Pipeline**: pipelines, pipeline_stages
- **Interações**: activities, calls, messages, visits
- **Comercial**: proposals, proposal_items, products, services
- **Clientes**: customers, contracts
- **Equipe**: teams, goals, sales
- **Sistema**: tasks, notifications, attachments, audit_logs

### Consultas Geoespaciais (PostGIS)

```sql
-- Leads em um raio de 5km
SELECT * FROM leads l
JOIN addresses a ON a.lead_id = l.id
WHERE ST_DWithin(
  ST_MakePoint(a.longitude, a.latitude)::geography,
  ST_MakePoint(-46.6333, -23.5505)::geography,
  5000
);

-- Distância entre vendedor e lead
SELECT ST_Distance(
  ST_MakePoint(-46.6333, -23.5505)::geography,
  ST_MakePoint(a.longitude, a.latitude)::geography
) / 1000 as distance_km
FROM addresses a;
```

---

## 🔒 Segurança

- Senhas criptografadas com **bcrypt** (salt rounds: 12)
- Autenticação via **JWT** (access token: 15min, refresh token: 7 dias)
- **RBAC** com 6 perfis e permissões granulares
- **Rate Limiting** (100 req/min geral, 5 req/min login)
- **CORS** configurado por origem
- **Helmet** para headers de segurança
- **Validação** com class-validator em todos os endpoints
- **SQL Injection** prevenido pelo Prisma (queries parametrizadas)
- **Audit Log** em todas as operações de escrita
- **LGPD** com soft delete e exportação de dados

---

## 📡 API Endpoints

### Autenticação
```
POST /api/auth/login        → Login com email/senha
POST /api/auth/refresh      → Renovar token
POST /api/auth/logout       → Logout
```

### Leads
```
GET    /api/leads            → Listar com filtros e paginação
POST   /api/leads            → Criar lead
GET    /api/leads/:id        → Detalhes do lead
PUT    /api/leads/:id        → Atualizar lead
DELETE /api/leads/:id        → Remover lead (soft delete)
GET    /api/leads/nearby     → Leads próximos (PostGIS)
GET    /api/leads/high-score → Leads com score alto
```

### Mapa
```
GET /api/map/markers   → Marcadores para o mapa
GET /api/map/heatmap   → Dados de mapa de calor
GET /api/map/clusters  → Dados clusterizados
```

### Dashboard & Pipeline
```
GET /api/dashboard/stats → Indicadores do dashboard
GET /api/pipeline        → Pipeline com estágios e leads
PUT /api/pipeline/move   → Mover lead no pipeline
```

### CRM
```
POST /api/calls      → Registrar ligação
POST /api/visits     → Agendar visita
POST /api/proposals  → Criar proposta
```

### IA Comercial
```
POST /api/ai/recommendations → Recomendações de prospecção
POST /api/ai/route           → Rota inteligente otimizada
GET  /api/ai/regions         → Ranking de regiões
```

---

## 📝 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

## 👥 Equipe

Desenvolvido como plataforma comercial para equipes de vendas de segurança eletrônica.

---

*Radar de Oportunidades © 2024 — Plataforma SaaS de Prospecção Comercial*
