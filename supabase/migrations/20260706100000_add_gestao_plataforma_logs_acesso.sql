create table if not exists gestao_plataforma.logs_acesso (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  sistema_id uuid not null references public.sistemas(id) on delete cascade,
  evento text not null default 'login',
  ip_address inet,
  user_agent text,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists logs_acesso_plataforma_colaborador_id_idx
  on gestao_plataforma.logs_acesso (colaborador_id);

create index if not exists logs_acesso_plataforma_sistema_id_idx
  on gestao_plataforma.logs_acesso (sistema_id);

create index if not exists logs_acesso_plataforma_criado_em_idx
  on gestao_plataforma.logs_acesso (criado_em desc);

alter table gestao_plataforma.logs_acesso enable row level security;

grant select on gestao_plataforma.logs_acesso to authenticated;
grant select, insert on gestao_plataforma.logs_acesso to service_role;

drop policy if exists "logs_acesso_plataforma_select_admin_console" on gestao_plataforma.logs_acesso;
create policy "logs_acesso_plataforma_select_admin_console"
on gestao_plataforma.logs_acesso
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

drop policy if exists "logs_acesso_plataforma_insert_service_role" on gestao_plataforma.logs_acesso;
create policy "logs_acesso_plataforma_insert_service_role"
on gestao_plataforma.logs_acesso
for insert
to service_role
with check (true);
