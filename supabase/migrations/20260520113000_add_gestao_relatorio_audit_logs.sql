create table if not exists gestao_relatorio.logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  entidade text not null,
  acao text not null,
  registro_id uuid,
  actor_colaborador_id uuid references public.colaboradores(id) on delete set null,
  actor_email text,
  antes jsonb,
  depois jsonb,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists logs_auditoria_entidade_idx
  on gestao_relatorio.logs_auditoria (entidade);

create index if not exists logs_auditoria_registro_id_idx
  on gestao_relatorio.logs_auditoria (registro_id);

create index if not exists logs_auditoria_criado_em_idx
  on gestao_relatorio.logs_auditoria (criado_em desc);

alter table gestao_relatorio.logs_auditoria enable row level security;

drop policy if exists "logs_auditoria_admin_select" on gestao_relatorio.logs_auditoria;
create policy "logs_auditoria_admin_select"
  on gestao_relatorio.logs_auditoria
  for select
  to authenticated
  using (public.relatorios_is_admin());
