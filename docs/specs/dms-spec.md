# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web de usuário único para enviar, listar e baixar documentos armazenados no filesystem local, com metadados mantidos em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição HTTP.
- Listagem dos documentos associados à identidade local configurada.
- Download de um documento pelo identificador.
- Associação dos documentos ao valor de `DMS_OWNER_ID`, que identifica o usuário único desta instalação.
- Frontend React que consome a API por `fetch`.
- Armazenamento de arquivos em `backend/storage` usando Multer com `diskStorage`.
- Metadados mantidos em memória durante a execução do processo.

### Fora do escopo

- Cadastro de usuários, login, autenticação por token ou autorização multiusuário.
- Armazenamento em nuvem, banco de dados ou provedores externos.
- Versionamento, edição, exclusão e compartilhamento de documentos.
- Persistência ou recuperação automática dos metadados após reiniciar o backend.
- Busca, filtros, paginação e organização em pastas.

### Premissas e limites conhecidos

- O backend implementa as rotas de documentos e mantém `GET /health` para verificação de saúde.
- A aplicação é para uma instalação local ou ambiente confiável de usuário único. Sem autenticação, não deve ser exposta a usuários não confiáveis.
- `DMS_OWNER_ID` identifica o dono dos documentos e é lido na inicialização. Quando ausente ou vazio, o valor padrão é `local-user`.
- O upload aceita um arquivo no campo `file`. Não há política definida para tamanho máximo ou tipos de arquivo. Esses limites devem ser decididos antes de disponibilizar o serviço fora de um ambiente local controlado; não se deve interpretar a ausência de regra como autorização para uploads ilimitados.
- O prefixo `/api` é usado pelo frontend através do proxy de desenvolvimento do Vite. Os caminhos definidos abaixo são os caminhos da API no backend, sem esse prefixo.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O sistema deve aceitar um arquivo por requisição de upload, recebido em `multipart/form-data` no campo `file`. |
| RF-02 | O sistema deve salvar o conteúdo do arquivo no filesystem local em `backend/storage`, usando Multer com `diskStorage`. |
| RF-03 | Ao concluir o upload, o sistema deve gerar um identificador único e registrar metadados do documento em memória, incluindo seu dono configurado. |
| RF-04 | O usuário local deve poder listar os metadados dos documentos disponíveis para a identidade configurada. |
| RF-05 | O usuário local deve poder baixar um documento pelo identificador, usando seu nome original como nome sugerido para o arquivo baixado. |
| RF-06 | O sistema deve responder com erro apropriado quando o arquivo obrigatório não for enviado, o documento solicitado não existir ou ocorrer falha de armazenamento/leitura. |
| RF-07 | O sistema não deve expor o nome original como caminho físico de armazenamento; o arquivo deve usar uma chave ou nome interno gerado pelo sistema. |
| RF-08 | O sistema deve deixar explícito ao cliente que os metadados são voláteis: após reiniciar o backend, a listagem em memória é perdida e os arquivos que permanecerem no disco não podem ser localizados pela API. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser armazenados exclusivamente no filesystem local da aplicação, em `backend/storage`, com Multer `diskStorage`; não usar storage externo. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase. Não introduzir banco de dados ou persistência externa. |
| RNF-03 | Configurações de execução, incluindo a porta HTTP e a identidade local, devem ser fornecidas por variáveis de ambiente. A porta usa `PORT` e mantém `3000` como padrão conforme o seed atual. |
| RNF-04 | O backend deve usar Node.js e Express em CommonJS; o frontend deve usar React e Vite em ES Modules. A linguagem permanece JavaScript. |
| RNF-05 | O backend deve respeitar as camadas simples `routes -> controllers -> services -> repositories`, sem dependências de camadas internas em Express ou React. |
| RNF-06 | A implementação deve tratar erros de entrada, filesystem e leitura de arquivos nos limites apropriados, sem retornar caminhos internos do servidor ao cliente. |
| RNF-07 | Os testes do backend devem usar o runner nativo `node:test`. |
| RNF-08 | O ambiente de usuário único não fornece autenticação. O deploy deve permanecer restrito a um ambiente confiável até que autenticação e autorização sejam especificadas. |

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | sim | Identificador único, recomendado UUID, gerado pelo backend. Usado nas rotas de listagem e download. |
| `originalName` | string | sim | Nome informado pelo cliente para o arquivo. Usado apenas como metadado e nome sugerido no download; nunca como caminho físico. |
| `size` | number | sim | Tamanho do arquivo em bytes, obtido do arquivo recebido e gravado. |
| `uploadedAt` | string | sim | Data e hora do upload em ISO 8601, normalizada para UTC. |
| `owner` | string | sim | Valor de `DMS_OWNER_ID` associado ao documento. No MVP todos os documentos pertencem à identidade configurada. |
| `storageKey` | string | interno | Nome/chave gerado pelo backend para localizar o arquivo dentro de `backend/storage`. Não deve ser exposto na resposta pública da API. |

