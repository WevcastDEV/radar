---
name: security-check
description: >-
  Executa auditoria estática de segurança, checagem de vulnerabilidades de dependências (npm audit),
  verificação de secrets expostos e validação de sanitização de dados.
---

# 🛡️ Skill: Security Check

Esta skill fornece uma rotina rápida e consistente para auditar os aspectos de segurança do sistema.

## 📋 Passos de Execução

1. **Verificação de Vulnerabilidades de Pacotes**:
   - Executar `npm audit` ou auditoria equivalente nos workspaces.
   - Sinalizar vulnerabilidades com severidade HIGH ou CRITICAL.

2. **Busca de Secrets Expostos**:
   - Varrer o repositório em busca de chaves privadas, senhas hardcoded ou arquivos `.env` acidentalmente rastreados.

3. **Inspeção de Contratos de Entrada**:
   - Verificar se todos os endpoints NestJS utilizam DTOs com `class-validator` ativo.
   - Verificar se entradas do usuário no Next.js são sanitizadas antes de renderização no DOM.

4. **Emissão do Relatório de Segurança**:
   - Apresentar o parecer com status de risco e mitigações imediatas.
