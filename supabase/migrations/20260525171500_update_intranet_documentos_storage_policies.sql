drop policy if exists "storage_documents_read_authenticated" on storage.objects;
create policy "storage_documents_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'documentos' and public.has_system_access('intranet'));

drop policy if exists "storage_documents_write_authenticated" on storage.objects;
create policy "storage_documents_write_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'documentos' and public.has_system_access('intranet'));

drop policy if exists "storage_documents_update_authenticated" on storage.objects;
create policy "storage_documents_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'documentos' and public.has_system_access('intranet'))
with check (bucket_id = 'documentos' and public.has_system_access('intranet'));

drop policy if exists "storage_documents_delete_authenticated" on storage.objects;
create policy "storage_documents_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'documentos' and public.has_system_access('intranet'));
