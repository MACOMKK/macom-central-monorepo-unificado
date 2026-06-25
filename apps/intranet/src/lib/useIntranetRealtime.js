import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const CALENDAR_QUERY_KEYS = [
  ['events'],
  ['events-upcoming'],
];

const ANNOUNCEMENT_QUERY_KEYS = [
  ['announcements'],
  ['announcements', 'active'],
  ['announcements', 'manage'],
  ['announcements-home'],
  ['comments'],
  ['reactions'],
];

const FEEDBACK_QUERY_KEYS = [
  ['feedbacks'],
];

function invalidateQueryKeys(queryClient, queryKeys) {
  queryKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}

export function useIntranetRealtime({ enabled = true } = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const refreshTimersRef = useRef({});

  useEffect(() => {
    if (!enabled || !user || !supabase) return undefined;

    const scheduleRefresh = (key, queryKeys) => {
      if (refreshTimersRef.current[key]) {
        window.clearTimeout(refreshTimersRef.current[key]);
      }

      refreshTimersRef.current[key] = window.setTimeout(() => {
        invalidateQueryKeys(queryClient, queryKeys);
        refreshTimersRef.current[key] = null;
      }, 250);
    };

    const refreshCalendar = () => scheduleRefresh('calendar', CALENDAR_QUERY_KEYS);
    const refreshAnnouncements = () => scheduleRefresh('announcements', ANNOUNCEMENT_QUERY_KEYS);
    const refreshFeedbacks = () => scheduleRefresh('feedbacks', FEEDBACK_QUERY_KEYS);

    const channel = supabase
      .channel('intranet-realtime:core')
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'gestao_intranet',
          table: 'avisos',
        },
        refreshAnnouncements,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'gestao_intranet',
          table: 'comentarios_avisos',
        },
        refreshAnnouncements,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'gestao_intranet',
          table: 'reacoes_avisos',
        },
        refreshAnnouncements,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'gestao_intranet',
          table: 'feedback',
        },
        refreshFeedbacks,
      )
      .subscribe();

    return () => {
      Object.values(refreshTimersRef.current).forEach((timer) => {
        if (timer) window.clearTimeout(timer);
      });
      refreshTimersRef.current = {};
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, user]);
}
