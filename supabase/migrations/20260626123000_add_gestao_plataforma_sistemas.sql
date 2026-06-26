create schema if not exists gestao_plataforma;

create table if not exists gestao_plataforma.sistemas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists sistemas_plataforma_slug_idx
  on gestao_plataforma.sistemas (slug);

create index if not exists sistemas_plataforma_ativo_idx
  on gestao_plataforma.sistemas (ativo);

drop trigger if exists trg_sistemas_plataforma_set_atualizado_em on gestao_plataforma.sistemas;
create trigger trg_sistemas_plataforma_set_atualizado_em
before update on gestao_plataforma.sistemas
for each row
execute function gestao_ativos.set_atualizado_em();

insert into gestao_plataforma.sistemas (
  id,
  slug,
  nome,
  descricao,
  ativo,
  criado_em,
  atualizado_em
)
select
  id,
  slug,
  nome,
  descricao,
  ativo,
  criado_em,
  atualizado_em
from public.sistemas
on conflict (id) do update
set
  slug = excluded.slug,
  nome = excluded.nome,
  descricao = excluded.descricao,
  ativo = excluded.ativo,
  criado_em = excluded.criado_em,
  atualizado_em = excluded.atualizado_em;

create or replace function gestao_plataforma.sync_sistema_from_public()
returns trigger
language plpgsql
security definer
set search_path = gestao_plataforma, public
as $$
begin
  if tg_op = 'DELETE' then
    delete from gestao_plataforma.sistemas
    where id = old.id;
    return old;
  end if;

  insert into gestao_plataforma.sistemas (
    id,
    slug,
    nome,
    descricao,
    ativo,
    criado_em,
    atualizado_em
  )
  values (
    new.id,
    new.slug,
    new.nome,
    new.descricao,
    new.ativo,
    new.criado_em,
    new.atualizado_em
  )
  on conflict (id) do update
  set
    slug = excluded.slug,
    nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = excluded.ativo,
    criado_em = excluded.criado_em,
    atualizado_em = excluded.atualizado_em;

  return new;
end;
$$;

drop trigger if exists trg_sync_sistema_to_gestao_plataforma on public.sistemas;
create trigger trg_sync_sistema_to_gestao_plataforma
after insert or update or delete on public.sistemas
for each row
execute function gestao_plataforma.sync_sistema_from_public();

alter table gestao_plataforma.sistemas enable row level security;

grant usage on schema gestao_plataforma to authenticated, service_role;
grant select on gestao_plataforma.sistemas to authenticated;
grant select, insert, update, delete on gestao_plataforma.sistemas to service_role;

drop policy if exists "sistemas_plataforma_select_authenticated" on gestao_plataforma.sistemas;
create policy "sistemas_plataforma_select_authenticated"
on gestao_plataforma.sistemas
for select
to authenticated
using (true);

drop policy if exists "sistemas_plataforma_manage_service_role" on gestao_plataforma.sistemas;
create policy "sistemas_plataforma_manage_service_role"
on gestao_plataforma.sistemas
for all
to service_role
using (true)
with check (true);
