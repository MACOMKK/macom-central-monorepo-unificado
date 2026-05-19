alter table gestao_intranet.links_uteis
  add column if not exists mostrar_na_dashboard boolean not null default false,
  add column if not exists ordem_dashboard integer not null default 0;
