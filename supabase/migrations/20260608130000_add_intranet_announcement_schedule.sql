alter table gestao_intranet.avisos
  add column if not exists publica_em timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'gestao_intranet'
      and table_name = 'avisos'
      and column_name = 'expira_em'
      and data_type = 'date'
  ) then
    alter table gestao_intranet.avisos
      alter column expira_em type timestamptz
      using case
        when expira_em is null then null
        else (expira_em + time '23:59:59')::timestamptz
      end;
  end if;
end $$;

create index if not exists idx_intranet_avisos_publica_em
  on gestao_intranet.avisos (publica_em);

create index if not exists idx_intranet_avisos_expira_em
  on gestao_intranet.avisos (expira_em);
