alter table public.contatos
  add column if not exists identificador text,
  add column if not exists nome_contato text;
