-- Foto de perfil e um dado de identidade do colaborador (mesmo nivel de nome/email), nao algo
-- exclusivo da intranet -- move de gestao_intranet.perfis_colaboradores (extensao especifica da
-- intranet: bio, frase_status, linkedin_url, preferencias, etc.) para public.colaboradores, a
-- tabela global que todo backend (servicos-api, crm-api, intranet-api...) ja consulta no auth/me.
alter table public.colaboradores
  add column if not exists foto_url text,
  add column if not exists foto_path text;

update public.colaboradores c
set foto_url = p.foto_url,
    foto_path = p.foto_path
from gestao_intranet.perfis_colaboradores p
where p.colaborador_id = c.id
  and (p.foto_url is not null or p.foto_path is not null);

-- Policies do bucket avatares eram restritas a quem tem acesso ao sistema intranet -- isso
-- bloqueava ate leitura por outros apps. Agora qualquer colaborador autenticado dono da pasta
-- (colaboradores/<seu id>/...) pode ler/gravar, independente de qual sistema esta acessando.
drop policy if exists "storage_avatars_read_authenticated" on storage.objects;
create policy "storage_avatars_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatares');

drop policy if exists "storage_avatars_insert_own_profile" on storage.objects;
create policy "storage_avatars_insert_own_profile"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatares'
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
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'avatares'
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
  and (storage.foldername(name))[1] = 'colaboradores'
  and (storage.foldername(name))[2] = auth.uid()::text
);
