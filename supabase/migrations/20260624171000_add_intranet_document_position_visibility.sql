alter table gestao_intranet.documentos
  add column if not exists cargo_id uuid references public.cargos(id) on delete set null;

update gestao_intranet.documentos
set visibilidade = coalesce(visibilidade, case when departamento_id is null then 'geral' else 'setor' end);

update gestao_intranet.documentos
set departamento_id = null,
    cargo_id = null,
    nivel_minimo = null
where visibilidade = 'geral';

update gestao_intranet.documentos
set cargo_id = null,
    nivel_minimo = null
where visibilidade = 'setor';

update gestao_intranet.documentos
set departamento_id = null,
    nivel_minimo = null
where visibilidade = 'cargo';

update gestao_intranet.documentos
set departamento_id = null,
    cargo_id = null,
    nivel_minimo = coalesce(nivel_minimo, 'gestor')
where visibilidade = 'nivel';

alter table gestao_intranet.documentos
  drop constraint if exists documentos_visibilidade_check,
  drop constraint if exists documentos_visibility_target_check;

alter table gestao_intranet.documentos
  add constraint documentos_visibilidade_check
    check (visibilidade in ('geral', 'setor', 'cargo', 'nivel')),
  add constraint documentos_visibility_target_check
    check (
      (visibilidade = 'geral' and departamento_id is null and cargo_id is null and nivel_minimo is null)
      or (visibilidade = 'setor' and departamento_id is not null and cargo_id is null and nivel_minimo is null)
      or (visibilidade = 'cargo' and cargo_id is not null and departamento_id is null and nivel_minimo is null)
      or (visibilidade = 'nivel' and departamento_id is null and cargo_id is null and nivel_minimo in ('gestor', 'admin'))
    );

create index if not exists idx_intranet_documentos_cargo_id
  on gestao_intranet.documentos (cargo_id);

create or replace function public.intranet_current_position_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.cargo_id
  from public.colaboradores c
  where c.id = auth.uid()
     or lower(trim(c.email)) = lower(trim(auth.email()))
  order by case when c.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.intranet_can_view_document(
  document_department_id uuid,
  document_visibility text default 'geral',
  document_minimum_access_level text default null,
  document_position_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.intranet_is_admin()
    or coalesce(document_visibility, case when document_position_id is not null then 'cargo' when document_department_id is null then 'geral' else 'setor' end) = 'geral'
    or (
      coalesce(document_visibility, case when document_position_id is not null then 'cargo' when document_department_id is null then 'geral' else 'setor' end) = 'setor'
      and document_department_id is not null
      and document_department_id = public.intranet_current_department_id()
    )
    or (
      coalesce(document_visibility, case when document_position_id is not null then 'cargo' when document_department_id is null then 'geral' else 'setor' end) = 'cargo'
      and document_position_id is not null
      and document_position_id = public.intranet_current_position_id()
    )
    or (
      coalesce(document_visibility, case when document_position_id is not null then 'cargo' when document_department_id is null then 'geral' else 'setor' end) = 'nivel'
      and (
        public.system_access_level('intranet') = 'admin'
        or (
          coalesce(document_minimum_access_level, 'gestor') = 'gestor'
          and public.system_access_level('intranet') = 'gestor'
        )
      )
    );
$$;

drop policy if exists "intranet_documentos_select" on gestao_intranet.documentos;
create policy "intranet_documentos_select"
  on gestao_intranet.documentos
  for select
  to authenticated
  using (
    public.intranet_can_view_module('documentos')
    and public.intranet_can_view_document(departamento_id, visibilidade, nivel_minimo, cargo_id)
  );

grant execute on function public.intranet_current_position_id() to authenticated, service_role;
grant execute on function public.intranet_can_view_document(uuid, text, text, uuid) to authenticated, service_role;
