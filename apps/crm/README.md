# MACOM CRM

Aplicacao CRM em fase de normalizacao dentro do monorepo MACOM.

## Desenvolvimento

Rode a partir da raiz do monorepo:

```bash
npm run dev:crm
```

A aplicacao abre em:

```text
http://localhost:5172/
```

## Dados locais

Nesta etapa inicial, o CRM usa uma camada local em `src/api/localCrmDb.js`.
Os dados e a sessao ficam no `localStorage` do navegador.

Essa camada existe para desacoplar o app do codigo original importado e preparar a troca futura por Supabase.

## Proxima etapa

Quando o schema do CRM estiver definido, a camada `localCrmDb` deve ser substituida por:

- Supabase Auth compartilhado com a Central;
- Edge Function `crm-api`;
- tabelas no schema `gestao_crm`;
- policies de RLS e permissoes via sistema `crm`.
