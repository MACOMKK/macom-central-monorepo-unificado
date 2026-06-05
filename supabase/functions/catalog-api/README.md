# catalog-api

Status: deprecated.

Esta function foi mantida temporariamente apenas como fallback historico. Os apps atuais devem usar APIs por dominio:

- Central: `central-api`
- Relatorios: `relatorios-api`
- Intranet: `intranet-api`

Nao adicionar novas entidades, permissoes ou regras de negocio nesta function. Depois de um ciclo de validacao sem chamadas para `catalog-api`, ela pode ser removida do Supabase e do repositorio.
