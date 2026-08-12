import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, UserCheck, CheckCheck } from 'lucide-react';
import { atendimentoApi } from '@/api/atendimentoApi';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/use-toast';
import ConversaListItem from '@/components/atendimento/ConversaListItem';
import MensagemBubble from '@/components/atendimento/MensagemBubble';
import MensagemComposer from '@/components/atendimento/MensagemComposer';

export default function Atendimento() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [conversaId, setConversaId] = useState(null);
  const bottomRef = useRef(null);

  const { data: conversas = [], isLoading: isLoadingConversas } = useQuery({
    queryKey: ['conversas-atendimento'],
    queryFn: () => atendimentoApi.listConversas(),
  });

  const conversaAtiva = conversas.find((item) => item.id === conversaId) || null;

  const { data: mensagens = [], isLoading: isLoadingMensagens } = useQuery({
    queryKey: ['mensagens-atendimento', conversaId],
    queryFn: () => atendimentoApi.listMensagens(conversaId),
    enabled: Boolean(conversaId),
  });

  useEffect(() => {
    if (!conversaId && conversas.length > 0) {
      setConversaId(conversas[0].id);
    }
  }, [conversaId, conversas]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [mensagens.length]);

  const enviarMutation = useMutation({
    mutationFn: (texto) => atendimentoApi.enviarMensagemManual({ conversaId, colaboradorId: user?.id, texto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens-atendimento', conversaId] });
      queryClient.invalidateQueries({ queryKey: ['conversas-atendimento'] });
    },
    onError: (error) => {
      toast({ title: 'Erro ao enviar mensagem', description: error?.message, variant: 'destructive' });
    },
  });

  const assumirMutation = useMutation({
    mutationFn: () => atendimentoApi.assumirConversa(conversaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-atendimento'] });
      toast({ title: 'Conversa assumida', description: 'A resposta automática da IA foi pausada.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao assumir conversa', description: error?.message, variant: 'destructive' });
    },
  });

  const encerrarMutation = useMutation({
    mutationFn: () => atendimentoApi.encerrarConversa(conversaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversas-atendimento'] });
      toast({ title: 'Conversa encerrada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao encerrar conversa', description: error?.message, variant: 'destructive' });
    },
  });

  return (
    <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-[1400px] px-4 md:px-6">
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-xl font-black uppercase tracking-widest">Atendimento</h1>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp + IA</p>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {isLoadingConversas ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Carregando conversas...</p>
          ) : conversas.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          ) : (
            conversas.map((conversa) => (
              <ConversaListItem
                key={conversa.id}
                conversa={conversa}
                isActive={conversa.id === conversaId}
                onClick={() => setConversaId(conversa.id)}
              />
            ))
          )}
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!conversaAtiva ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageCircle className="h-8 w-8" />
            <p className="text-sm">Selecione uma conversa para visualizar</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide">
                  {conversaAtiva.cliente_nome || conversaAtiva.telefone_normalizado}
                </p>
                <p className="text-xs text-muted-foreground">{conversaAtiva.telefone_normalizado}</p>
              </div>
              <div className="flex gap-2">
                {conversaAtiva.status !== 'aguardando_humano' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    onClick={() => assumirMutation.mutate()}
                    disabled={assumirMutation.isPending || conversaAtiva.status === 'encerrada'}
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                    Assumir
                  </Button>
                ) : null}
                {conversaAtiva.status !== 'encerrada' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    onClick={() => encerrarMutation.mutate()}
                    disabled={encerrarMutation.isPending}
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" />
                    Encerrar
                  </Button>
                ) : null}
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 px-4 py-3">
              <div className="flex flex-col gap-3">
                {isLoadingMensagens ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Carregando mensagens...</p>
                ) : mensagens.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma mensagem nesta conversa ainda.</p>
                ) : (
                  mensagens.map((mensagem) => <MensagemBubble key={mensagem.id} mensagem={mensagem} />)
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <MensagemComposer
              onSend={(texto) => enviarMutation.mutateAsync(texto)}
              disabled={conversaAtiva.status === 'encerrada'}
            />
          </>
        )}
      </div>
    </div>
  );
}
