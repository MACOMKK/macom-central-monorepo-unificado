# Admin (Console) — app-specific

> Este arquivo complementa o CLAUDE.md raiz do monorepo. Só documenta o que é específico deste app.

## Papel

Console de governança da plataforma: catálogo de sistemas, permissões, acessos por sistema,
usuários, auditoria e logs de acesso. A Central segue focada em estoque/operação de TI —
ver `apps/central/CLAUDE.md`.

## Padrões da UI

- **`components/PageHeader.jsx`** — usar em toda página nova (eyebrow + `h1` + descrição +
  slot de ações). Garante um único `h1` por página; não criar headers manuais.
- **`components/Pagination.jsx`** — usar em qualquer lista paginada (recebe `page`,
  `pageSize`, `total`, `onPageChange`).
- **`lib/format.js`** (`formatDateTime`), **`lib/normalize.js`** (`normalize`),
  **`lib/upsertByKey.js`** (`upsertByKey(list, item, keyFn)`) — utils compartilhados; não
  duplicar essas funções dentro de páginas.
- **`lib/statusStyles.js`** (`getStatusBadgeClass`) — mapa de status/perfil para classes de
  badge usando os tokens semânticos abaixo. Preferir sempre a essa função a cores Tailwind
  cruas (`emerald-*`, `amber-*`, `sky-*`, `rose-*`) em badges de status.

## Tokens de cor semânticos

Além dos tokens padrão do tema (`--primary`, `--destructive`, etc., definidos em
`packages/config/tailwind/base.cjs`), este app define localmente em `tailwind.config.js` +
`src/index.css`: `--success`, `--warning`, `--info` (com as respectivas `-foreground`). Use
`bg-success/10 text-success`, `bg-warning/10 text-warning`, `bg-info/10 text-info` em vez de
cores literais do Tailwind. Essas cores são **locais ao admin** — não foram adicionadas ao
config compartilhado (`packages/config/tailwind/base.cjs`) para não afetar outros apps.

## Estrutura de dados

- **`lib/systemsCatalog.js`** — catálogo de sistemas do monorepo (`permissionSystems`),
  consumido por `SystemsCatalog.jsx`.
- **`lib/permissionModules.js`** — níveis e módulos de permissão (`PERMISSION_LEVELS`,
  `levelOptions`, `centralModules`, `reportsModules`), consumido por `SystemPermissions.jsx`
  (e importado dentro de `systemsCatalog.js` para compor `permissionSystems`). Os dois
  arquivos eram um único `platformPermissions.js` — foram separados por responsabilidade.

## Convenções

- App intencionalmente "flat": `pages/` sem subpastas por domínio. Só reorganizar em
  subpastas se o número de páginas crescer bastante — hoje (9 páginas) não compensa.
- Sem dark mode (diferente da Central). Não implementar sem pedido explícito.
- Textos em português sem acentuação em identificadores/rótulos de rota — convenção
  existente no app, manter ao adicionar rotas/labels novos.
