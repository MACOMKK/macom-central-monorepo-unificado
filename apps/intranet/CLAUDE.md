# Intranet — app-specific

> Este arquivo complementa o CLAUDE.md raiz do monorepo. Só documenta o que é específico deste app.

## Domínio

Intranet corporativa: avisos, links úteis, colaboradores, documentos, calendário, base de conhecimento e feedback.

## Estrutura

- `src/components/` — por módulo: `announcements`, `auth`, `calendar`, `documents`, `employees`, `knowledge`, `layout`, `links`
- `src/pages/` — telas, incluindo `settings`

## Permissões granulares (duas camadas)

**Camada 1 — Acesso ao sistema** (`public.acessos_usuario_sistema`):
usuário só entra se auth ativo + colaborador ativo + acesso criado + `ativo = true`.
Campo `nivel_acesso`: `admin` (bypassa permissões de módulo) ou `usuario` (sujeito à Camada 2).

**Camada 2 — Permissões por módulo** (`gestao_intranet.permissoes_usuario`):
valores `none | view | edit` por módulo. Default é `view` para quem tem acesso ativo;
`permissoes_usuario` sobrescreve o default.

Essa distinção "acesso ao sistema" (Camada 1) vs "acesso ao módulo" (Camada 2) já está descrita em
detalhe no `apps/intranet/README.md` — este arquivo só resume para referência rápida; o README é a
fonte primária se precisar de mais detalhe (RLS, etc).

Módulos: `mod_avisos`, `mod_links`, `mod_colaboradores`, `mod_documentos`, `mod_calendario`,
`mod_conhecimento`, `mod_feedback`.

**Ao criar uma feature nova em um módulo existente ou um módulo novo, sempre checar/registrar a
permissão correspondente — não assumir que acesso ao sistema implica acesso ao módulo.**

## Backend

- Edge Function: `supabase/functions/intranet-api/index.ts`
  - Entidades: `Announcement`, `AnnouncementComment`, `AnnouncementReaction`, `CalendarEvent`,
    `Document`, `Profile`, `ProfileChangeRequest`, `Employee`, `EmployeeBirthday`, `Feedback`,
    `KnowledgeBase`, `QuickLink`, `UserPermission`, `TrustedIpAccess`
  - Operações padrão: `list`, `filter`, `create`, `update`, `delete`
  - Storage buckets: avisos (2MB), documentos (5MB), avatares
  - Integração com Google Calendar para sincronizar eventos
  - Log de acessos: toda chamada `action: 'me'` bem-sucedida grava um registro em
    `gestao_plataforma.logs_acesso` (via `registrarAcessoIntranet`), e `resource: 'accessLogs'`
    (`action: 'list'`, admin-only) lista o histórico paginado — consumido pela seção
    "Log de acessos" em Configurações. Tabela é compartilhada por `sistema_id`
    (`public.sistemas`), pensada para ser reutilizada por outros apps (ex. `relatorios`) sem
    nova migration — só inserir/ler com o `sistema_id` correspondente.
- Schema: `gestao_intranet` (migration `20260514194500_add_gestao_intranet_core.sql`)
  - Tabelas: `perfis_colaboradores`, `avisos`, `comentarios_avisos`, `reacoes_avisos`,
    `eventos_calendario`, `documentos`, `links_uteis`, `base_conhecimento`, `feedback`,
    `permissoes_usuario`

## Convenções

- Novo módulo ⇒ adicionar linha em `permissoes_usuario` (Camada 2) e endpoint/entidade correspondente na `intranet-api`.
- Uploads passam pelos buckets já existentes — respeitar limites de tamanho (2MB avisos / 5MB documentos).
