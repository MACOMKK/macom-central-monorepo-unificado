alter table gestao_comunicacao.mensagens replica identity full;
alter table gestao_comunicacao.canais replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'mensagens'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.mensagens;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'canais'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.canais;
  end if;
end
$$;
