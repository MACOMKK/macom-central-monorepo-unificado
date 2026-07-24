-- Corrige RLS defasada de configuracoes_distribuicao/vendedores_distribuicao (ainda sem escopo
-- de unidade, ao contrario de leads/clientes/atendimentos ja corrigidos em
-- 20260623103000_add_crm_seller_unit_permissions.sql) e adiciona policy de insert em
-- logs_auditoria (hoje so funciona porque a crm-api bypassa RLS via conexao direta).

drop policy if exists "crm_distribuicao_select" on gestao_crm.configuracoes_distribuicao;
create policy "crm_distribuicao_select"
  on gestao_crm.configuracoes_distribuicao
  for select
  to authenticated
  using (
    public.crm_access_level() = 'admin'
    or unidade_id = public.crm_current_unidade_id()
  );

drop policy if exists "crm_distribuicao_manage" on gestao_crm.configuracoes_distribuicao;
create policy "crm_distribuicao_manage"
  on gestao_crm.configuracoes_distribuicao
  for all
  to authenticated
  using (
    public.crm_access_level() = 'admin'
    or (public.crm_access_level() = 'gestor' and unidade_id = public.crm_current_unidade_id())
  )
  with check (
    public.crm_access_level() = 'admin'
    or (public.crm_access_level() = 'gestor' and unidade_id = public.crm_current_unidade_id())
  );

drop policy if exists "crm_vendedores_distribuicao_select" on gestao_crm.vendedores_distribuicao;
create policy "crm_vendedores_distribuicao_select"
  on gestao_crm.vendedores_distribuicao
  for select
  to authenticated
  using (
    public.crm_access_level() = 'admin'
    or unidade_id = public.crm_current_unidade_id()
  );

drop policy if exists "crm_vendedores_distribuicao_manage" on gestao_crm.vendedores_distribuicao;
create policy "crm_vendedores_distribuicao_manage"
  on gestao_crm.vendedores_distribuicao
  for all
  to authenticated
  using (
    public.crm_access_level() = 'admin'
    or (public.crm_access_level() = 'gestor' and unidade_id = public.crm_current_unidade_id())
  )
  with check (
    public.crm_access_level() = 'admin'
    or (public.crm_access_level() = 'gestor' and unidade_id = public.crm_current_unidade_id())
  );

drop policy if exists "logs_auditoria_insert" on gestao_crm.logs_auditoria;
create policy "logs_auditoria_insert"
  on gestao_crm.logs_auditoria
  for insert
  to authenticated
  with check (
    public.crm_has_access()
    and (
      actor_colaborador_id is null
      or actor_colaborador_id = public.crm_current_colaborador_id()
    )
  );

notify pgrst, 'reload schema';
