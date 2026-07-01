-- has_system_access() checks acessos_usuario_sistema, which is never populated for the
-- 'central' system (central access is granted via colaboradores.funcao + permissoes_central).
-- That made every storage policy for the contratos-documentos folder unsatisfiable, so
-- uploads/downloads always failed with "new row violates row-level security policy".
create or replace function public.central_module_access(p_modulo text, p_min_nivel text default 'ver')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.colaboradores c
    where c.id = public.current_colaborador_id()
      and c.status <> 'inativo'
      and (
        c.funcao = 'admin'
        or (
          c.funcao = 'gestor'
          and exists (
            select 1
            from gestao_ativos.permissoes_central pc
            where pc.funcao = 'gestor'
              and pc.modulo = p_modulo
              and (
                (p_min_nivel = 'ver' and pc.nivel_acesso in ('ver', 'gerenciar'))
                or (p_min_nivel = 'gerenciar' and pc.nivel_acesso = 'gerenciar')
              )
          )
        )
      )
  );
$$;

drop policy if exists "contratos_documentos_select_central" on gestao_ativos.contratos_documentos;
create policy "contratos_documentos_select_central"
  on gestao_ativos.contratos_documentos
  for select
  using (public.central_module_access('contratos_documentos', 'ver'));

drop policy if exists "contratos_documentos_manage_central" on gestao_ativos.contratos_documentos;
create policy "contratos_documentos_manage_central"
  on gestao_ativos.contratos_documentos
  for all
  using (public.central_module_access('contratos_documentos', 'gerenciar'))
  with check (public.central_module_access('contratos_documentos', 'gerenciar'));

drop policy if exists "central_anexos_contratos_documentos_select" on storage.objects;
drop policy if exists "central_anexos_contratos_documentos_insert" on storage.objects;
drop policy if exists "central_anexos_contratos_documentos_update" on storage.objects;
drop policy if exists "central_anexos_contratos_documentos_delete" on storage.objects;

create policy "central_anexos_contratos_documentos_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('contratos_documentos', 'ver')
);

create policy "central_anexos_contratos_documentos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('contratos_documentos', 'gerenciar')
);

create policy "central_anexos_contratos_documentos_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('contratos_documentos', 'gerenciar')
)
with check (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('contratos_documentos', 'gerenciar')
);

create policy "central_anexos_contratos_documentos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'central-anexos'
  and (storage.foldername(name))[1] = 'contratos-documentos'
  and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and public.central_module_access('contratos_documentos', 'gerenciar')
);
