---
name: review-code
description: >-
  Realiza análise estática e auditoria de qualidade em diffs ou arquivos de código,
  classificando apontamentos por criticidade (CRITICAL, HIGH, MEDIUM, LOW, SUGGESTION).
---

# 🧐 Skill: Review Code

Esta skill executa uma inspeção detalhada de código recém-desenvolvido ou refatorado.

## 📋 Passos de Execução

1. **Obtenção do Diff**:
   - Executar `git diff` ou inspecionar os arquivos alterados na demanda.

2. **Checklist de Verificação**:
   - **Corretude**: A lógica implementada resolve o problema pretendido?
   - **Segurança**: Há brechas de injeção, dados sensíveis expostos ou falta de sanitização?
   - **Performance**: Existem consultas N+1, re-renderizações desnecessárias ou loops ineficientes?
   - **Tratamento de Exceções**: Todas as chamadas assíncronas tratam falhas graciosamente?
   - **Tipagem**: Há uso indiscriminado de `any` ou supressões de linter?

3. **Classificação dos Apontamentos**:
   - Categorizar cada item encontrado em:
     - `CRITICAL` (impede release imediato)
     - `HIGH` (deve ser corrigido)
     - `MEDIUM` (débito a ser saneado)
     - `LOW` (polimento)
     - `SUGGESTION` (ideia futura)

4. **Emissão do Relatório**:
   - Apresentar o parecer técnico com trechos de código e propostas concretas de ajuste.
