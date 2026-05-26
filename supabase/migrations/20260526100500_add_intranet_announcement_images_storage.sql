insert into storage.buckets (id, name, public)
values ('avisos', 'avisos', true)
on conflict (id) do nothing;

drop policy if exists "storage_announcements_read_authenticated" on storage.objects;
create policy "storage_announcements_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'avisos' and public.has_system_access('intranet'));

drop policy if exists "storage_announcements_write_authenticated" on storage.objects;
create policy "storage_announcements_write_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avisos' and public.has_system_access('intranet'));

drop policy if exists "storage_announcements_update_authenticated" on storage.objects;
create policy "storage_announcements_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'avisos' and public.has_system_access('intranet'))
with check (bucket_id = 'avisos' and public.has_system_access('intranet'));

drop policy if exists "storage_announcements_delete_authenticated" on storage.objects;
create policy "storage_announcements_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'avisos' and public.has_system_access('intranet'));
