import { useEffect, useRef } from 'react';
import { ScrollArea } from '@macom/ui';
import MessageBubble from './MessageBubble';

export default function MessageList({ mensagens, currentUserId, onUpdate, onDelete }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [mensagens.length]);

  return (
    <ScrollArea className="flex-1 px-2 py-3">
      <div className="flex flex-col gap-0.5">
        {mensagens.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nenhuma mensagem por aqui ainda. Seja o primeiro a escrever!
          </p>
        ) : (
          mensagens.map((mensagem) => (
            <MessageBubble
              key={mensagem.id}
              mensagem={mensagem}
              isOwn={mensagem.autor_id === currentUserId}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
