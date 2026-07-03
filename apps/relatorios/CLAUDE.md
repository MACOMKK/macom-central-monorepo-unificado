# Relatórios — app-specific

> Este arquivo complementa o CLAUDE.md raiz do monorepo. Só documenta o que é específico deste app.

## Papel

Dashboard de BI: visualização de relatórios embedados (BI externo) com controle de acesso por
unidade e por função.

## Estrutura

- `pages/` — Dashboard, Login, ReportViewer, SetPassword
- `pages/admin/` — painel administrativo isolado: ManagePermissions, ManageReports, ManageUnits,
  Settings, AuditLogs
- `api/` — lógica de chamada a endpoints
- ESLint configurado localmente (`eslint.config.js`), diferente do restante dos apps que não têm
  lint próprio

## Backend

**Este app tem duas fontes de backend Supabase — não confundir:**

1. Compartilhado (raiz do monorepo, `supabase/functions/relatorios-api`) — expõe entidades
   públicas + leitura de `gestao_ativos` (mesmo modelo read-only usado pelo Central).
   Schema: `gestao_relatorio` — tabelas `relatorios`, `permissoes_relatorios`,
   `permissoes_funcoes`, `logs_auditoria`.
2. **Local ao app** (`apps/relatorios/supabase/`) — tem `functions/`, `migrations/` e
   `schema.sql` próprios, separados do `supabase/` raiz:
   - `functions/invite-user` — convite de novo usuário (dispara o fluxo de primeiro acesso)
   - `functions/set-user-password` — define senha no primeiro acesso (`SetPassword`)
   - `functions/manage-user` — gestão de usuários (deleção/inativação)

Ao alterar fluxo de convite/usuários deste app, editar os arquivos em
`apps/relatorios/supabase/`, não em `supabase/functions/` raiz.

## Permissões

Modelo por **função**, não por módulo nem por usuário: `nivel_acesso + modulo → permissao`
(`sem | ver | gerenciar`), armazenado em `permissoes_funcoes`. Além disso, acesso a relatórios é
escopado por unidade (`relatorios_unidades_scope`) — um usuário só vê relatórios das unidades às
quais tem acesso, mesmo com permissão de função adequada. Ao adicionar um relatório novo, garantir
que ele tenha unidades associadas ou ficará invisível para todos.

## Embed de relatórios

`relatorios.embed_code` guarda o código de embed do provedor de BI externo. `ReportViewer`
renderiza esse embed — não há lógica de agregação/cálculo própria neste app, é só apresentação.

## Convenções

- Fluxo de primeiro acesso (convite → `SetPassword`) não deve ser confundido com o login padrão
  Supabase usado pelos outros apps — é uma etapa adicional específica deste app.
- Antes de mexer em auth/usuários aqui, checar se a lógica está no Supabase local
  (`apps/relatorios/supabase/`) antes de procurar no `supabase/` raiz.
- Mudanças em `permissoes_funcoes` ou `relatorios_unidades_scope` afetam quem vê o quê; testar com
  usuários de diferentes níveis antes de subir.
