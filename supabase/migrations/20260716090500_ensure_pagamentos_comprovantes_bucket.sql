insert into storage.buckets (id, name, public)
values ('comprovantes-pagamento', 'comprovantes-pagamento', false)
on conflict (id) do nothing;

drop policy if exists "storage_comprovantes_pagamento_read_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'comprovantes-pagamento' and public.has_system_access('pagamentos'));

drop policy if exists "storage_comprovantes_pagamento_write_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_write_authenticated"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'comprovantes-pagamento' and public.has_system_access('pagamentos'));

drop policy if exists "storage_comprovantes_pagamento_update_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_update_authenticated"
on storage.objects
for update
to authenticated
using (bucket_id = 'comprovantes-pagamento' and public.has_system_access('pagamentos'))
with check (bucket_id = 'comprovantes-pagamento' and public.has_system_access('pagamentos'));

drop policy if exists "storage_comprovantes_pagamento_delete_authenticated" on storage.objects;
create policy "storage_comprovantes_pagamento_delete_authenticated"
on storage.objects
for delete
to authenticated
using (bucket_id = 'comprovantes-pagamento' and public.has_system_access('pagamentos'));
