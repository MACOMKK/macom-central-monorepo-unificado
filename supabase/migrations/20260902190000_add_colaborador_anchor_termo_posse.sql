-- 2a via da assinatura digital do Termo de Posse (colaborador). Guarda onde, no PDF, a assinatura
-- do colaborador deve ser carimbada -- espelho, do lado esquerdo, do anchor da empresa ja calculado
-- em generateTermoPDF (apps/central/src/pages/TermsPossession.jsx). Precisa ser persistido no
-- momento em que a empresa assina (nao da pra recalcular depois sem re-rodar o jsPDF, ja que a
-- posicao Y depende da quantidade de equipamentos do termo).

alter table gestao_ativos.termos_posse
  add column if not exists colaborador_anchor jsonb;
