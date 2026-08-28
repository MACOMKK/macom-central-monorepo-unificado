-- Move gestao_intranet.integracoes_google_calendar.refresh_token para o Supabase Vault.
-- Integracao ainda nao usada em producao, entao a coluna refresh_token em
-- texto puro e removida nesta mesma migration (sem necessidade de fallback).

alter table gestao_intranet.integracoes_google_calendar
  add column if not exists refresh_token_secret_id uuid references vault.secrets (id);

do $$
declare
  integracao record;
  secret_id uuid;
begin
  for integracao in
    select id, colaborador_id, refresh_token
    from gestao_intranet.integracoes_google_calendar
    where refresh_token is not null
      and refresh_token_secret_id is null
  loop
    secret_id := vault.create_secret(
      integracao.refresh_token,
      'google_calendar_refresh_token:' || integracao.colaborador_id::text
    );

    update gestao_intranet.integracoes_google_calendar
    set refresh_token_secret_id = secret_id
    where id = integracao.id;
  end loop;
end;
$$;

alter table gestao_intranet.integracoes_google_calendar
  drop column refresh_token;

alter table gestao_intranet.integracoes_google_calendar
  alter column refresh_token_secret_id set not null;
