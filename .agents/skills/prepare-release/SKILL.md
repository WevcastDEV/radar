---
name: prepare-release
description: >-
  Prepara uma release de software com compilação de produção, atualização do Changelog,
  commits semânticos no Git e empacotamento do arquivo ZIP de distribuição.
---

# 📦 Skill: Prepare Release

Esta skill automatiza a preparação e empacotamento de uma nova versão do projeto para entrega.

## 📋 Passos de Execução

1. **Validação do Build de Produção**:
   - Executar `npm run build` no backend e frontend para certificar ausência de erros de compilação.

2. **Atualização do Changelog**:
   - Atualizar `Changelog.md` no projeto e no Obsidian Vault com as alterações sob o padrão Conventional Commits.

3. **Auditoria de Arquivos para o Git**:
   - Verificar se arquivos temporários, logs ou segredos foram devidamente ignorados no `.gitignore`.

4. **Geração do Pacote de Distribuição**:
   - Executar o script de compactação para gerar o arquivo ZIP limpo em `C:\Users\Administrator\Documents\<Nome-do-Projeto>.zip`.
   - Confirmar o tamanho e a integridade do pacote gerado.
