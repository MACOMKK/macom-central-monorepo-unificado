import React, { useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input } from '@macom/ui';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const EMOJIS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F62E}', '\u{1F602}', '\u{1F44F}'];

export default function AnnouncementInteractions({ announcementId, currentUserId }) {
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  const { data: reactions = [] } = useQuery({
    queryKey: ['reactions', announcementId],
    queryFn: () => appClient.entities.AnnouncementReaction.filter({ announcement_id: announcementId }),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', announcementId],
    queryFn: () => appClient.entities.AnnouncementComment.filter({ announcement_id: announcementId }),
    enabled: showComments,
  });

  const reactMutation = useMutation({
    mutationFn: async (emoji) => {
      const existing = reactions.find((reaction) => (
        reaction.emoji === emoji && reaction.created_by_id === currentUserId
      ));

      if (existing) {
        return appClient.entities.AnnouncementReaction.delete(existing.id);
      }

      return appClient.entities.AnnouncementReaction.create({ announcement_id: announcementId, emoji });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', announcementId] });
    },
    onError: (error) => {
      toast.error(error.message || 'Nao foi possivel registrar a reacao.');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content) => appClient.entities.AnnouncementComment.create({ announcement_id: announcementId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', announcementId] });
      setCommentText('');
      setSending(false);
    },
    onError: (error) => {
      setSending(false);
      toast.error(error.message || 'Nao foi possivel enviar o comentario.');
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    setSending(true);
    commentMutation.mutate(commentText.trim());
  };

  const reactionGroups = EMOJIS.map((emoji) => {
    const group = reactions.filter((reaction) => reaction.emoji === emoji);
    const reacted = group.some((reaction) => reaction.created_by_id === currentUserId);
    return { emoji, count: group.length, reacted };
  });

  const totalComments = comments.length;

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {reactionGroups.map(({ emoji, count, reacted }) => (
          <button
            key={emoji}
            type="button"
            onClick={() => reactMutation.mutate(emoji)}
            disabled={reactMutation.isPending}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all ${
              reacted
                ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                : 'bg-muted/50 border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
            } ${reactMutation.isPending ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-full border border-transparent bg-muted/50 px-3 py-2 text-xs text-muted-foreground transition-all hover:bg-muted hover:text-foreground sm:ml-auto sm:mt-0 sm:w-auto"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{totalComments > 0 ? totalComments : ''} Comentarios</span>
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum comentario ainda. Seja o primeiro!</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {(comment.created_by || '?').charAt(0).toUpperCase()}
              </div>
              <div className="bg-muted/50 rounded-lg px-3 py-2 flex-1 min-w-0">
                <p className="text-xs font-semibold">{comment.created_by || 'Usuario'}</p>
                <p className="text-sm">{comment.content}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {format(new Date(comment.created_date), "d 'de' MMM 'as' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Escreva um comentario..."
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSendComment()}
              className="h-9 text-sm"
            />
            <Button size="sm" onClick={handleSendComment} disabled={sending || !commentText.trim()} className="h-9 px-3 sm:h-8">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

