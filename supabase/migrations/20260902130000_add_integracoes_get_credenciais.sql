-- Funcao que resolve config + segredos (decifrados do Vault) de uma integracao em um
-- unico jsonb, para as Edge Functions consumirem sem precisar de acesso direto ao Vault.
-- SECURITY DEFINER + grant restrito a service_role: nunca exposta a anon/authenticated,
-- e so pode ser chamada via PostgREST se o schema `integracoes` estiver na lista de
-- "Exposed schemas" do projeto (Settings > API > Data API) usando a service role key.

create or replace function integracoes.get_credenciais(p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = integracoes, vault, pg_temp
as $$
declare
  integracao_row integracoes.integracoes%rowtype;
  result jsonb;
  secret_row record;
begin
  select * into integracao_row
  from integracoes.integracoes
  where chave = p_chave
    and ativo = true
  limit 1;

  if not found then
    return null;
  end if;

  result := coalesce(integracao_row.config, '{}'::jsonb);

  for secret_row in
    select s.chave, d.decrypted_secret
    from integracoes.integracoes_secrets s
    join vault.decrypted_secrets d on d.id = s.secret_id
    where s.integracao_id = integracao_row.id
  loop
    result := jsonb_set(result, array[secret_row.chave], to_jsonb(secret_row.decrypted_secret));
  end loop;

  return result;
end;
$$;

revoke all on function integracoes.get_credenciais(text) from public;
revoke all on function integracoes.get_credenciais(text) from anon, authenticated;
grant execute on function integracoes.get_credenciais(text) to service_role;

grant usage on schema integracoes to service_role;
grant select, insert, update, delete on integracoes.integracoes, integracoes.integracoes_secrets to service_role;
