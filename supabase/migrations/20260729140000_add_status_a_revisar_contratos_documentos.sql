alter table gestao_ativos.contratos_documentos
  drop constraint if exists contratos_documentos_status_check;

alter table gestao_ativos.contratos_documentos
  add constraint contratos_documentos_status_check
  check (status in ('ativo', 'vencendo', 'vencido', 'encerrado', 'a_revisar'));
