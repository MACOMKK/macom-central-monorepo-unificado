import { useEffect, useRef } from 'react';
import { ScrollArea } from '@macom/ui';
import MessageBubble from './MessageBubble';

export default function MessageList({ mensagens, currentUserId, isAdmin, onUpdate, onDelete, onReply, onToggleReacao, onRemoveFailed }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [mensagens.length]);

  return (
    <ScrollArea className="min-h-0 flex-1 px-2 py-3">
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
              isAdmin={isAdmin}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReply={onReply}
              onToggleReacao={(emoji) => onToggleReacao(mensagem, emoji)}
              onRemoveFailed={onRemoveFailed}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
