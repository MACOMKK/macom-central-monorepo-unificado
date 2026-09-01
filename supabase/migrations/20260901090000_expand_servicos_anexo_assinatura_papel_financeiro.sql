-- Amplia gestao_servicos.assinaturas_anexo.papel para aceitar 'financeiro': o PDF unico
-- (categoria pdf_unificado) agora persiste o carimbo de assinatura ao ser gerado
-- (servicos-api, acao registrar_anexo com `assinatura`), e pode ser gerado por quem tem
-- isPagador (financeiro/contas_a_pagar) -- nao so solicitante/aprovador, unicos papeis
-- previstos quando a tabela foi criada em 20260831130000_add_servicos_anexo_assinatura.sql
-- (assinar_anexo, que so assina anexos individuais e so permite esses dois).

alter table gestao_servicos.assinaturas_anexo
  drop constraint if exists assinaturas_anexo_papel_check;

alter table gestao_servicos.assinaturas_anexo
  add constraint assinaturas_anexo_papel_check
  check (papel in ('solicitante', 'aprovador', 'financeiro'));

notify pgrst, 'reload schema';
