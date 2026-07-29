-- Amplia as policies da matriz antiga (por funcao) para tambem aceitar acesso
-- explicito via acessos_usuario_sistema, mantendo a transicao dual-gate ate o
-- cutover final (quando colaboradores.funcao deixa de ser gate de acesso).
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
