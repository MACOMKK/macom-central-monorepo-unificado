-- central_module_access() ate aqui so considerava colaboradores.funcao, porque
-- acessos_usuario_sistema nunca era populada para o slug 'central'. Agora que a
-- migracao de backfill (20260728100000) passou a popular essa tabela para
-- central, a funcao passa a considerar tambem o acesso explicito (dual-gate),
-- lendo a nova matriz por nivel_acesso (permissoes_central_nivel) com fallback
-- para a matriz antiga por funcao (permissoes_central) enquanto ela existir.
create or replace function public.central_module_access(p_modulo text, p_min_nivel text default 'ver')
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_explicit_tier text;
  v_funcao text;
  v_tier text;
begin
  select c.status, c.funcao
  into v_status, v_funcao
  from public.colaboradores c
  where c.id = public.current_colaborador_id();

  if v_status is null or v_status = 'inativo' then
    return false;
  end if;

  select aus.nivel_acesso
  into v_explicit_tier
  from public.acessos_usuario_sistema aus
  join public.sistemas s on s.id = aus.sistema_id
  where aus.colaborador_id = public.current_colaborador_id()
    and aus.ativo = true
    and s.slug = 'central'
    and s.ativo = true
  limit 1;

  v_tier := coalesce(
    v_explicit_tier,
    case when v_funcao in ('admin', 'gestor') then v_funcao else null end
  );

  if v_tier is null then
    return false;
  end if;

  if v_tier = 'admin' then
    return true;
  end if;

  return exists (
    select 1
    from gestao_ativos.permissoes_central_nivel pcn
    where pcn.nivel_acesso = v_tier
      and pcn.modulo = p_modulo
      and (
        (p_min_nivel = 'ver' and pcn.permissao in ('ver', 'gerenciar'))
        or (p_min_nivel = 'gerenciar' and pcn.permissao = 'gerenciar')
      )
  ) or exists (
    select 1
    from gestao_ativos.permissoes_central pc
    where pc.funcao = v_tier
      and pc.modulo = p_modulo
      and (
        (p_min_nivel = 'ver' and pc.nivel_acesso in ('ver', 'gerenciar'))
        or (p_min_nivel = 'gerenciar' and pc.nivel_acesso = 'gerenciar')
      )
  );
end;
$$;
