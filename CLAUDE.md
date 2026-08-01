# MACOM Central — Monorepo

> **Idioma:** responda sempre em português (pt-BR) nesta conversa, mesmo que o código, commits ou este arquivo estejam em inglês.

## Visão geral

Monorepo da plataforma MACOM: um conjunto de SPAs React independentes que
compartilham o mesmo projeto Supabase (auth + banco) e pacotes internos
`@macom/*`. Não há Turborepo/Nx — a orquestração é feita via **npm workspaces**
(`package.json` raiz).

## Apps (`apps/`)

| App | Papel | Status |
|---|---|---|
| `central` | Shell de autenticação/sessão; catálogos e permissões compartilhadas | Completo (único com testes via Vitest e lint dedicado) |
| `admin` | Console de governança da plataforma (cadastro de sistemas, usuários, permissões globais) | Completo |
| `crm` | REVVO CRM — gestão comercial automotiva (leads, clientes, atendimentos) | Completo |
| `intranet` | Intranet corporativa — avisos, documentos, colaboradores, feedback | Completo, com permissões granulares por módulo |
| `relatorios` | Dashboard de BI/relatórios | Completo |
| `servicos` | Sistema SERVIÇOS (oficina/concessionária) — módulos Atendimento, Oficina, Financeiro, Estoque, Compras, RH | Módulo Financeiro completo (ex-app `pagamentos`); demais módulos "em breve" |
| `rh` | Gestão de RH (colaboradores, processos) | Placeholder (sem `package.json` ainda) |
| `_template` | Boilerplate para criar um novo app React/Vite | Copiar e adaptar; registrar scripts `dev:<app>` / `build:<app>` no `package.json` raiz |

Cada app é deployado como **projeto Vercel independente**, mas todos vivem
neste único repositório e compartilham banco/auth.

## Pacotes compartilhados (`packages/@macom/*`)

- **`ui`** — componentes React (base Radix UI)
- **`auth`** — hooks/utilitários de autenticação via Supabase
- **`api-client`** — cliente centralizado para chamar as Edge Functions
- **`config`** — factories de ESLint, Tailwind, PostCSS e `jsconfig` reutilizados pelos apps
- **`validation`** — schemas de validação (Zod) compartilhados
- **`test-utils`** — helpers/mocks para testes

Antes de duplicar lógica (validação, chamada de API, componente de UI),
verifique se já existe em um desses pacotes.

## Backend (Supabase)

Projeto Supabase único e compartilhado por todos os apps.

**Edge Functions** (`supabase/functions/`), uma por domínio: `central-api`,
`admin-create-user`, `catalog-api`, `plataforma-api`, `crm-api`,
`intranet-api`, `relatorios-api`, `servicos-api`, `processa-fila-email`, `enviar-termo-gmail`.

**Schemas** (`supabase/migrations/`):
- `public` — entidades globais (colaboradores, sistemas, acessos_usuario_sistema)
- `gestao_ativos` — dados do Central (inventário/TI)
- `gestao_plataforma` — governança/auditoria do Admin
- `gestao_crm`, `gestao_intranet`, `gestao_relatorio`, `gestao_servicos` — dados de cada app feature

Auth via Supabase Auth (JWT enviado nas chamadas às Edge Functions).

## Como rodar

```bash
npm install
npm run dev:central     # ou dev:admin, dev:crm, dev:relatorios
npm --prefix apps/intranet run dev
```

Build segue o mesmo padrão: `npm run build:<app>` (roda `sync:favicons` antes).

Lint, testes e typecheck no root cobrem apenas o `central`; o `crm` já tem
testes próprios (Vitest, `apps/crm/src/test/`), rodados via script dedicado:
```bash
npm run lint          # eslint apps/central/src
npm run test          # vitest (central)
npm run typecheck     # tsc sobre apps/central/jsconfig.json
npm run test:crm      # vitest (crm), watch mode
npm run test:crm:run  # vitest (crm), single run
npm --prefix apps/crm run lint   # eslint do crm
```

Não há CI configurado (`.github/`) — validar localmente antes de subir.

## Convenções

- Novo app: partir de `apps/_template`, registrar `dev:<nome>` e `build:<nome>`
  no `package.json` raiz, e adicionar o path em `workspaces`.
- Nova Edge Function: seguir o padrão `supabase/functions/<dominio>-api`.
- Preferir consumir/estender os pacotes `@macom/*` a criar lógica local
  duplicada entre apps.
- Regras de negócio muito específicas de um app (modelo de permissões, entidades
  de domínio, particularidades de backend) vivem no `CLAUDE.md` próprio do app —
  já existe para `central`, `crm`, `intranet`, `relatorios` e `servicos`. `admin`
  ainda não tem um por ser simples hoje (revisitar se crescer). Este arquivo raiz cobre
  apenas o que é transversal: arquitetura do monorepo, pacotes `@macom/*`
  compartilhados, backend Supabase geral e como rodar/testar.
