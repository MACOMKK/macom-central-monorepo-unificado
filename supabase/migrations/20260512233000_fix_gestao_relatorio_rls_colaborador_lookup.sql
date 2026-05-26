create or replace function public.current_colaborador_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.colaboradores c
  where lower(c.email) = lower(auth.email())
  limit 1;
$$;
create or replace function public.relatorios_access_level()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select aus.nivel_acesso
  from public.acessos_usuario_sistema aus
  join public.sistemas s on s.id = aus.sistema_id
  where aus.colaborador_id = public.current_colaborador_id()
    and aus.ativo = true
    and s.slug = 'relatorios'
    and s.ativo = true
  limit 1;
$$;
drop policy if exists "relatorios_select_admin_or_permitted" on gestao_relatorio.relatorios;
create policy "relatorios_select_admin_or_permitted"
  on gestao_relatorio.relatorios
  for select
  to authenticated
  using (
    public.relatorios_is_admin()
    or exists (
      select 1
      from gestao_relatorio.permissoes_relatorios pr
      where pr.colaborador_id = public.current_colaborador_id()
        and pr.relatorio_id = relatorios.id
    )
  );
drop policy if exists "permissoes_relatorios_select_admin_or_own" on gestao_relatorio.permissoes_relatorios;
create policy "permissoes_relatorios_select_admin_or_own"
  on gestao_relatorio.permissoes_relatorios
  for select
  to authenticated
  using (
    public.relatorios_is_admin()
    or colaborador_id = public.current_colaborador_id()
  );
