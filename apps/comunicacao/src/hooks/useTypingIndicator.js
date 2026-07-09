import { useEffect, useRef, useState } from 'react';
import { supabase } from '@macom/api-client/supabaseClient';
import { useAuth } from '@/lib/AuthContext';

// `supabase.channel(topic)` reaproveita a mesma instância quando já existe um
// canal com o mesmo tópico (dedupe por nome dentro do RealtimeClient). Como o
// composer e a página consomem o mesmo `roomKey`, não dá para cada um chamar
// `.on()`/`.subscribe()` por conta própria — o segundo a rodar recebe o canal
// já inscrito e `.on('presence', ...)` lança erro. Por isso o canal e o
// listener de presence são geridos uma única vez por sala aqui, com
// ref-counting entre as instâncias do hook.
const rooms = new Map();

// Na prática o canal de presence fecha (`status === 'CLOSED'`) em algum
// momento — ex.: idle timeout do lado do servidor — e o socket do Realtime
// NÃO re-junta esse canal sozinho (o auto-reconnect dele é só a nível de
// conexão websocket). Sem reconectar manualmente aqui, o canal fica parado em
// `closed` para sempre e `track()`/`untrack()` viram no-op silencioso. Por
// isso reconectamos no `CLOSED`/`CHANNEL_ERROR`/`TIMED_OUT`, mas com dois
// cuidados para não repetir bugs anteriores: (1) a flag `reconnecting` evita
// reentrância, porque `supabase.removeChannel()` chama `unsubscribe()`, que
// invoca esse mesmo callback de status com `CLOSED` de forma síncrona, antes
// da própria promise resolver; (2) `room.closing` é setado pelo cleanup do
// hook antes de remover o canal de propósito (unmount/troca de sala), para
// não tentar reconectar um canal que já era para sumir.
function attachChannel(roomKey, userId, room) {
  const topic = `comunicacao-typing-${roomKey}`;
  const channel = supabase.channel(topic, {
    config: { presence: { key: userId } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    room.typingUsers = Object.entries(state)
      .filter(([key]) => key !== userId)
      .flatMap(([, metas]) => metas.map((meta) => ({ id: meta.user_id, nome: meta.nome })));
    room.listeners.forEach((listener) => listener(room.typingUsers));
  });

  let reconnecting = false;
  channel.subscribe((status) => {
    const brokenStatus = status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT';
    if (!brokenStatus || room.closing || reconnecting) return;

    reconnecting = true;
    setTimeout(() => {
      supabase.removeChannel(channel).finally(() => {
        if (room.closing) return;
        attachChannel(roomKey, userId, room);
      });
    }, 500);
  });

  room.channel = channel;
}

function getOrCreateRoom(roomKey, userId) {
  let room = rooms.get(roomKey);
  if (room) return room;

  room = { channel: null, refCount: 0, listeners: new Set(), typingUsers: [], closing: false };
  attachChannel(roomKey, userId, room);
  rooms.set(roomKey, room);
  return room;
}

export function useTypingIndicator({ canalId, conversaId }) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState([]);
  const roomRef = useRef(null);

  const roomKey = canalId ? `canal-${canalId}` : conversaId ? `dm-${conversaId}` : null;

  useEffect(() => {
    if (!roomKey || !user?.id) {
      setTypingUsers([]);
      return undefined;
    }

    const room = getOrCreateRoom(roomKey, user.id);
    room.refCount += 1;
    room.listeners.add(setTypingUsers);
    roomRef.current = room;
    setTypingUsers(room.typingUsers);

    return () => {
      room.listeners.delete(setTypingUsers);
      room.refCount -= 1;
      if (room.refCount <= 0) {
        room.closing = true;
        rooms.delete(roomKey);
        supabase.removeChannel(room.channel);
      }
      roomRef.current = null;
      setTypingUsers([]);
    };
  }, [roomKey, user?.id]);

  const notifyTyping = () => {
    roomRef.current?.channel.track({ user_id: user?.id, nome: user?.nome });
  };

  const stopTyping = () => {
    roomRef.current?.channel.untrack();
  };

  return { typingUsers, notifyTyping, stopTyping };
}
