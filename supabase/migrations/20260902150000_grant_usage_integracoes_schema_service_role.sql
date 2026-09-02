-- A migration original que criou o schema `integracoes` nunca concedeu USAGE nele
-- para `service_role` (so revogou de anon/authenticated). Sem USAGE no schema,
-- mesmo com EXECUTE liberado na funcao, `service_role` nao consegue chamar
-- `integracoes.get_credenciais` via PostgREST -- falha com "permission denied for
-- schema integracoes", fazendo `loadIntegracaoCredenciais` (Edge Functions) cair no
-- catch e retornar null, mesmo com a integracao ativa e configurada corretamente.

grant usage on schema integracoes to service_role;
