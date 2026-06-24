import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';

const TABLE_QUERY_KEYS = {
  leads: [['leads'], ['clientes'], ['historico-atendimento']],
  clientes: [['clientes'], ['leads']],
  atendimentos: [['eventos'], ['leads'], ['clientes'], ['historico-atendimento']],
  historico_atendimentos: [['historico-atendimento'], ['clientes']],
  configuracoes_distribuicao: [['crm-distribuicao']],
  vendedores_distribuicao: [['crm-distribuicao'], ['crm-responsaveis']],
};

function uniqueKeys(keys) {
  const seen = new Set();
  return keys.filter((key) => {
    const serialized = JSON.stringify(key);
    if (seen.has(serialized)) return false;
    seen.add(serialized);
    return true;
  });
}

export function useCrmRealtime(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return undefined;

    const invalidateForTable = (table) => {
      const keys = uniqueKeys(TABLE_QUERY_KEYS[table] || []);
      keys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    };

    const channel = supabase.channel('crm-realtime');

    Object.keys(TABLE_QUERY_KEYS).forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'gestao_crm', table },
        () => invalidateForTable(table),
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
