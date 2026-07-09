import { useEffect, useRef, useState } from 'react';
import { supabase } from '@macom/api-client/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

const TOPIC = 'comunicacao-presence';

// Presença online/offline é global (não por sala), diferente do
// `useTypingIndicator`, mas usa o mesmo padrão de canal singleton com
// ref-counting entre instâncias e a mesma lógica de reconexão validada lá:
// o canal pode cair para `CLOSED` (idle timeout no servidor) sem o socket do
// Realtime re-juntar sozinho, então reconectamos manualmente com uma flag
// `reconnecting` (evita reentrância, já que `removeChannel()` invoca esse
// mesmo callback de status com `CLOSED` de forma síncrona) e `room.closing`
// (evita reconectar um canal que já era pra sumir, no unmount).
const room = { channel: null, refCount: 0, listeners: new Set(), onlineIds: new Set(), closing: false };

function attachChannel(userId) {
  const channel = supabase.channel(TOPIC, {
    config: { presence: { key: userId } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    room.onlineIds = new Set(Object.keys(state));
    room.listeners.forEach((listener) => listener(room.onlineIds));
  });

  let reconnecting = false;
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId });
      return;
    }

    const brokenStatus = status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
    if (!brokenStatus || room.closing || reconnecting) return;

    reconnecting = true;
    setTimeout(() => {
      supabase.removeChannel(channel).finally(() => {
        if (room.closing) return;
        attachChannel(userId);
      });
    }, 500);
  });

  room.channel = channel;
}

export function usePresence() {
  const { user } = useAuth();
  const [onlineIds, setOnlineIds] = useState(room.onlineIds);
  const attachedRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return undefined;

    if (room.refCount === 0) {
      room.closing = false;
      attachChannel(user.id);
    }
    room.refCount += 1;
    room.listeners.add(setOnlineIds);
    attachedRef.current = true;
    setOnlineIds(room.onlineIds);

    return () => {
      room.listeners.delete(setOnlineIds);
      room.refCount -= 1;
      if (room.refCount <= 0) {
        room.closing = true;
        supabase.removeChannel(room.channel);
      }
    };
  }, [user?.id]);

  return { onlineIds };
}
