import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';
import { CANAIS_QUERY_KEY } from './useCanais';
import { mensagensQueryKey } from './useMensagens';

function upsertMensagem(rows, nextItem) {
  if (!Array.isArray(rows)) return rows;
  const exists = rows.some((item) => item.id === nextItem.id);
  if (exists) {
    return rows.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item));
  }
  return [...rows, nextItem];
}

export function useComunicacaoRealtime(enabled = true) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(enabled ? 'connecting' : 'disabled');

  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return undefined;
    }

    if (!isSupabaseConfigured || !supabase) {
      setStatus('unavailable');
      return undefined;
    }

    setStatus('connecting');

    const channel = supabase.channel('comunicacao-realtime');

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'mensagens' },
      (payload) => {
        const eventType = payload.eventType;
        const nextItem = payload.new || payload.old || null;
        if (!nextItem?.canal_id) return;

        const queryKey = mensagensQueryKey(nextItem.canal_id);

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          queryClient.setQueriesData({ queryKey }, (current) => upsertMensagem(current, nextItem));
        }
      },
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'gestao_comunicacao', table: 'canais' },
      () => {
        queryClient.invalidateQueries({ queryKey: CANAIS_QUERY_KEY });
      },
    );

    channel.subscribe((nextStatus) => {
      if (nextStatus === 'SUBSCRIBED') {
        setStatus('active');
        return;
      }
      if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT') {
        setStatus('error');
        return;
      }
      if (nextStatus === 'CLOSED') {
        setStatus('disabled');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return { status };
}
