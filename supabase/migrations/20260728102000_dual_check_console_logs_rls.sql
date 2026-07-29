-- Amplia as policies de leitura dos logs de acesso/auditoria do console e do
-- central para tambem aceitar acesso explicito via acessos_usuario_sistema
-- (slug 'central'), na mesma linha do dual-gate aplicado as demais policies
-- desta migracao de transicao.
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

drop policy if exists "logs_auditoria_select_admin_central" on gestao_ativos.logs_auditoria;
create policy "logs_auditoria_select_admin_central"
on gestao_ativos.logs_auditoria
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
      and s.slug = 'central'
      and s.ativo = true
  )
);
