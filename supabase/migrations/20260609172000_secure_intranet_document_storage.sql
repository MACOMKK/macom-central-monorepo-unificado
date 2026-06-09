update storage.buckets
set public = false
where id = 'documentos';

drop policy if exists "storage_documents_read_authenticated" on storage.objects;
drop policy if exists "storage_documents_write_authenticated" on storage.objects;
drop policy if exists "storage_documents_update_authenticated" on storage.objects;
drop policy if exists "storage_documents_delete_authenticated" on storage.objects;

create policy "storage_documents_insert_document_editors"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
  and public.intranet_can_edit_module('documentos')
);
