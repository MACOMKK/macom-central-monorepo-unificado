alter table gestao_intranet.notificacoes replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_intranet'
      and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table gestao_intranet.notificacoes;
  end if;
end
$$;
