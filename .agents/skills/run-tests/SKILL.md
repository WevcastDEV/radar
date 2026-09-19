---
name: run-tests
description: >-
  Descobre e executa suítes de testes unitários, testes de integração, testes de build e checagem de tipos TypeScript,
  consolidando os resultados de aprovação e falhas.
---

# 🧪 Skill: Run Tests

Esta skill fornece o procedimento para executar todas as validações de código e testes automatizados existentes no ecossistema.

## 📋 Passos de Execução

1. **Descoberta do Ambiente de Testes**:
   - Identificar quais comandos estão definidos em `apps/api/package.json` e `apps/web/package.json`.
   - Exemplos: `npm test`, `npm run test:e2e`, `npm run build`.

2. **Checagem de Tipos e Linter**:
   - Validar integridade do TypeScript em cada workspace para garantir 0 erros de compilação.

3. **Execução das Suítes de Testes**:
   - Executar os testes automatizados registrando tempo de execução e status.

4. **Relatório de Diagnóstico**:
   - Consolidar testes aprovados, testes quebrados e recomendações de correção.
