-- Ate aqui, clientes.status_relacionamento so era promovido para 'cliente' pelo trigger
-- gestao_crm.apply_activity_outcome() (disparado em atendimentos com resultado
-- 'venda_realizada'). Como leads.status tambem pode ser setado para 'convertido'
-- diretamente pela tela de edicao do lead (sem passar por um atendimento), esse
-- caminho deixava o cliente correspondente preso em status_relacionamento = 'lead'
-- mesmo com o lead marcado como convertido. Este trigger cobre esse segundo caminho.

create or replace function gestao_crm.sync_cliente_status_on_lead_convertido()
returns trigger
language plpgsql
security definer
set search_path = gestao_crm, public
as $$
begin
  if new.status = 'convertido' and coalesce(old.status, '') is distinct from 'convertido' then
    update gestao_crm.clientes
    set status_relacionamento = 'cliente'
    where id = new.cliente_id
      and status_relacionamento = 'lead';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_cliente_status_on_lead_convertido on gestao_crm.leads;
create trigger trg_sync_cliente_status_on_lead_convertido
after update of status on gestao_crm.leads
for each row
execute function gestao_crm.sync_cliente_status_on_lead_convertido();

grant execute on function gestao_crm.sync_cliente_status_on_lead_convertido() to authenticated, service_role;

notify pgrst, 'reload schema';
