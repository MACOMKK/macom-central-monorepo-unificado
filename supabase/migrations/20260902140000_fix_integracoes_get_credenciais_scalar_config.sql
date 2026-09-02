-- Corrige integracoes.get_credenciais: se `config` vier nulo (SQL null) ou como um jsonb
-- escalar (ex.: jsonb 'null', string, numero) em vez de objeto, jsonb_set falhava com
-- "cannot set path in scalar" ao tentar inserir os campos de segredo. Normaliza sempre
-- para um objeto jsonb antes de comecar a mesclar os segredos.

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

  result := integracao_row.config;
  if result is null or jsonb_typeof(result) <> 'object' then
    result := '{}'::jsonb;
  end if;

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
