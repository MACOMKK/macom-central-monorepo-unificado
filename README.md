# MACOM Monorepo

Monorepo com apps frontend da MACOM e pacotes compartilhados.

O repositório usa `npm workspaces` para instalar as dependencias da raiz, dos apps e dos pacotes compartilhados em um unico fluxo.

## Estrutura

- `apps/central`: app administrativo do Central
- `apps/admin`: MACOM Console, app de gestao da plataforma, sistemas e permissoes globais
- `apps/intranet`: app da intranet corporativa
- `apps/relatorios`: app de relatorios
- `apps/_template`: molde base para criar novos apps React/Vite
- `packages/*`: modulos compartilhados entre apps
- `supabase/*`: functions, migrations e config do backend
- `scripts/vite/createAppConfig.js`: padrao compartilhado de configuracao Vite para novos apps

## Padrao de arquitetura

O monorepo separa dados globais da plataforma e dados especificos de cada dominio.

### Dados globais em `public`

O schema `public` deve guardar entidades compartilhadas por todos os sistemas. Essas tabelas nao pertencem a um app especifico, mesmo quando sao administradas pelo MACOM Console.

Exemplos:

- `public.colaboradores`: identidade global dos colaboradores e usuarios.
- `public.sistemas`: catalogo global dos sistemas MACOM.
- `public.acessos_usuario_sistema`: vinculo global entre colaborador e sistema.

Essas tabelas podem ser lidas ou usadas por Central, Console, Intranet, Relatorios, CRM e futuros apps.

### Dados especificos em schemas `gestao_*`

Cada schema `gestao_*` deve guardar dados que pertencem a um dominio ou app especifico.

Exemplos:

- `gestao_ativos`: dados operacionais da Central/estoque/TI, como ativos, linhas, termos, infraestrutura e logs operacionais.
- `gestao_intranet`: conteudos, permissoes e configuracoes internas da Intranet.
- `gestao_relatorio`: relatorios, permissoes e auditoria dos Relatorios.
- `gestao_crm`: dados proprios do CRM.
- `gestao_plataforma`: dados proprios do Console/governanca, como auditoria de governanca e futuras configuracoes da plataforma.

### Regra para novas tabelas

Antes de criar uma tabela nova, use esta regra:

- Se a entidade representa algo compartilhado por todos os sistemas, crie em `public`.
- Se a entidade pertence ao funcionamento interno de um app ou dominio, crie no schema `gestao_<dominio>`.
- Se o Console apenas administra uma entidade global, isso nao significa que a tabela deve morar em `gestao_plataforma`.

### Logs e auditoria

- Logs operacionais ficam no schema do dominio que executa a operacao.
- Auditoria de governanca do Console fica em `gestao_plataforma.logs_auditoria`.
- Eventos devem registrar origem quando aplicavel, por exemplo `source_app: central`, `console`, `intranet`, `relatorios` ou `crm`.

## Rodar local

1. Instale dependencias na raiz:

```bash
npm install
```

2. Configure o `.env.local` na raiz:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Rode o app desejado:

```bash
npm run dev:central
npm run dev:admin
npm run dev:intranet
npm run dev:relatorios
```

## Build

Cada app gera seu bundle dentro da propria pasta:

- `apps/central/dist`
- `apps/admin/dist`
- `apps/intranet/dist`
- `apps/relatorios/dist`

Comandos:

```bash
npm run build:central
npm run build:admin
npm run build:intranet
npm run build:relatorios
```

## Padrao para novos apps

Para adicionar um novo frontend no monorepo:

1. Copie `apps/_template` para `apps/<nome>`.
2. Ajuste `package.json`, `index.html`, `public/manifest.json` e `src/App.jsx`.
3. Mantenha `apps/<nome>/vite.config.js` usando `createAppConfig(...)`.
4. Adicione scripts na raiz:

```json
"dev:<nome>": "vite --config apps/<nome>/vite.config.js --configLoader runner",
"build:<nome>": "vite build --config apps/<nome>/vite.config.js --configLoader runner"
```

5. Se o app for SPA com React Router, ele ja aproveita o rewrite compartilhado do `vercel.json` na raiz.

## Deploy na Vercel

Crie um projeto Vercel por app, todos apontando para este mesmo repositorio.

Configuracao recomendada para cada projeto:

- `Root Directory`: `/`
- `Install Command`: `npm install`
- `Framework Preset`: `Vite`
- `Build Command`:
  - Central: `npm run build:central`
  - MACOM Console: `npm run build:admin`
  - Relatorios: `npm run build:relatorios`
- `Output Directory`:
  - Central: `apps/central/dist`
  - MACOM Console: `apps/admin/dist`
  - Relatorios: `apps/relatorios/dist`

Padrao reutilizavel para qualquer projeto:

- `Root Directory`: `/`
- `Install Command`: `npm install`
- `Build Command`: `npm run build:<nome-do-app>`
- `Output Directory`: `apps/<nome-do-app>/dist`

Observacao:

- O monorepo nao usa Turborepo no deploy.
- Se a Vercel detectar comandos automaticos como `turbo run build`, sobrescreva manualmente com os comandos acima.

Variaveis de ambiente frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Nao exponha no frontend segredos como:

- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
