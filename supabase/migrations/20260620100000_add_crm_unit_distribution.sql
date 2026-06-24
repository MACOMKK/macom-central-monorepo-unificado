alter table gestao_crm.leads
  add column if not exists unidade_id uuid references public.unidades(id) on delete restrict;

create index if not exists idx_crm_leads_unidade_status
  on gestao_crm.leads (unidade_id, status);

update gestao_crm.leads l
set unidade_id = (
  select u.id
  from public.unidades u
  where (lower(l.empresa) like '%ananindeua%' and lower(u.nome) like '%ananindeua%')
     or (lower(l.empresa) like '%bel%' and lower(u.nome) like '%bel%')
     or (lower(l.empresa) like '%paragominas%' and lower(u.nome) like '%paragominas%')
  order by u.nome
  limit 1
)
where l.unidade_id is null;

create table if not exists gestao_crm.configuracoes_distribuicao (
  unidade_id uuid primary key references public.unidades(id) on delete cascade,
  ativa boolean not null default true,
  estrategia text not null default 'menor_carteira'
    check (estrategia in ('menor_carteira', 'rodizio')),
  limite_padrao_leads_ativos integer
    check (limite_padrao_leads_ativos is null or limite_padrao_leads_ativos > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists gestao_crm.vendedores_distribuicao (
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  ativo boolean not null default true,
  limite_leads_ativos integer
    check (limite_leads_ativos is null or limite_leads_ativos > 0),
  ultimo_lead_atribuido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (unidade_id, colaborador_id)
);

create index if not exists idx_crm_vendedores_distribuicao_elegiveis
  on gestao_crm.vendedores_distribuicao (unidade_id, ativo, ultimo_lead_atribuido_em);

insert into gestao_crm.configuracoes_distribuicao (unidade_id)
select distinct c.unidade_id
from public.colaboradores c
join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
join public.sistemas s on s.id = aus.sistema_id and s.slug = 'crm' and s.ativo = true
where c.unidade_id is not null and c.status <> 'inativo'
on conflict (unidade_id) do nothing;

insert into gestao_crm.vendedores_distribuicao (unidade_id, colaborador_id)
select c.unidade_id, c.id
from public.colaboradores c
join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
join public.sistemas s on s.id = aus.sistema_id and s.slug = 'crm' and s.ativo = true
where c.unidade_id is not null and c.status <> 'inativo'
on conflict (unidade_id, colaborador_id) do nothing;

drop trigger if exists trg_crm_distribuicao_set_updated_at on gestao_crm.configuracoes_distribuicao;
create trigger trg_crm_distribuicao_set_updated_at
before update on gestao_crm.configuracoes_distribuicao
for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_vendedores_distribuicao_set_updated_at on gestao_crm.vendedores_distribuicao;
create trigger trg_crm_vendedores_distribuicao_set_updated_at
before update on gestao_crm.vendedores_distribuicao
for each row execute function public.set_updated_at();

alter table gestao_crm.configuracoes_distribuicao enable row level security;
alter table gestao_crm.vendedores_distribuicao enable row level security;

drop policy if exists "crm_distribuicao_select" on gestao_crm.configuracoes_distribuicao;
create policy "crm_distribuicao_select" on gestao_crm.configuracoes_distribuicao
for select to authenticated using (public.crm_has_access());

drop policy if exists "crm_distribuicao_manage" on gestao_crm.configuracoes_distribuicao;
create policy "crm_distribuicao_manage" on gestao_crm.configuracoes_distribuicao
for all to authenticated
using (public.crm_access_level() in ('admin', 'gestor'))
with check (public.crm_access_level() in ('admin', 'gestor'));

drop policy if exists "crm_vendedores_distribuicao_select" on gestao_crm.vendedores_distribuicao;
create policy "crm_vendedores_distribuicao_select" on gestao_crm.vendedores_distribuicao
for select to authenticated using (public.crm_has_access());

drop policy if exists "crm_vendedores_distribuicao_manage" on gestao_crm.vendedores_distribuicao;
create policy "crm_vendedores_distribuicao_manage" on gestao_crm.vendedores_distribuicao
for all to authenticated
using (public.crm_access_level() in ('admin', 'gestor'))
with check (public.crm_access_level() in ('admin', 'gestor'));

grant select, insert, update, delete on gestao_crm.configuracoes_distribuicao to authenticated, service_role;
grant select, insert, update, delete on gestao_crm.vendedores_distribuicao to authenticated, service_role;

create or replace function gestao_crm.prepare_lead_phase1()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
declare
  assigned_collaborator_id uuid;
  distribution_config gestao_crm.configuracoes_distribuicao%rowtype;
  manual_responsavel_unidade_id uuid;
begin
  if new.status = 'perdido' and nullif(trim(coalesce(new.motivo_perda, '')), '') is null then
    raise exception using errcode = '23514', message = 'Motivo da perda e obrigatorio para leads perdidos.';
  end if;

  if new.status <> 'perdido' then
    new.motivo_perda = null;
    new.perdido_em = null;
  elsif new.perdido_em is null then
    new.perdido_em = now();
  end if;

  if new.status = 'convertido' and new.convertido_em is null then
    new.convertido_em = now();
  elsif new.status <> 'convertido' then
    new.convertido_em = null;
  end if;

  if new.unidade_id is null then
    select u.id into new.unidade_id
    from public.unidades u
    where (lower(new.empresa) like '%ananindeua%' and lower(u.nome) like '%ananindeua%')
       or (lower(new.empresa) like '%bel%' and lower(u.nome) like '%bel%')
       or (lower(new.empresa) like '%paragominas%' and lower(u.nome) like '%paragominas%')
    order by u.nome
    limit 1;
  end if;

  if new.unidade_id is null then
    raise exception using errcode = '23514', message = 'Unidade do lead e obrigatoria para distribuicao.';
  end if;

  if new.responsavel_id is not null then
    select c.unidade_id into manual_responsavel_unidade_id
    from public.colaboradores c
    join public.acessos_usuario_sistema aus on aus.colaborador_id = c.id and aus.ativo = true
    join public.sistemas s on s.id = aus.sistema_id and s.slug = 'crm' and s.ativo = true
    where c.id = new.responsavel_id and c.status <> 'inativo';

    if manual_responsavel_unidade_id is null or manual_responsavel_unidade_id <> new.unidade_id then
      raise exception using errcode = '23514', message = 'Responsavel deve possuir acesso ao CRM e pertencer a unidade do lead.';
    end if;
  end if;

  if tg_op = 'INSERT' and new.responsavel_id is null then
    perform pg_advisory_xact_lock(hashtextextended(new.unidade_id::text, 0));

    select * into distribution_config
    from gestao_crm.configuracoes_distribuicao
    where unidade_id = new.unidade_id;

    if distribution_config.ativa then
      if distribution_config.estrategia = 'rodizio' then
        select vd.colaborador_id into assigned_collaborator_id
        from gestao_crm.vendedores_distribuicao vd
        join public.colaboradores c on c.id = vd.colaborador_id
        left join gestao_crm.leads active_lead
          on active_lead.responsavel_id = vd.colaborador_id
         and active_lead.status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta')
        where vd.unidade_id = new.unidade_id and vd.ativo and c.status <> 'inativo'
        group by vd.colaborador_id, vd.ultimo_lead_atribuido_em, vd.limite_leads_ativos
        having count(active_lead.id) < coalesce(vd.limite_leads_ativos, distribution_config.limite_padrao_leads_ativos, 2147483647)
        order by vd.ultimo_lead_atribuido_em nulls first, vd.colaborador_id
        limit 1;
      else
        select vd.colaborador_id into assigned_collaborator_id
        from gestao_crm.vendedores_distribuicao vd
        join public.colaboradores c on c.id = vd.colaborador_id
        left join gestao_crm.leads active_lead
          on active_lead.responsavel_id = vd.colaborador_id
         and active_lead.status in ('novo', 'tentativa_contato', 'em_contato', 'qualificado', 'proposta')
        where vd.unidade_id = new.unidade_id and vd.ativo and c.status <> 'inativo'
        group by vd.colaborador_id, vd.ultimo_lead_atribuido_em, vd.limite_leads_ativos
        having count(active_lead.id) < coalesce(vd.limite_leads_ativos, distribution_config.limite_padrao_leads_ativos, 2147483647)
        order by count(active_lead.id), vd.ultimo_lead_atribuido_em nulls first, vd.colaborador_id
        limit 1;
      end if;

      if assigned_collaborator_id is null then
        raise exception using errcode = '23514', message = 'Nenhum vendedor elegivel para receber o lead nesta unidade.';
      end if;

      new.responsavel_id = assigned_collaborator_id;
      update gestao_crm.vendedores_distribuicao
      set ultimo_lead_atribuido_em = now()
      where unidade_id = new.unidade_id and colaborador_id = assigned_collaborator_id;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.atribuido_em = case when new.responsavel_id is null then null else now() end;
  elsif new.responsavel_id is distinct from old.responsavel_id then
    new.atribuido_em = case when new.responsavel_id is null then null else now() end;
  end if;

  if new.sla_primeiro_contato_em is null then
    new.sla_primeiro_contato_em = coalesce(new.criado_em, now()) + interval '30 minutes';
  end if;

  return new;
end;
$$;

grant execute on function gestao_crm.prepare_lead_phase1() to authenticated, service_role;
notify pgrst, 'reload schema';
