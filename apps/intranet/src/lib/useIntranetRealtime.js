import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const CALENDAR_QUERY_KEYS = [
  ['events'],
  ['events-upcoming'],
];

export function useIntranetRealtime({ enabled = true } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !user || !supabase) return undefined;

    const refreshCalendar = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        CALENDAR_QUERY_KEYS.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }, 250);
    };

    const channel = supabase
      .channel('intranet-realtime:calendar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'gestao_intranet',
          table: 'eventos_calendario',
        },
        refreshCalendar,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'gestao_intranet',
          table: 'eventos_calendario_participantes',
        },
        refreshCalendar,
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, user]);
}
