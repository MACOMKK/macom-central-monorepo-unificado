create table if not exists gestao_crm.conversas_atendimento (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references gestao_crm.clientes(id) on delete set null,
  lead_id uuid references gestao_crm.leads(id) on delete set null,
  telefone_normalizado text not null,
  canal text not null default 'whatsapp' check (canal in ('whatsapp')),
  status text not null default 'aberta' check (status in ('aberta', 'aguardando_humano', 'encerrada')),
  ultima_mensagem_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_crm.mensagens_atendimento (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references gestao_crm.conversas_atendimento(id) on delete cascade,
  direcao text not null check (direcao in ('entrada', 'saida')),
  autor text not null check (autor in ('cliente', 'ia', 'humano')),
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  conteudo text not null,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists conversas_atendimento_telefone_idx
  on gestao_crm.conversas_atendimento (telefone_normalizado);
create index if not exists conversas_atendimento_cliente_idx
  on gestao_crm.conversas_atendimento (cliente_id);
create index if not exists conversas_atendimento_lead_idx
  on gestao_crm.conversas_atendimento (lead_id);
create index if not exists mensagens_atendimento_conversa_idx
  on gestao_crm.mensagens_atendimento (conversa_id, criado_em);

drop trigger if exists trg_crm_conversas_atendimento_set_updated_at on gestao_crm.conversas_atendimento;
create trigger trg_crm_conversas_atendimento_set_updated_at
before update on gestao_crm.conversas_atendimento
for each row
execute function public.set_updated_at();

alter table gestao_crm.conversas_atendimento enable row level security;
alter table gestao_crm.mensagens_atendimento enable row level security;

drop policy if exists "crm_conversas_atendimento_select" on gestao_crm.conversas_atendimento;
create policy "crm_conversas_atendimento_select"
  on gestao_crm.conversas_atendimento
  for select
  to authenticated
  using (
    (lead_id is not null and public.crm_can_access_lead(lead_id))
    or (cliente_id is not null and public.crm_can_access_cliente(cliente_id))
    or (lead_id is null and cliente_id is null and public.crm_access_level() = 'admin')
  );

drop policy if exists "crm_conversas_atendimento_manage" on gestao_crm.conversas_atendimento;
create policy "crm_conversas_atendimento_manage"
  on gestao_crm.conversas_atendimento
  for all
  to authenticated
  using (
    (lead_id is not null and public.crm_can_access_lead(lead_id))
    or (cliente_id is not null and public.crm_can_access_cliente(cliente_id))
    or (lead_id is null and cliente_id is null and public.crm_access_level() = 'admin')
  )
  with check (
    (lead_id is not null and public.crm_can_access_lead(lead_id))
    or (cliente_id is not null and public.crm_can_access_cliente(cliente_id))
    or (lead_id is null and cliente_id is null and public.crm_access_level() = 'admin')
  );

drop policy if exists "crm_mensagens_atendimento_select" on gestao_crm.mensagens_atendimento;
create policy "crm_mensagens_atendimento_select"
  on gestao_crm.mensagens_atendimento
  for select
  to authenticated
  using (
    exists (
      select 1
      from gestao_crm.conversas_atendimento c
      where c.id = mensagens_atendimento.conversa_id
        and (
          (c.lead_id is not null and public.crm_can_access_lead(c.lead_id))
          or (c.cliente_id is not null and public.crm_can_access_cliente(c.cliente_id))
          or (c.lead_id is null and c.cliente_id is null and public.crm_access_level() = 'admin')
        )
    )
  );

drop policy if exists "crm_mensagens_atendimento_manage" on gestao_crm.mensagens_atendimento;
create policy "crm_mensagens_atendimento_manage"
  on gestao_crm.mensagens_atendimento
  for all
  to authenticated
  using (
    exists (
      select 1
      from gestao_crm.conversas_atendimento c
      where c.id = mensagens_atendimento.conversa_id
        and (
          (c.lead_id is not null and public.crm_can_access_lead(c.lead_id))
          or (c.cliente_id is not null and public.crm_can_access_cliente(c.cliente_id))
          or (c.lead_id is null and c.cliente_id is null and public.crm_access_level() = 'admin')
        )
    )
  )
  with check (
    exists (
      select 1
      from gestao_crm.conversas_atendimento c
      where c.id = mensagens_atendimento.conversa_id
        and (
          (c.lead_id is not null and public.crm_can_access_lead(c.lead_id))
          or (c.cliente_id is not null and public.crm_can_access_cliente(c.cliente_id))
          or (c.lead_id is null and c.cliente_id is null and public.crm_access_level() = 'admin')
        )
    )
  );

grant select, insert, update, delete on gestao_crm.conversas_atendimento to authenticated, service_role;
grant select, insert, update, delete on gestao_crm.mensagens_atendimento to authenticated, service_role;

alter table gestao_crm.conversas_atendimento replica identity full;
alter table gestao_crm.mensagens_atendimento replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'conversas_atendimento'
  ) then
    alter publication supabase_realtime add table gestao_crm.conversas_atendimento;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_crm'
      and tablename = 'mensagens_atendimento'
  ) then
    alter publication supabase_realtime add table gestao_crm.mensagens_atendimento;
  end if;
end
$$;

notify pgrst, 'reload schema';