Exemplo de representação pública:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-11-23T12:00:00.000Z",
  "owner": "local-user"
}
```

O repositório mantém os metadados em uma coleção em memória e relaciona cada registro ao arquivo local por `storageKey`. A estrutura de armazenamento não deve aceitar o nome fornecido pelo cliente como caminho. Como não há persistência dos metadados, reiniciar o processo descarta os registros; arquivos que permanecerem em `backend/storage` tornam-se órfãos até uma futura política de limpeza ou reconstrução ser definida. Limpeza automática de órfãos não faz parte deste MVP.

## 6. Contratos de API

Os exemplos usam os caminhos do backend. No frontend em desenvolvimento, o proxy do Vite recebe chamadas em `/api` e remove esse prefixo antes de encaminhá-las ao backend.

### `POST /upload`

Envia um arquivo e cria os metadados correspondentes.

- Cabeçalho: `Content-Type: multipart/form-data` (definido pelo cliente HTTP ao enviar `FormData`).
- Campo obrigatório: `file`, com exatamente um arquivo.
- Resposta de sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-11-23T12:00:00.000Z",
    "owner": "local-user"
  }
}
```

Erros previstos:

| Status | Código | Quando |
| --- | --- | --- |
| `400 Bad Request` | `FILE_REQUIRED` | Campo `file` ausente ou sem arquivo válido. |
| `400 Bad Request` | `INVALID_UPLOAD` | Requisição multipart inválida ou mais de um arquivo, se a camada de upload detectar essa condição. |
| `413 Payload Too Large` | `FILE_TOO_LARGE` | O arquivo exceder o limite configurado, depois que o limite de upload for definido. |
| `500 Internal Server Error` | `STORAGE_ERROR` | Falha ao gravar o arquivo ou registrar os metadados. |

Se a gravação no disco for concluída, mas o registro em memória falhar, o serviço deve tentar remover o arquivo recém-gravado para evitar órfão. Uma falha nessa compensação deve ser registrada pelo backend sem revelar detalhes internos na resposta.

### `GET /documents`

Lista os documentos registrados em memória para a identidade local configurada.

