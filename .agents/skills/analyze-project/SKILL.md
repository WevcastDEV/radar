---
name: analyze-project
description: >-
  Analisa minuciosamente o projeto, inspecionando a arquitetura monorepo, dependências,
  scripts package.json, variáveis de ambiente, status do Git e integridade geral do sistema.
---

# 🔍 Skill: Analyze Project

Esta skill fornece o procedimento padronizado para mapear e auditar o projeto de ponta a ponta antes de iniciar grandes implementações.

## 📋 Passos de Execução

1. **Inspecionar Estrutura e Monorepo**:
   - Analisar `package.json` raiz, `turbo.json` e workspaces configurados (`apps/*`, `packages/*`).
   - Identificar serviços ativos: Frontend (Next.js), Backend (NestJS), workers ou microsserviços.

2. **Verificar Dependências e Scripts**:
   - Checar se todos os pacotes necessários estão instalados e se não há conflitos de versões entre workspaces.
   - Listar os comandos oficiais de build, dev e start de cada workspace.

3. **Inspecionar Variáveis de Ambiente**:
   - Verificar a presença e conformidade dos arquivos `.env` e `.env.example` sem expor segredos.
   - Confirmar portas de rede configuradas (ex: API 3001, Frontend 3000).

4. **Auditar Status do Git**:
   - Executar `git status` para identificar arquivos não rastreados, modificações pendentes ou divergências de branch.

5. **Consolidar Diagnóstico**:
   - Produzir um relatório conciso para o `orchestrator` com a saúde do repositório e pontos de atenção.
