---
name: implement-feature
description: >-
  Guia o ciclo completo de implementação de uma nova funcionalidade, desde o alinhamento arquitetural,
  desenvolvimento sênior, validação de QA, revisão de código e documentação técnica.
---

# ✨ Skill: Implement Feature

Esta skill define o fluxo de trabalho ponta a ponta para construir novas features com padrão profissional de engenharia.

## 📋 Passos de Execução

1. **Alinhamento e Design**:
   - O `orchestrator` define os requisitos e o escopo da entrega.
   - O `software-architect` define os contratos de dados, interfaces e padrões arquiteturais aplicáveis.

2. **Implementação pelo Senior Developer**:
   - Desenvolver os componentes de UI, páginas ou endpoints necessários.
   - Respeitar a coesão existente em `apps/web` e `apps/api`.
   - Garantir tipagem TypeScript estrita e tratamento de erros.

3. **Verificação de Qualidade com QA Tester**:
   - Executar testes de unidade e integração.
   - Validar cenários de borda (dados nulos, payload inválido, desconexões).

4. **Revisão de Código com Code Reviewer**:
   - Auditar o diff produzido, identificando pontos de melhoria classificados por severidade.
   - Aplicar ajustes necessários antes da conclusão.

5. **Auditoria de Segurança (se aplicável)**:
   - Validar autenticação, sanitização e ausência de vazamento de dados via `security-auditor`.

6. **Registro da Entrega**:
   - Atualizar a documentação no Obsidian Vault via `obsidian-memory`.
