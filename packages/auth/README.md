# @macom/auth

Camada compartilhada de autenticacao, sessao e protecao de rotas da plataforma Macom.

Por compatibilidade, o `AuthProvider` usa `systemSlug="central"` por padrao.
Novos apps podem informar outro `systemSlug` quando o backend de permissoes do app estiver pronto.

Contratos mantidos para a Central:

- `centralPermissions`
- `canCentral(moduleKey, requiredLevel)`

Contratos genericos para novos apps:

- `permissions`
- `canAccessModule(moduleKey, requiredLevel)`
