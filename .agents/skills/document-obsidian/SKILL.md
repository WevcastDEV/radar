---
name: document-obsidian
description: >-
  Estrutura e arquiva notas técnicas, ADRs, fichas de bugs resolvidos, DevLogs e documentação
  de projetos diretamente no Vault do Obsidian utilizando o padrão oficial.
---

# 📚 Skill: Document Obsidian

Esta skill padroniza a transferência e organização do conhecimento gerado pelo time de desenvolvimento para o Obsidian Vault.

## 📋 Passos de Execução

1. **Localizar o Vault do Usuário**:
   - Validar o diretório `C:\Users\Administrator\Documents\Obsidian Vault`.
   - Se a pasta do projeto não existir, criá-la em `Projects/<nome-projeto>/`.

2. **Selecionar a Categoria da Documentação**:
   - **Decisão de Arquitetura**: Gravar em `Projects/<nome-projeto>/Decisions/ADR-XXX-[titulo].md`.
   - **Bug Resolvido**: Gravar em `Projects/<nome-projeto>/Bugs/BUG-XXX-[titulo].md`.
   - **Diário de Desenvolvimento**: Gravar em `Projects/<nome-projeto>/DevLog/YYYY-MM-DD.md`.
   - **Visão Geral / Tarefas**: Atualizar `Overview.md`, `Architecture.md` ou `Tasks.md`.

3. **Aplicar Formatação e Segurança**:
   - Inserir YAML frontmatter no cabeçalho com tags e datas.
   - Interligar as notas utilizando wikilinks: `[[Nome da Nota]]`.
   - **MANDATÓRIO**: Substituir qualquer chave de API, senha ou segredo por `[REDACTED]`.

4. **Confirmar Gravação e Integridade**:
   - Garantir que o arquivo foi gravado com codificação UTF-8 sem corrupção de caracteres.
