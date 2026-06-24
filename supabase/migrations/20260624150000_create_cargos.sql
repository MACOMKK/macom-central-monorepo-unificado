create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  departamento_id uuid references public.departamentos(id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_cargos_nome
  on public.cargos (nome);

create index if not exists idx_cargos_departamento_id
  on public.cargos (departamento_id);

create unique index if not exists cargos_nome_departamento_unique
  on public.cargos (lower(nome), departamento_id)
  where departamento_id is not null;

create unique index if not exists cargos_nome_sem_departamento_unique
  on public.cargos (lower(nome))
  where departamento_id is null;

drop trigger if exists trg_cargos_set_updated_at on public.cargos;
create trigger trg_cargos_set_updated_at
before update on public.cargos
for each row
execute function public.set_updated_at();

insert into public.cargos (nome, departamento_id)
select distinct btrim(c.cargo), c.departamento_id
from public.colaboradores c
where nullif(btrim(c.cargo), '') is not null
on conflict do nothing;

alter table public.colaboradores
  add column if not exists cargo_id uuid references public.cargos(id) on delete set null;

update public.colaboradores c
set cargo_id = cg.id
from public.cargos cg
where c.cargo_id is null
  and nullif(btrim(c.cargo), '') is not null
  and cg.nome = btrim(c.cargo)
  and (
    cg.departamento_id = c.departamento_id
    or (cg.departamento_id is null and c.departamento_id is null)
  );

create index if not exists idx_colaboradores_cargo_id
  on public.colaboradores (cargo_id);

grant select, insert, update, delete on public.cargos to authenticated, service_role;
