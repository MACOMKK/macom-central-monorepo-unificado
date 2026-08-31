-- Assinatura digital do colaborador: mesmo raciocinio da foto de perfil (migration
-- 20260831113817_move_foto_colaborador_to_public.sql) -- e dado de identidade compartilhado por
-- todos os apps, nao algo exclusivo de um sistema. Upload/edicao continua so na tela de Perfil da
-- intranet; os demais apps (ex. servicos, ao gerar PDF) so leem.
alter table public.colaboradores
  add column if not exists assinatura_url text,
  add column if not exists assinatura_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assinaturas', 'assinaturas', true, 524288, array['image/png'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_assinaturas_read_authenticated" on storage.objects;
create policy "storage_assinaturas_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'assinaturas');

drop policy if exists "storage_assinaturas_insert_own_profile" on storage.objects;
create policy "storage_assinaturas_insert_own_profile"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'assinaturas'
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "storage_assinaturas_update_own_profile" on storage.objects;
create policy "storage_assinaturas_update_own_profile"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'assinaturas'
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'assinaturas'
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "storage_assinaturas_delete_own_profile" on storage.objects;
create policy "storage_assinaturas_delete_own_profile"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'assinaturas'
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);
