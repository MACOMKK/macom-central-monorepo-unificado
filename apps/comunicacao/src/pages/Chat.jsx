import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useCanais } from '@/hooks/useCanais';
import { useMensagens } from '@/hooks/useMensagens';
import ChannelHeader from '@/components/chat/ChannelHeader';
import MessageList from '@/components/chat/MessageList';
import MessageComposer from '@/components/chat/MessageComposer';

export default function Chat() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data: canais = [], isLoading: isLoadingCanais } = useCanais();
  const canal = canais.find((item) => item.slug === slug) || null;

  const {
    mensagens,
    isLoading: isLoadingMensagens,
    createMensagem,
    updateMensagem,
    removeMensagem,
  } = useMensagens(canal?.id);

  useEffect(() => {
    document.title = canal ? `${canal.nome} · Comunicação MACOM` : 'Comunicação MACOM';
  }, [canal]);

  if (!isLoadingCanais && canais.length > 0 && !canal) {
    return <Navigate to={`/canais/${canais[0].slug}`} replace />;
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
        />
      )}
      <MessageComposer canalId={canal.id} onSend={(payload) => createMensagem(payload)} />
    </div>
  );
}
