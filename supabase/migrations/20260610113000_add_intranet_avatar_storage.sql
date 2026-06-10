insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage_avatars_read_authenticated" on storage.objects;
create policy "storage_avatars_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatares' and public.has_system_access('intranet'));

drop policy if exists "storage_avatars_insert_own_profile" on storage.objects;
create policy "storage_avatars_insert_own_profile"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatares'
  and public.has_system_access('intranet')
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "storage_avatars_update_own_profile" on storage.objects;
create policy "storage_avatars_update_own_profile"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatares'
  and public.has_system_access('intranet')
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'avatares'
  and public.has_system_access('intranet')
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "storage_avatars_delete_own_profile" on storage.objects;
create policy "storage_avatars_delete_own_profile"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatares'
  and public.has_system_access('intranet')
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);
