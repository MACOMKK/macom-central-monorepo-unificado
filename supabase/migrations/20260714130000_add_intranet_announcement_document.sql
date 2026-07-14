alter table gestao_intranet.avisos
  add column if not exists documento_id uuid references gestao_intranet.documentos(id) on delete set null;

create index if not exists idx_intranet_avisos_documento_id
  on gestao_intranet.avisos (documento_id);

notify pgrst, 'reload schema';
