alter table if exists public.unidades
  add column if not exists cnpj text;
