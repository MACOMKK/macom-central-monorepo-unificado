import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCanais } from '@/hooks/useCanais';
import { useMensagens } from '@/hooks/useMensagens';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMarcarLida } from '@/hooks/useMarcarLida';
import ChannelHeader from '@/components/chat/ChannelHeader';
import MessageList from '@/components/chat/MessageList';
import MessageComposer from '@/components/chat/MessageComposer';

export default function Chat() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: canais = [], isLoading: isLoadingCanais } = useCanais();
  const meusCanais = canais.filter((item) => item.membro);
  const canal = meusCanais.find((item) => item.slug === slug) || null;
  const [replyingTo, setReplyingTo] = useState(null);

  const {
    mensagens,
    isLoading: isLoadingMensagens,
    createMensagem,
    updateMensagem,
    removeMensagem,
    toggleReacao,
  } = useMensagens(canal?.id);
  const { typingUsers } = useTypingIndicator({ canalId: canal?.id });
  const { marcarCanalLido } = useMarcarLida();

  useEffect(() => {
    document.title = canal ? `${canal.nome} · Comunicação MACOM` : 'Comunicação MACOM';
  }, [canal]);

  useEffect(() => {
    if (canal?.id) marcarCanalLido(canal.id);
  }, [canal?.id, mensagens.length]);

  if (!isLoadingCanais && meusCanais.length > 0 && !canal) {
    return <Navigate to={`/canais/${meusCanais[0].slug}`} replace />;
  }

  if (!isLoadingCanais && meusCanais.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Você ainda não participa de nenhum canal. Entre em um pela barra lateral.
      </div>
    );
  }

  if (!canal) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando canal...</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChannelHeader canal={canal} />
      {isLoadingMensagens ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Carregando mensagens...</div>
      ) : (
        <MessageList
          mensagens={mensagens}
          currentUserId={user?.id}
          onUpdate={(id, conteudo) => updateMensagem({ id, conteudo })}
          onDelete={(id) => removeMensagem(id)}
          onReply={setReplyingTo}
          onToggleReacao={(mensagem, emoji) => toggleReacao({ mensagemId: mensagem.id, emoji })}
        />
      )}
      {typingUsers.length > 0 ? (
        <p className="px-4 py-1 text-xs italic text-muted-foreground">
          {typingUsers.map((u) => u.nome).join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
        </p>
      ) : null}
      <MessageComposer
        canalId={canal.id}
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
