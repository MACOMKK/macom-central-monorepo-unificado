create or replace function public.intranet_current_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.departamento_id
  from public.colaboradores c
  where c.id = public.current_colaborador_id()
  limit 1;
$$;

create or replace function public.intranet_can_view_document(document_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.intranet_is_admin()
    or public.intranet_can_edit_module('documentos')
    or document_department_id is null
    or document_department_id = public.intranet_current_department_id();
$$;

drop policy if exists "documentos_read_intranet_users" on gestao_intranet.documentos;

drop policy if exists "intranet_documentos_select" on gestao_intranet.documentos;
create policy "intranet_documentos_select"
  on gestao_intranet.documentos
  for select
  to authenticated
  using (
    public.intranet_can_view_module('documentos')
    and public.intranet_can_view_document(departamento_id)
  );
