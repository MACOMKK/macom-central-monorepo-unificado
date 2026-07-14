create table if not exists gestao_intranet.avisos_documentos (
  aviso_id uuid not null references gestao_intranet.avisos(id) on delete cascade,
  documento_id uuid not null references gestao_intranet.documentos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (aviso_id, documento_id)
);

create index if not exists idx_intranet_avisos_documentos_documento_id
  on gestao_intranet.avisos_documentos (documento_id);

insert into gestao_intranet.avisos_documentos (aviso_id, documento_id)
select id, documento_id from gestao_intranet.avisos where documento_id is not null
on conflict do nothing;

alter table gestao_intranet.avisos drop column if exists documento_id;

notify pgrst, 'reload schema';
