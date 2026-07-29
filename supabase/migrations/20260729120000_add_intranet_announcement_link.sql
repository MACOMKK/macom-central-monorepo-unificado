alter table gestao_intranet.avisos
  add column if not exists link_url text,
  add column if not exists link_rotulo text;
