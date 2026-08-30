-- Suprimento de caixa (tipo_beneficiario = 'colaborador') pode dispensar aprovador: quando
-- ativo, o financeiro (label de UI "Gerente" -- ver modulosPermissao.js) aprova e paga direto,
-- sem precisar de um aprovador_destino_id designado. Configuravel via
-- gestao_servicos.configuracoes_modulo.suprimento_caixa_sem_aprovador (mesma linha/tabela do
-- flag de visibilidade em dinheiro, default false, fail-safe false se a linha nao existir).
-- Nao muda a maquina de estados (pendente -> aprovado -> pago continua igual) -- o papel
-- financeiro ja tem despacho total sobre qualquer solicitacao pendente/aprovada independente de
-- aprovador_destino_id (set_status, index.ts), entao so a exigencia de escolher aprovador na
-- criacao/edicao precisa ser relaxada.
alter table gestao_servicos.configuracoes_modulo
  add column if not exists suprimento_caixa_sem_aprovador boolean not null default false;
