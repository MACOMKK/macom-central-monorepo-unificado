import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useConversas } from '@/hooks/useConversas';
import { useMensagensDiretas } from '@/hooks/useMensagensDiretas';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import DirectMessageHeader from '@/components/chat/DirectMessageHeader';
import MessageList from '@/components/chat/MessageList';
import MessageComposer from '@/components/chat/MessageComposer';

export default function DirectMessage() {
  const { conversaId } = useParams();
  const { user } = useAuth();
  const { conversas, isLoading: isLoadingConversas } = useConversas();
  const conversa = conversas.find((item) => item.id === conversaId) || null;
  const [replyingTo, setReplyingTo] = useState(null);

  const {
    mensagens,
    isLoading: isLoadingMensagens,
    createMensagem,
    updateMensagem,
    removeMensagem,
    toggleReacao,
  } = useMensagensDiretas(conversaId);
  const { typingUsers } = useTypingIndicator({ conversaId });

  useEffect(() => {
    const outro = conversa?.outros_participantes?.[0];
    document.title = outro ? `${outro.nome} · Comunicação MACOM` : 'Comunicação MACOM';
  }, [conversa]);

  if (!conversa) {
    if (!isLoadingConversas) {
      return (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Conversa não encontrada.
        </div>
      );
    }
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando conversa...</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DirectMessageHeader conversa={conversa} />
      {isLoadingMensagens ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando mensagens...</div>
      ) : (
        <MessageList
          mensagens={mensagens}
          currentUserId={user?.id}
          onUpdate={(id, conteudo) => updateMensagem({ id, conteudo })}
          onDelete={(id) => removeMensagem(id)}
          onReply={setReplyingTo}
          onToggleReacao={(mensagem, emoji) => toggleReacao({ mensagemDiretaId: mensagem.id, emoji })}
        />
      )}
      {typingUsers.length > 0 ? (
        <p className="px-4 py-1 text-xs italic text-muted-foreground">
          {typingUsers.map((u) => u.nome).join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
        </p>
      ) : null}
      <MessageComposer
        conversaId={conversaId}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onSend={(payload) => {
          setReplyingTo(null);
          return createMensagem({ ...payload, respostaAId: replyingTo?.id });
        }}
      />
    </div>
  );
}
