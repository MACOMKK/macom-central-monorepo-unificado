alter table public.colaboradores
  add column if not exists precisa_trocar_senha boolean not null default false;
