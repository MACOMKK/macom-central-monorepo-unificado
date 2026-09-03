-- Hoje uma parcela pendente so pode ser paga ou a solicitacao inteira cancelada
-- (cancelar_solicitacao) -- nao existe meio termo pra "essa parcela especifica nao sera mais
-- paga" (ex. solicitacao de R$2000 dividida em 2x, primeira paga, segunda nao sera mais quitada
-- por renegociacao). Adiciona o status 'cancelado' as parcelas, usado pela nova action
-- cancelar_parcela (servicos-api), restrita a quem ja podia pagar parcela (isPagador) e so
-- permitida para parcela ainda 'pendente'.
alter table gestao_servicos.parcelas_pagamento
  drop constraint if exists parcelas_pagamento_status_check;

alter table gestao_servicos.parcelas_pagamento
  add constraint parcelas_pagamento_status_check
  check (status in ('pendente', 'pago', 'cancelado'));

-- O trigger de rollup (20260805150000) so fechava a solicitacao como 'pago' quando a ULTIMA
-- parcela pendente virava 'pago'. Com o status 'cancelado' isso quebra: se a ultima parcela em
-- aberto for cancelada (nao paga), a solicitacao nunca fecha, mesmo sem nada mais pendente.
-- Passa a considerar 'pago' e 'cancelado' como terminais: fecha a solicitacao quando nao sobra
-- nenhuma parcela 'pendente' E pelo menos uma parcela foi efetivamente paga (senao, cancelar
-- todas as parcelas de uma solicitacao sem nunca pagar nada ficaria fechando ela sozinha --
-- esse caso e' responsabilidade de cancelar_solicitacao, acao explicita e auditada).
create or replace function gestao_servicos.parcelas_pagamento_rollup()
returns trigger
language plpgsql
security definer
set search_path = gestao_servicos
as $$
begin
  if new.status in ('pago', 'cancelado') and not exists (
    select 1
    from gestao_servicos.parcelas_pagamento
    where solicitacao_id = new.solicitacao_id
      and status = 'pendente'
  ) and exists (
    select 1
    from gestao_servicos.parcelas_pagamento
    where solicitacao_id = new.solicitacao_id
      and status = 'pago'
  ) then
    update gestao_servicos.solicitacoes_pagamento
    set status = 'pago', pago_em = now(), pago_por = coalesce(pago_por, new.pago_por)
    where id = new.solicitacao_id
      and status <> 'pago';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_servicos_parcelas_rollup on gestao_servicos.parcelas_pagamento;
create trigger trg_servicos_parcelas_rollup
after update of status on gestao_servicos.parcelas_pagamento
for each row
when (new.status in ('pago', 'cancelado'))
execute function gestao_servicos.parcelas_pagamento_rollup();
