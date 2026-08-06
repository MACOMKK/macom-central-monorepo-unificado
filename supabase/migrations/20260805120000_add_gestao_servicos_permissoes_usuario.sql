-- Camada 2 de permissão por módulo dentro do sistema Servicos.
-- Camada 1 (public.acessos_usuario_sistema) segue valendo pra "tem acesso ao sistema?";
-- esta tabela responde "qual papel tem em cada módulo?" (hoje só existe o módulo 'financeiro').

create table if not exists gestao_servicos.permissoes_usuario (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null unique references public.colaboradores(id) on delete cascade,
  mod_financeiro text not null default 'usuario'
    check (mod_financeiro in ('nenhum', 'usuario', 'gestor', 'admin')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.colaboradores(id) on delete set null
);

drop trigger if exists trg_servicos_permissoes_set_updated_at on gestao_servicos.permissoes_usuario;
create trigger trg_servicos_permissoes_set_updated_at
before update on gestao_servicos.permissoes_usuario
for each row
execute function public.set_updated_at();

-- Role efetiva de um colaborador em um módulo do Servicos:
-- admin de Camada 1 bypassa tudo; sem Camada 1, sem papel; senão usa a Camada 2
-- (default 'usuario' se ainda não foi provisionado, pra não quebrar quem já tinha acesso).
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
      (select case p_modulo
         when 'financeiro' then pu.mod_financeiro
       end
       from gestao_servicos.permissoes_usuario pu
       where pu.colaborador_id = public.current_colaborador_id()),
      'usuario'
    )
  end;
$$;

-- As versões antigas eram 0-arg; dropar antes de recriar com parâmetro default evita
-- ambiguidade de overload nas chamadas sem argumento (a select e a update_aprovador de
-- solicitacoes_pagamento dependem de servicos_is_aprovador() por OID, então o cascade
-- também derruba essas duas policies — recriadas logo abaixo, idênticas ao original).
drop function if exists public.servicos_is_aprovador() cascade;
drop function if exists public.servicos_is_financeiro() cascade;

create or replace function public.servicos_is_aprovador(p_modulo text default 'financeiro')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.servicos_module_role(p_modulo) in ('admin', 'gestor'), false);
$$;

create or replace function public.servicos_is_financeiro(p_modulo text default 'financeiro')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.servicos_module_role(p_modulo) = 'admin';
$$;

drop policy if exists "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_select" on gestao_servicos.solicitacoes_pagamento
for select to authenticated
using (
  public.servicos_is_aprovador()
  or (public.servicos_has_access() and solicitante_id = public.current_colaborador_id())
);

drop policy if exists "servicos_solicitacoes_update_aprovador" on gestao_servicos.solicitacoes_pagamento;
create policy "servicos_solicitacoes_update_aprovador" on gestao_servicos.solicitacoes_pagamento
for update to authenticated
using (public.servicos_is_aprovador())
with check (public.servicos_is_aprovador());

-- Auto-provisiona a linha de Camada 2 (default 'usuario') quando alguém ganha acesso
-- de Camada 1 ao sistema Servicos, pra ninguém ficar sem papel definido.
create or replace function public.auto_create_servicos_permissoes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ativo and new.sistema_id = (select id from public.sistemas where slug = 'servicos') then
    insert into gestao_servicos.permissoes_usuario (colaborador_id)
    values (new.colaborador_id)
    on conflict (colaborador_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_create_servicos_permissoes on public.acessos_usuario_sistema;
create trigger trg_auto_create_servicos_permissoes
after insert or update on public.acessos_usuario_sistema
for each row
execute function public.auto_create_servicos_permissoes();

-- Provisiona quem já tem acesso ativo ao Servicos hoje, retroativamente.
insert into gestao_servicos.permissoes_usuario (colaborador_id)
select aus.colaborador_id
from public.acessos_usuario_sistema aus
join public.sistemas s on s.id = aus.sistema_id
where s.slug = 'servicos' and aus.ativo = true
on conflict (colaborador_id) do nothing;

alter table gestao_servicos.permissoes_usuario enable row level security;

drop policy if exists "servicos_permissoes_select" on gestao_servicos.permissoes_usuario;
create policy "servicos_permissoes_select" on gestao_servicos.permissoes_usuario
for select to authenticated
using (public.servicos_access_level() = 'admin');

drop policy if exists "servicos_permissoes_insert" on gestao_servicos.permissoes_usuario;
create policy "servicos_permissoes_insert" on gestao_servicos.permissoes_usuario
for insert to authenticated
with check (public.servicos_access_level() = 'admin');

drop policy if exists "servicos_permissoes_update" on gestao_servicos.permissoes_usuario;
create policy "servicos_permissoes_update" on gestao_servicos.permissoes_usuario
for update to authenticated
using (public.servicos_access_level() = 'admin')
with check (public.servicos_access_level() = 'admin');

grant select, insert, update, delete on gestao_servicos.permissoes_usuario to authenticated, service_role;