- Resposta de sucesso: `200 OK`, `Content-Type: application/json`.
- Sem parâmetros de query no MVP.
- A lista vazia deve ser retornada como `200 OK` com `documents: []`.
- Ordenação proposta: `uploadedAt` decrescente.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-11-23T12:00:00.000Z",
      "owner": "local-user"
    }
  ]
}
```

O `storageKey` e caminhos absolutos ou relativos do servidor não devem ser incluídos na resposta.

### `GET /documents/:id/download`

Baixa o conteúdo binário de um documento registrado e pertencente à identidade local configurada.

- Parâmetro `id`: identificador do documento.
- Resposta de sucesso: `200 OK`, conteúdo binário como anexo (`Content-Disposition: attachment`) e nome de download baseado em `originalName`.
- O backend deve localizar o conteúdo pelo `storageKey`, não pelo nome recebido na URL ou pelo nome original.

Erros previstos:

| Status | Código | Quando |
| --- | --- | --- |
| `404 Not Found` | `DOCUMENT_NOT_FOUND` | O identificador não existe nos metadados em memória ou não pertence à identidade configurada. |
| `404 Not Found` | `FILE_NOT_FOUND` | Há metadados, mas o arquivo correspondente não está no filesystem. |
| `500 Internal Server Error` | `DOWNLOAD_ERROR` | Outra falha inesperada de leitura/stream do arquivo. |

### Formato de erro

As respostas de erro da API devem usar `application/json` e um formato consistente:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

Mensagens destinadas ao usuário devem estar em português. Respostas não devem conter stack traces, caminhos locais nem detalhes sensíveis de filesystem.

### Prefixo de desenvolvimento

| Chamada do frontend | Caminho recebido pelo backend |
| --- | --- |
| `POST /api/upload` | `POST /upload` |
| `GET /api/documents` | `GET /documents` |
| `GET /api/documents/:id/download` | `GET /documents/:id/download` |

O proxy existente do Vite encaminha `/api` ao servidor local e remove o prefixo. Em outros ambientes, a configuração de proxy equivalente deve preservar esse mapeamento; `/api` não altera os caminhos canônicos do backend.

## 7. Decisões arquiteturais

- **Rotas (`routes/`)**: declaram os caminhos e métodos HTTP e conectam middleware de upload e controllers.
- **Controllers (`controllers/`)**: leem parâmetros e arquivo recebido, validam a forma básica da requisição e traduzem resultados/erros para status e respostas HTTP.
- **Services (`services/`)**: aplicam regras do caso de uso, associam `owner`, coordenam gravação e registro de metadados e tratam a compensação quando uma operação parcial falha.
- **Repositories (`repositories/`)**: encapsulam a escrita/leitura de arquivos locais e a coleção de metadados em memória. Multer deve usar `diskStorage` para escrever sob `backend/storage`, com nome interno gerado pelo sistema.
- **Dependências**: `routes -> controllers -> services -> repositories`; services e repositories não devem depender de Express ou React.
- **Frontend**: componentes funcionais React organizados conforme as pastas existentes (`components/`, `pages/`, `services/`); chamadas à API via `fetch` e prefixo `/api` no ambiente Vite.
- **Configuração**: `PORT` controla a porta HTTP; `DMS_OWNER_ID` fornece a identidade estável do usuário local e usa `local-user` quando ausente ou vazio.
- **Persistência**: conteúdo em disco e metadados em memória são deliberadamente distintos. O MVP não reconstrói metadados no boot e não apaga automaticamente arquivos órfãos.
- **Segurança e exposição**: sem login, o isolamento por `owner` não equivale a autenticação. O serviço deve ser usado apenas por um único usuário em ambiente confiável; suporte a usuários múltiplos exige uma especificação de identidade e autorização separada.

## 8. Plano de execução

As etapas abaixo registram o plano original; a API de documentos do backend já foi implementada. O frontend e as políticas de limites de upload permanecem pendentes.

1. Confirmar política de identidade local, comportamento de inicialização sem `DMS_OWNER_ID` e limites de tamanho/tipo do upload.
2. Implementar os contratos da API e a configuração de upload local com Multer `diskStorage`, nome interno gerado e tratamento de falhas de gravação.
3. Implementar o registro de metadados em memória e as regras de associação ao owner configurado.
4. Implementar listagem e download pelo identificador, incluindo erros para documento ausente e arquivo local ausente.
5. Integrar a experiência React de upload, listagem, estados vazios/erro e download, usando o proxy `/api` no desenvolvimento.
6. Adicionar testes de API com `node:test` para upload válido/inválido, metadados, listagem, download, isolamento do owner e falhas previsíveis de filesystem.
7. Validar o fluxo completo e documentar limitações operacionais, em especial perda do índice em memória após reinício e necessidade de não expor o serviço sem autenticação.

### Critérios de aceite do MVP

- Um arquivo enviado por `POST /upload` é escrito localmente e retorna metadados sem expor o caminho ou a chave interna.
- `GET /documents` retorna os metadados em memória do owner configurado e uma lista vazia quando não houver documentos registrados.
- `GET /documents/:id/download` entrega o arquivo correspondente como anexo e retorna erro controlado para identificador ou arquivo inexistente.
- O backend usa as quatro camadas estabelecidas e Multer com `diskStorage`; nenhum storage externo é introduzido.
- A documentação da interface e da operação deixa claro que os metadados são voláteis e que o MVP não implementa autenticação.