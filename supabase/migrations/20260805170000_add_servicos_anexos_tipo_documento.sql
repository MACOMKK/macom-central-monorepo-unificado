-- Anexos do modulo Financeiro ganham `tipo_documento`, ortogonal a `categoria`.
-- `categoria` indica o slot/etapa do fluxo (comprovante da solicitacao, NF/boleto,
-- RH, comprovante de pagamento); `tipo_documento` indica o que o arquivo de fato e
-- (orcamento, nota fiscal, boleto, recibo, comprovante pix, outros), permitindo
-- filtrar/auditar por tipo real do documento independente de onde ele foi anexado.

alter table gestao_servicos.anexos_solicitacao
  add column if not exists tipo_documento text not null default 'outros'
    check (tipo_documento in ('orcamento', 'nota_fiscal', 'boleto', 'recibo', 'comprovante_pix', 'outros'));

alter table gestao_servicos.anexos_solicitacao
  alter column tipo_documento drop default;

notify pgrst, 'reload schema';
