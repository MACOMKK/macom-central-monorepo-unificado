alter table gestao_intranet.documentos
  drop constraint if exists documentos_empresa_check;

drop index if exists gestao_intranet.idx_intranet_documentos_empresa;
drop index if exists gestao_intranet.idx_intranet_documentos_empresa_categoria;

alter table gestao_intranet.documentos
  drop column if exists empresa;

alter table gestao_intranet.documentos
  alter column empresa_id set not null;
