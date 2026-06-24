create or replace function public.crm_current_colaborador_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.colaboradores c
  where c.id = auth.uid()
     or lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by case when c.id = auth.uid() then 0 else 1 end
  limit 1;
$$;

create or replace function public.crm_current_unidade_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.unidade_id
  from public.colaboradores c
  where c.id = public.crm_current_colaborador_id();
$$;

create or replace function public.crm_can_access_lead(lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = gestao_crm, public
as $$
  select exists (
    select 1
    from gestao_crm.leads l
    where l.id = lead_id
      and (
        public.crm_access_level() = 'admin'
        or (public.crm_access_level() = 'gestor' and l.unidade_id = public.crm_current_unidade_id())
        or (
          public.crm_access_level() = 'usuario'
          and (l.responsavel_id = public.crm_current_colaborador_id() or l.criado_por = public.crm_current_colaborador_id())
        )
      )
  );
$$;

create or replace function public.crm_can_access_cliente(cliente_id uuid)
returns boolean
language sql
stable
security definer
set search_path = gestao_crm, public
as $$
  select exists (
    select 1
    from gestao_crm.clientes c
    where c.id = cliente_id
      and (
        public.crm_access_level() = 'admin'
        or c.criado_por = public.crm_current_colaborador_id()
        or exists (
          select 1
          from gestao_crm.leads l
          where l.cliente_id = c.id
            and (
              (public.crm_access_level() = 'gestor' and l.unidade_id = public.crm_current_unidade_id())
              or (
                public.crm_access_level() = 'usuario'
                and (l.responsavel_id = public.crm_current_colaborador_id() or l.criado_por = public.crm_current_colaborador_id())
              )
            )
        )
      )
  );
$$;

drop policy if exists "crm_clientes_select" on gestao_crm.clientes;
create policy "crm_clientes_select"
  on gestao_crm.clientes
  for select
  to authenticated
  using (public.crm_can_access_cliente(id));

drop policy if exists "crm_clientes_manage" on gestao_crm.clientes;
create policy "crm_clientes_manage"
  on gestao_crm.clientes
  for all
  to authenticated
  using (public.crm_can_access_cliente(id) or criado_por = public.crm_current_colaborador_id())
  with check (
    public.crm_access_level() = 'admin'
    or criado_por = public.crm_current_colaborador_id()
    or public.crm_can_access_cliente(id)
  );

drop policy if exists "crm_leads_select" on gestao_crm.leads;
create policy "crm_leads_select"
  on gestao_crm.leads
  for select
  to authenticated
  using (public.crm_can_access_lead(id));

drop policy if exists "crm_leads_manage" on gestao_crm.leads;
create policy "crm_leads_manage"
  on gestao_crm.leads
  for all
  to authenticated
  using (public.crm_can_access_lead(id))
  with check (
    public.crm_access_level() = 'admin'
    or (public.crm_access_level() = 'gestor' and unidade_id = public.crm_current_unidade_id())
    or (
      public.crm_access_level() = 'usuario'
      and unidade_id = public.crm_current_unidade_id()
      and responsavel_id = public.crm_current_colaborador_id()
    )
  );

drop policy if exists "crm_atendimentos_select" on gestao_crm.atendimentos;
create policy "crm_atendimentos_select"
  on gestao_crm.atendimentos
  for select
  to authenticated
  using (public.crm_can_access_lead(lead_id));

drop policy if exists "crm_atendimentos_manage" on gestao_crm.atendimentos;
create policy "crm_atendimentos_manage"
  on gestao_crm.atendimentos
  for all
  to authenticated
  using (public.crm_can_access_lead(lead_id))
  with check (public.crm_can_access_lead(lead_id));

drop policy if exists "crm_historico_atendimentos_select" on gestao_crm.historico_atendimentos;
create policy "crm_historico_atendimentos_select"
  on gestao_crm.historico_atendimentos
  for select
  to authenticated
  using (
    public.crm_can_access_cliente(cliente_id)
    or (lead_id is not null and public.crm_can_access_lead(lead_id))
  );

drop policy if exists "crm_historico_atendimentos_manage" on gestao_crm.historico_atendimentos;
create policy "crm_historico_atendimentos_manage"
  on gestao_crm.historico_atendimentos
  for all
  to authenticated
  using (
    public.crm_can_access_cliente(cliente_id)
    or (lead_id is not null and public.crm_can_access_lead(lead_id))
  )
  with check (
    public.crm_can_access_cliente(cliente_id)
    or (lead_id is not null and public.crm_can_access_lead(lead_id))
  );

grant execute on function public.crm_current_colaborador_id() to authenticated, service_role;
grant execute on function public.crm_current_unidade_id() to authenticated, service_role;
grant execute on function public.crm_can_access_lead(uuid) to authenticated, service_role;
grant execute on function public.crm_can_access_cliente(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
