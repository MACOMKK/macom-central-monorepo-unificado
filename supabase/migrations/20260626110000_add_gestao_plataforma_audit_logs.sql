create schema if not exists gestao_plataforma;

create table if not exists gestao_plataforma.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  acao text not null,
  registro_id uuid,
  responsavel_colaborador_id uuid references public.colaboradores(id) on delete set null,
  responsavel_email text,
  antes jsonb,
  depois jsonb,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists logs_auditoria_plataforma_entidade_idx
  on gestao_plataforma.logs_auditoria (entidade);

create index if not exists logs_auditoria_plataforma_acao_idx
  on gestao_plataforma.logs_auditoria (acao);

create index if not exists logs_auditoria_plataforma_registro_id_idx
  on gestao_plataforma.logs_auditoria (registro_id);

create index if not exists logs_auditoria_plataforma_responsavel_colaborador_id_idx
  on gestao_plataforma.logs_auditoria (responsavel_colaborador_id);

create index if not exists logs_auditoria_plataforma_criado_em_idx
  on gestao_plataforma.logs_auditoria (criado_em desc);

alter table gestao_plataforma.logs_auditoria enable row level security;

grant usage on schema gestao_plataforma to authenticated, service_role;
grant select on gestao_plataforma.logs_auditoria to authenticated;
grant select, insert on gestao_plataforma.logs_auditoria to service_role;

drop policy if exists "logs_auditoria_plataforma_select_admin_console" on gestao_plataforma.logs_auditoria;
create policy "logs_auditoria_plataforma_select_admin_console"
on gestao_plataforma.logs_auditoria
for select
to authenticated
using (
  exists (
    select 1
    from public.colaboradores c
    where c.id = auth.uid()
      and c.status <> 'inativo'
      and c.funcao in ('admin', 'gestor')
  )
);

drop policy if exists "logs_auditoria_plataforma_insert_service_role" on gestao_plataforma.logs_auditoria;
create policy "logs_auditoria_plataforma_insert_service_role"
on gestao_plataforma.logs_auditoria
for insert
to service_role
with check (true);
