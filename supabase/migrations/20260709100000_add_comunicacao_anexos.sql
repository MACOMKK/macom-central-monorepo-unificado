-- v2 do app "comunicacao": anexos em mensagens (canais e DM).

-- Mensagem agora pode ser só anexo(s), sem texto: relaxa o check que exigia conteudo
-- nao-vazio (a exigencia de "texto ou pelo menos um anexo" passa a ser responsabilidade
-- da Edge Function, que tem visibilidade dos dois).
alter table gestao_comunicacao.mensagens
  drop constraint if exists mensagens_conteudo_check;
alter table gestao_comunicacao.mensagens
  alter column conteudo set default '',
  add constraint mensagens_conteudo_check check (char_length(conteudo) <= 4000);

alter table gestao_comunicacao.mensagens_diretas
  drop constraint if exists mensagens_diretas_conteudo_check;
alter table gestao_comunicacao.mensagens_diretas
  alter column conteudo set default '',
  add constraint mensagens_diretas_conteudo_check check (char_length(conteudo) <= 4000);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comunicacao-anexos',
  'comunicacao-anexos',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists gestao_comunicacao.anexos_mensagem (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid references gestao_comunicacao.mensagens(id) on delete cascade,
  mensagem_direta_id uuid references gestao_comunicacao.mensagens_diretas(id) on delete cascade,
  nome_arquivo text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null,
  storage_path text not null,
  criado_em timestamptz not null default now(),
  check (
    (case when mensagem_id is not null then 1 else 0 end)
    + (case when mensagem_direta_id is not null then 1 else 0 end) = 1
  )
);

create index if not exists idx_comunicacao_anexos_mensagem_id
  on gestao_comunicacao.anexos_mensagem (mensagem_id);

create index if not exists idx_comunicacao_anexos_mensagem_direta_id
  on gestao_comunicacao.anexos_mensagem (mensagem_direta_id);

alter table gestao_comunicacao.anexos_mensagem enable row level security;

drop policy if exists "comunicacao_anexos_select" on gestao_comunicacao.anexos_mensagem;
create policy "comunicacao_anexos_select"
  on gestao_comunicacao.anexos_mensagem
  for select
  to authenticated
  using (
    exists (
      select 1 from gestao_comunicacao.mensagens m
      where m.id = anexos_mensagem.mensagem_id
        and public.comunicacao_can_access_canal(m.canal_id)
    )
    or exists (
      select 1 from gestao_comunicacao.mensagens_diretas md
      where md.id = anexos_mensagem.mensagem_direta_id
        and public.comunicacao_can_access_conversa(md.conversa_id)
    )
  );

drop policy if exists "comunicacao_anexos_insert" on gestao_comunicacao.anexos_mensagem;
create policy "comunicacao_anexos_insert"
  on gestao_comunicacao.anexos_mensagem
  for insert
  to authenticated
  with check (
    exists (
      select 1 from gestao_comunicacao.mensagens m
      where m.id = anexos_mensagem.mensagem_id
        and m.autor_id = public.current_colaborador_id()
        and public.comunicacao_can_access_canal(m.canal_id)
    )
    or exists (
      select 1 from gestao_comunicacao.mensagens_diretas md
      where md.id = anexos_mensagem.mensagem_direta_id
        and md.autor_id = public.current_colaborador_id()
        and public.comunicacao_can_access_conversa(md.conversa_id)
    )
  );

grant select, insert on gestao_comunicacao.anexos_mensagem to authenticated;
grant select, insert on gestao_comunicacao.anexos_mensagem to service_role;

alter table gestao_comunicacao.anexos_mensagem replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_comunicacao'
      and tablename = 'anexos_mensagem'
  ) then
    alter publication supabase_realtime add table gestao_comunicacao.anexos_mensagem;
  end if;
end
$$;

drop policy if exists "comunicacao_anexos_storage_select" on storage.objects;
drop policy if exists "comunicacao_anexos_storage_insert" on storage.objects;

create policy "comunicacao_anexos_storage_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'comunicacao-anexos'
  and (
    ((storage.foldername(name))[1] = 'canais'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.comunicacao_can_access_canal(((storage.foldername(name))[2])::uuid))
    or
    ((storage.foldername(name))[1] = 'conversas'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.comunicacao_can_access_conversa(((storage.foldername(name))[2])::uuid))
  )
);

create policy "comunicacao_anexos_storage_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'comunicacao-anexos'
  and (
    ((storage.foldername(name))[1] = 'canais'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.comunicacao_can_access_canal(((storage.foldername(name))[2])::uuid))
    or
    ((storage.foldername(name))[1] = 'conversas'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.comunicacao_can_access_conversa(((storage.foldername(name))[2])::uuid))
  )
);

notify pgrst, 'reload schema';
