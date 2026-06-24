alter table gestao_intranet.documentos
  add column if not exists visibilidade text not null default 'geral',
  add column if not exists nivel_minimo text;

update gestao_intranet.documentos
set visibilidade = 'setor'
where departamento_id is not null
  and coalesce(visibilidade, 'geral') = 'geral';

alter table gestao_intranet.documentos
  drop constraint if exists documentos_visibilidade_check,
  drop constraint if exists documentos_nivel_minimo_check;

alter table gestao_intranet.documentos
  add constraint documentos_visibilidade_check
    check (visibilidade in ('geral', 'setor', 'nivel')),
  add constraint documentos_nivel_minimo_check
    check (nivel_minimo is null or nivel_minimo in ('gestor', 'admin'));

create index if not exists idx_intranet_documentos_visibilidade
  on gestao_intranet.documentos (visibilidade);

create or replace function public.intranet_can_view_document(
  document_department_id uuid,
  document_visibility text default 'geral',
  document_minimum_access_level text default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.intranet_is_admin()
    or coalesce(document_visibility, case when document_department_id is null then 'geral' else 'setor' end) = 'geral'
    or (
      coalesce(document_visibility, case when document_department_id is null then 'geral' else 'setor' end) = 'setor'
      and document_department_id is not null
      and document_department_id = public.intranet_current_department_id()
    )
    or (
      coalesce(document_visibility, case when document_department_id is null then 'geral' else 'setor' end) = 'nivel'
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
    and public.intranet_can_view_document(departamento_id, visibilidade, nivel_minimo)
  );

grant execute on function public.intranet_can_view_document(uuid, text, text) to authenticated, service_role;
