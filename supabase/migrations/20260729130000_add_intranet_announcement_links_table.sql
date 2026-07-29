create table if not exists gestao_intranet.avisos_links (
  id uuid primary key default gen_random_uuid(),
  aviso_id uuid not null references gestao_intranet.avisos(id) on delete cascade,
  url text not null,
  rotulo text,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create index if not exists avisos_links_aviso_id_idx on gestao_intranet.avisos_links (aviso_id);

insert into gestao_intranet.avisos_links (aviso_id, url, rotulo, ordem)
select id, link_url, coalesce(link_rotulo, 'Saiba mais'), 0
from gestao_intranet.avisos
where link_url is not null and link_url <> '';

alter table gestao_intranet.avisos
  drop column if exists link_url,
  drop column if exists link_rotulo;
