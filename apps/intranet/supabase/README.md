# Supabase local da intranet

Esta pasta guarda artefatos locais/legados do app da intranet.

A fonte de verdade atual para Edge Functions do projeto fica na raiz do monorepo:

- `supabase/functions/intranet-api`

O frontend da intranet chama `packages/api-client/src/intranetApi.js`, que usa o endpoint
`/functions/v1/intranet-api` com o contrato atual aceito pela function da raiz.

Antes de alterar ou publicar a function duplicada em `apps/intranet/supabase/functions`,
compare com a versão da raiz e confirme o alvo do deploy Supabase.
