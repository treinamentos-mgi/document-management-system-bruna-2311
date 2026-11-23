---
description: Implementa um requisito do DMS em uma camada ou fluxo existente.
name: implementar-requisito
argument-hint: requisito ou caminho da especificação
agent: agent
---

# Implementar requisito do DMS

Implemente `${input:requisito:requisito ou caminho da especificacao}` no projeto, preservando a arquitetura e o comportamento existentes.

Requisitos:

- Leia o requisito completo antes de alterar arquivos.
- Use Express/CommonJS no backend e React/Vite/ESM no frontend.
- Preserve o fluxo `routes -> controllers -> services -> repositories` no backend.
- Mantenha arquivos locais e metadados em memória, conforme a arquitetura atual.
- Faça alterações pequenas e relacionadas somente ao requisito.
- Adicione ou ajuste testes focados para o comportamento implementado.
- Execute a validação disponível mais específica para as alterações.
- Informe resumidamente os arquivos alterados e os testes executados.
