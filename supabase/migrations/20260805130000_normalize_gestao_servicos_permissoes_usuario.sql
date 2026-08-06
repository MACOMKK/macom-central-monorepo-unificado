-- Normaliza a Camada 2 de permissao por modulo do sistema Servicos.
-- A versao anterior (20260805120000) usava uma coluna mod_<modulo> por modulo
-- (mod_financeiro), o que exigiria uma migration nova a cada modulo real que
-- entrasse (Oficina, Estoque, Compras...). Aqui vira uma tabela normalizada
-- (colaborador_id, modulo, papel) — novo modulo = so inserir linhas, sem DDL.

create table if not exists gestao_servicos.permissoes_modulo (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  modulo text not null,
  papel text not null default 'usuario'
    check (papel in ('nenhum', 'usuario', 'gestor', 'admin')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null,
  unique (colaborador_id, modulo)
);

drop trigger if exists trg_servicos_permissoes_modulo_set_updated_at on gestao_servicos.permissoes_modulo;
create trigger trg_servicos_permissoes_modulo_set_updated_at
before update on gestao_servicos.permissoes_modulo
for each row
execute function public.set_updated_at();

-- Migra os dados da tabela antiga (uma linha por colaborador com mod_financeiro)
-- para o novo formato (uma linha por colaborador+modulo).
insert into gestao_servicos.permissoes_modulo (colaborador_id, modulo, papel, criado_em, atualizado_em, criado_por)
select colaborador_id, 'financeiro', mod_financeiro, criado_em, atualizado_em, criado_por
from gestao_servicos.permissoes_usuario
on conflict (colaborador_id, modulo) do nothing;

create or replace function public.servicos_module_role(p_modulo text default 'financeiro')
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.servicos_access_level() = 'admin' then 'admin'
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

create or replace function public.auto_create_servicos_permissoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ativo and new.sistema_id = (select id from public.sistemas where slug = 'servicos') then
    insert into gestao_servicos.permissoes_modulo (colaborador_id, modulo)
    values (new.colaborador_id, 'financeiro')
    on conflict (colaborador_id, modulo) do nothing;
  end if;
  return new;
end;
$$;

alter table gestao_servicos.permissoes_modulo enable row level security;

drop policy if exists "servicos_permissoes_modulo_select" on gestao_servicos.permissoes_modulo;
create policy "servicos_permissoes_modulo_select" on gestao_servicos.permissoes_modulo
for select to authenticated
using (public.servicos_access_level() = 'admin');

drop policy if exists "servicos_permissoes_modulo_insert" on gestao_servicos.permissoes_modulo;
create policy "servicos_permissoes_modulo_insert" on gestao_servicos.permissoes_modulo
for insert to authenticated
with check (public.servicos_access_level() = 'admin');

drop policy if exists "servicos_permissoes_modulo_update" on gestao_servicos.permissoes_modulo;
create policy "servicos_permissoes_modulo_update" on gestao_servicos.permissoes_modulo
for update to authenticated
using (public.servicos_access_level() = 'admin')
with check (public.servicos_access_level() = 'admin');

grant select, insert, update, delete on gestao_servicos.permissoes_modulo to authenticated, service_role;

-- Tabela antiga (mod_financeiro) fica obsoleta — dados ja migrados acima.
drop policy if exists "servicos_permissoes_select" on gestao_servicos.permissoes_usuario;
drop policy if exists "servicos_permissoes_insert" on gestao_servicos.permissoes_usuario;
drop policy if exists "servicos_permissoes_update" on gestao_servicos.permissoes_usuario;
drop table if exists gestao_servicos.permissoes_usuario;
