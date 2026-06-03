create table if not exists gestao_ativos.permissoes_central (
  id uuid primary key default gen_random_uuid(),
  funcao text not null,
  modulo text not null,
  nivel_acesso text not null default 'sem'
    check (nivel_acesso in ('sem', 'ver', 'gerenciar')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint permissoes_central_funcao_modulo_key unique (funcao, modulo)
);

create index if not exists permissoes_central_funcao_idx
  on gestao_ativos.permissoes_central (funcao);

create index if not exists permissoes_central_modulo_idx
  on gestao_ativos.permissoes_central (modulo);

alter table gestao_ativos.permissoes_central enable row level security;

drop policy if exists "permissoes_central_select_admin_gestor" on gestao_ativos.permissoes_central;
create policy "permissoes_central_select_admin_gestor"
on gestao_ativos.permissoes_central
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

drop policy if exists "permissoes_central_write_admin" on gestao_ativos.permissoes_central;
create policy "permissoes_central_write_admin"
on gestao_ativos.permissoes_central
for all
to authenticated
using (
  exists (
    select 1
    from public.colaboradores c
    where c.id = auth.uid()
      and c.status <> 'inativo'
      and c.funcao = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.colaboradores c
    where c.id = auth.uid()
      and c.status <> 'inativo'
      and c.funcao = 'admin'
  )
);

insert into gestao_ativos.permissoes_central (funcao, modulo, nivel_acesso)
values
  ('gestor', 'dashboard', 'ver'),
  ('gestor', 'ativos', 'ver'),
  ('gestor', 'departamentos', 'ver'),
  ('gestor', 'unidades', 'ver'),
  ('gestor', 'colaboradores', 'ver'),
  ('gestor', 'contatos', 'ver'),
  ('gestor', 'linhas_corporativas', 'ver'),
  ('gestor', 'infra_estrutura', 'ver'),
  ('gestor', 'acessos_usuario_sistema', 'sem'),
  ('gestor', 'logs_auditoria', 'sem'),
  ('gestor', 'termos_posse', 'ver')
on conflict (funcao, modulo) do nothing;
