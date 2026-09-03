-- Habilita Realtime em gestao_servicos.solicitacoes_pagamento pra empurrar atualizacao ao vivo
-- nas telas de Aprovacoes e Contas a Pagar (apps/servicos) -- mesmo padrao ja usado em
-- gestao_servicos.notificacoes (20260812100000_add_gestao_servicos_notificacoes.sql). O client
-- usa o evento so como gatilho pra invalidateQueries, nunca le o payload -- autorizacao continua
-- 100% na Edge Function/RLS existentes.
alter table gestao_servicos.solicitacoes_pagamento replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'gestao_servicos'
      and tablename = 'solicitacoes_pagamento'
  ) then
    alter publication supabase_realtime add table gestao_servicos.solicitacoes_pagamento;
  end if;
end
$$;
