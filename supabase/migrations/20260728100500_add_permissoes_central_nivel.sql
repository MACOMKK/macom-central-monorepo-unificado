-- Nova matriz de permissoes do central por nivel_acesso (admin/gestor/usuario),
-- espelhando gestao_relatorio.permissoes_funcoes. Substitui, ao longo da
-- transicao, a matriz antiga gestao_ativos.permissoes_central (que era
-- indexada por colaboradores.funcao). A tabela antiga permanece intacta como
-- fallback de leitura ate a limpeza final.
create table if not exists gestao_ativos.permissoes_central_nivel (
  id uuid primary key default gen_random_uuid(),
  nivel_acesso text not null,
  modulo text not null,
  permissao text not null default 'sem'
    check (permissao in ('sem', 'ver', 'gerenciar')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint permissoes_central_nivel_key unique (nivel_acesso, modulo)
);

create index if not exists permissoes_central_nivel_nivel_acesso_idx
  on gestao_ativos.permissoes_central_nivel (nivel_acesso);

create index if not exists permissoes_central_nivel_modulo_idx
  on gestao_ativos.permissoes_central_nivel (modulo);

alter table gestao_ativos.permissoes_central_nivel enable row level security;

drop policy if exists "permissoes_central_nivel_select" on gestao_ativos.permissoes_central_nivel;
create policy "permissoes_central_nivel_select"
on gestao_ativos.permissoes_central_nivel
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
  or exists (
    select 1
    from public.acessos_usuario_sistema aus
    join public.sistemas s on s.id = aus.sistema_id
    where aus.colaborador_id = auth.uid()
      and aus.ativo = true
      and aus.nivel_acesso in ('admin', 'gestor')
      and s.slug = 'central'
      and s.ativo = true
  )
);

drop policy if exists "permissoes_central_nivel_write" on gestao_ativos.permissoes_central_nivel;
create policy "permissoes_central_nivel_write"
on gestao_ativos.permissoes_central_nivel
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
  or exists (
    select 1
    from public.acessos_usuario_sistema aus
    join public.sistemas s on s.id = aus.sistema_id
    where aus.colaborador_id = auth.uid()
      and aus.ativo = true
      and aus.nivel_acesso = 'admin'
      and s.slug = 'central'
      and s.ativo = true
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
  or exists (
    select 1
    from public.acessos_usuario_sistema aus
    join public.sistemas s on s.id = aus.sistema_id
    where aus.colaborador_id = auth.uid()
      and aus.ativo = true
      and aus.nivel_acesso = 'admin'
      and s.slug = 'central'
      and s.ativo = true
  )
);

-- Copia os dados existentes da matriz por funcao (hoje so existem linhas para
-- funcao='gestor'; 'admin' e sempre sintetizado em codigo, nunca persistido).
insert into gestao_ativos.permissoes_central_nivel (nivel_acesso, modulo, permissao)
select funcao, modulo, nivel_acesso
from gestao_ativos.permissoes_central
where funcao = 'gestor'
on conflict (nivel_acesso, modulo) do nothing;
