alter table gestao_intranet.documentos
  drop constraint if exists documentos_categoria_check;

alter table gestao_intranet.documentos
  add constraint documentos_categoria_check
  check (categoria in (
    'politica',
    'procedimento',
    'formulario',
    'manual',
    'treinamento',
    'relatorio',
    'vendas',
    'outros'
  ));

notify pgrst, 'reload schema';
