# Pagamentos — app-specific

> Este arquivo complementa o CLAUDE.md raiz do monorepo. Só documenta o que é específico deste app.

## Domínio

Solicitações e fluxo de aprovação de pagamentos: colaborador solicita, um aprovador decide
(aprovado/reprovado), o financeiro marca como pago. Máquina de estados:
`pendente → aprovado | reprovado`, e `aprovado → pago`.

## Papéis (sem Camada 2 de permissões por módulo)

Diferente da intranet, este app **não** tem uma tabela de permissões por módulo própria.
Reaproveita diretamente `acessos_usuario_sistema.nivel_acesso` (Camada 1, sistema `pagamentos`):

| `nivel_acesso` | Papel no app | Pode |
|---|---|---|
| `usuario` | Solicitante | Criar solicitações, editar/ver as próprias enquanto `pendente` |
| `gestor` | Aprovador | Ver todas, aprovar/reprovar as `pendente` |
| `admin` | Financeiro | Tudo do aprovador + marcar `aprovado` como `pago` |

O mapeamento vive em `src/lib/AuthContext.jsx` (`mapAccessLevel`). Não confundir com o `nivel_acesso`
de outros apps (ex. CRM usa `admin`/`gestor`/`usuario` com semântica de vendas, não financeira).

## Backend

- Edge Function: `supabase/functions/pagamentos-api/index.ts`
  - Entidade única: `solicitacoes_pagamento`. Ações: `me`, `list`, `get`, `create`, `update`
    (só solicitante, só enquanto `pendente`), `set_status` (transição de estado, valida papel +
    estado atual), `signed_url` (URL assinada do comprovante).
  - Toda a autorização é feita em código na função (não há motor genérico de entidades como em
    `intranet-api`/`crm-api` — este app tem uma entidade só, não precisou do padrão `ENTITY_CONFIG`).
- Schema: `gestao_pagamentos` (migration `20260716090000_add_gestao_pagamentos_core.sql`)
  - Tabela: `solicitacoes_pagamento`
  - Helpers SQL: `public.pagamentos_access_level()`, `public.pagamentos_has_access()`,
    `public.pagamentos_is_aprovador()`, `public.pagamentos_is_financeiro()` — usados nas policies
    de RLS (defesa em profundidade; a função roda com `DATABASE_URL` direto e já valida em código).
- Storage: bucket privado `comprovantes-pagamento` (5MB, migration
  `20260716090500_ensure_pagamentos_comprovantes_bucket.sql`). Upload é feito direto do client
  (`supabase.storage.from(pagamentosApi.storage.bucket).upload(...)`), a function só gera signed URL.
- Notificação: ao aprovar/reprovar/pagar, a function insere em `gestao_ativos.fila_emails`
  (`tipo: 'aprovacao_pagamento'` ou `'pagamento_efetuado'`) — reaproveita a fila e o cron
  `processa-fila-email` já existentes, sem função nova.

## Convenções

- Alçada de aprovação é única (um aprovador decide) — não há regra por faixa de valor ainda. Se
  isso mudar, revisar a máquina de estados e o `set_status` da edge function.
- Ideias de "portaria" (controle de veículos) e "serviços" (chamados internos) foram cogitadas
  junto com este app, mas decidiu-se que **não** viram apps novos — quando forem implementadas,
  serão módulos da `intranet` (reaproveitando a Camada 2 de permissão granular por módulo que já
  existe lá), não sistemas independentes como este.
