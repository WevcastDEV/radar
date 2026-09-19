---
name: fix-bug
description: >-
  Executa o procedimento rigoroso de triagem, isolamento, reprodução, identificação da causa raiz,
  correção pontual e validação de bugs, registrando o aprendizado no Obsidian Vault.
---

# 🐛 Skill: Fix Bug

Esta skill guia o tratamento estruturado de defeitos para garantir que a causa raiz seja eliminada de forma definitiva, sem mascarar sintomas.

## 📋 Passos de Execução

1. **Captura do Sintoma & Coleta de Evidências**:
   - Coletar logs de execução, saídas de erro, stack traces e respostas HTTP anômalas.
   - Isolar o comportamento esperado versus o comportamento real.

2. **Formulação de Hipóteses e Teste de Reprodução**:
   - Formular hipóteses técnicas testáveis sobre o motivo da falha.
   - Reproduzir o erro em ambiente de desenvolvimento de forma controlada.

3. **Identificação da Causa Raiz**:
   - Rastrear o fluxo de execução até o ponto exato da quebra lógica, tipagem incorreta ou falha de infraestrutura.

4. **Implementação da Correção**:
   - Aplicar a solução de menor complexidade necessária, mantendo o padrão do projeto.
   - Nunca utilizar silenciadores de erro (ex: try/catch vazio ou `as any`).

5. **Validação & Testes de Regressão**:
   - Executar os testes automatizados ou simulações manuais para provar a resolução.
   - Verificar se áreas correlatas continuam funcionando perfeitamente.

6. **Documentação no Obsidian**:
   - Acionar o `obsidian-memory` para registrar a ficha do bug na pasta `Projects/<nome-projeto>/Bugs/`.
