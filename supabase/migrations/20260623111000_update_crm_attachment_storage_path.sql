drop policy if exists "crm_anexos_select" on storage.objects;
drop policy if exists "crm_anexos_insert" on storage.objects;
drop policy if exists "crm_anexos_update" on storage.objects;
drop policy if exists "crm_anexos_delete" on storage.objects;

create policy "crm_anexos_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'crm-anexos'
  and (
    (
      (storage.foldername(name))[1] = 'leads'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.crm_can_access_lead(((storage.foldername(name))[2])::uuid)
    )
    or (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.crm_can_access_lead(((storage.foldername(name))[1])::uuid)
    )
  )
);

create policy "crm_anexos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'crm-anexos'
  and (storage.foldername(name))[1] = 'leads'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.crm_can_access_lead(((storage.foldername(name))[2])::uuid)
);

create policy "crm_anexos_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'crm-anexos'
  and (storage.foldername(name))[1] = 'leads'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.crm_can_access_lead(((storage.foldername(name))[2])::uuid)
)
with check (
  bucket_id = 'crm-anexos'
  and (storage.foldername(name))[1] = 'leads'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.crm_can_access_lead(((storage.foldername(name))[2])::uuid)
);

create policy "crm_anexos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'crm-anexos'
  and (
    (
      (storage.foldername(name))[1] = 'leads'
      and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.crm_can_access_lead(((storage.foldername(name))[2])::uuid)
    )
    or (
      (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.crm_can_access_lead(((storage.foldername(name))[1])::uuid)
    )
  )
);
