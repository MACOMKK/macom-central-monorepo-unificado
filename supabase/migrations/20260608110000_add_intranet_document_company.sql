alter table gestao_intranet.documentos
  add column if not exists empresa text not null default 'macom_motors';

alter table gestao_intranet.documentos
  drop constraint if exists documentos_empresa_check;

alter table gestao_intranet.documentos
  add constraint documentos_empresa_check
  check (empresa in ('macom_motors', 'macom_mitsubishi'));

create index if not exists idx_intranet_documentos_empresa
  on gestao_intranet.documentos (empresa);

create index if not exists idx_intranet_documentos_empresa_categoria
  on gestao_intranet.documentos (empresa, categoria);
