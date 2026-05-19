# Intranet

Monorepo do app `intranet` com frontend React/Vite em `apps/intranet` e backend via Supabase Edge Function em `supabase/functions/intranet-api`.

## Estrutura

- `apps/intranet`: aplicacao web
- `supabase/schema.sql`: schema e politicas RLS
- `supabase/functions/intranet-api`: funcao que centraliza o acesso aos dados da intranet

## Ambiente

Crie `apps/intranet/.env.local` com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Para a funcao `intranet-api`, o Supabase precisa disponibilizar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Ela usa o token do usuario recebido no header `Authorization` e consulta o schema `gestao_intranet` respeitando as regras de RLS.

## Rodando localmente

```bash
npm install
npm run dev
```

O comando da raiz sobe o workspace `intranet`.

## Build e lint

```bash
npm run build
npm run lint
```

## Supabase

O schema inicial esta em [supabase/schema.sql](./supabase/schema.sql).

Esse script cria:

- cadastro de usuarios em `public.colaboradores`, sincronizado com `auth.users`
- acesso por sistema em `public.acessos_usuario_sistema`
- permissoes por modulo em `gestao_intranet.permissoes_usuario`
- conteudo da intranet no schema `gestao_intranet`
- bucket `documents` para upload de arquivos
- politicas RLS iniciais

## Function intranet-api

A aplicacao web nao consulta mais as tabelas principais diretamente para CRUD e leitura de catalogos. Essas operacoes passam pela Edge Function `intranet-api`, que:

- le o usuario autenticado via Supabase Auth
- consulta o schema `gestao_intranet`
- monta os payloads consumidos pelo frontend
- preserva as regras de acesso do banco

## Proximo passo recomendado

Aplicar `supabase/schema.sql` no projeto Supabase e publicar a funcao `intranet-api` antes de validar o fluxo completo da aplicacao.
