alter table gestao_ativos.termos_posse
  drop column if exists arquivo_url;

alter table gestao_ativos.termos_posse
  add column if not exists arquivo_path text,
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_tipo text,
  add column if not exists arquivo_tamanho bigint;

drop policy if exists "central_anexos_termos_posse_select" on storage.objects;
drop policy if exists "central_anexos_termos_posse_insert" on storage.objects;
drop policy if exists "central_anexos_termos_posse_update" on storage.objects;
drop policy if exists "central_anexos_termos_posse_delete" on storage.objects;

create policy "central_anexos_termos_posse_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'termos-posse'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('termos_posse', 'ver')
);

create policy "central_anexos_termos_posse_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'termos-posse'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('termos_posse', 'gerenciar')
);

create policy "central_anexos_termos_posse_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'termos-posse'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('termos_posse', 'gerenciar')
)
with check (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'termos-posse'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('termos_posse', 'gerenciar')
);

create policy "central_anexos_termos_posse_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'termos-posse'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('termos_posse', 'gerenciar')
);
