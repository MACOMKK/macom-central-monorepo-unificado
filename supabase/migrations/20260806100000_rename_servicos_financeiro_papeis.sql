-- Renomeia os papeis do modulo Financeiro (Camada 2) pra nomes especificos do dominio,
-- em vez de termos genericos emprestados da Camada 1 (nivel_acesso do sistema, que tambem
-- usa 'admin'/'gestor'/'usuario'): gestor -> aprovador, admin -> financeiro. 'usuario' e
-- 'nenhum' ficam iguais. Tambem corrige a inconsistencia que ja existia entre os nomes das
-- funcoes SQL (servicos_is_aprovador/servicos_is_financeiro) e os valores gravados no banco
-- (gestor/admin) — as funcoes ja tinham esses nomes, so os valores nao batiam.

alter table gestao_servicos.permissoes_modulo
  drop constraint if exists permissoes_modulo_papel_check;

update gestao_servicos.permissoes_modulo set papel = 'aprovador' where papel = 'gestor';
update gestao_servicos.permissoes_modulo set papel = 'financeiro' where papel = 'admin';

alter table gestao_servicos.permissoes_modulo
  add constraint permissoes_modulo_papel_check
  check (papel in ('nenhum', 'usuario', 'aprovador', 'financeiro'));

create or replace function public.servicos_module_role(p_modulo text default 'financeiro')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.servicos_access_level() = 'admin' then 'financeiro'
    when public.servicos_access_level() is null then null
    else coalesce(
      (select pm.papel
       from gestao_servicos.permissoes_modulo pm
       where pm.colaborador_id = public.current_colaborador_id()
         and pm.modulo = p_modulo),
      'usuario'
    )
  end;
$$;

create or replace function public.servicos_is_aprovador(p_modulo text default 'financeiro')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.servicos_module_role(p_modulo) in ('financeiro', 'aprovador'), false);
$$;

create or replace function public.servicos_is_financeiro(p_modulo text default 'financeiro')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.servicos_module_role(p_modulo) = 'financeiro';
$$;
