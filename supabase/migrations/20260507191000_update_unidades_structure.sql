alter table if exists public.unidades
  add column if not exists endereco text,
  add column if not exists telefone text,
  add column if not exists responsavel text;

alter table if exists public.unidades
  drop column if exists estado;
