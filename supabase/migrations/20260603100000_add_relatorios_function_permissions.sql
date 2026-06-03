create table if not exists gestao_relatorio.permissoes_funcoes (
  id uuid primary key default gen_random_uuid(),
  nivel_acesso text not null,
  modulo text not null,
  permissao text not null default 'sem'
    check (permissao in ('sem', 'ver', 'gerenciar')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint permissoes_funcoes_nivel_modulo_key unique (nivel_acesso, modulo)
);

create index if not exists permissoes_funcoes_nivel_acesso_idx
  on gestao_relatorio.permissoes_funcoes (nivel_acesso);

create index if not exists permissoes_funcoes_modulo_idx
  on gestao_relatorio.permissoes_funcoes (modulo);

alter table gestao_relatorio.permissoes_funcoes enable row level security;

drop policy if exists "permissoes_funcoes_select_admin_relatorios" on gestao_relatorio.permissoes_funcoes;
create policy "permissoes_funcoes_select_admin_relatorios"
on gestao_relatorio.permissoes_funcoes
for select
to authenticated
using (
  exists (
    select 1
    from public.colaboradores c
    where c.id = auth.uid()
      and c.status <> 'inativo'
      and c.funcao = 'admin'
  )
  or exists (
    select 1
    from public.acessos_usuario_sistema aus
    join public.sistemas s on s.id = aus.sistema_id
    where aus.colaborador_id = auth.uid()
      and aus.ativo = true
      and aus.nivel_acesso = 'admin'
      and s.slug = 'relatorios'
      and s.ativo = true
  )
);

drop policy if exists "permissoes_funcoes_write_admin" on gestao_relatorio.permissoes_funcoes;
create policy "permissoes_funcoes_write_admin"
on gestao_relatorio.permissoes_funcoes
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

insert into gestao_relatorio.permissoes_funcoes (nivel_acesso, modulo, permissao)
values
  ('gestor', 'relatorios', 'ver'),
  ('gestor', 'permissoes_relatorios', 'sem'),
  ('gestor', 'avisos_relatorios', 'sem'),
  ('gestor', 'logs_auditoria', 'sem')
on conflict (nivel_acesso, modulo) do nothing;
