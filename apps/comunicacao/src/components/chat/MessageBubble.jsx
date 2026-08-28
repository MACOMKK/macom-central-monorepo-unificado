import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, Button, Spinner, Textarea } from '@macom/ui';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import MessageActionsMenu from './MessageActionsMenu';
import ReactionPicker from './ReactionPicker';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Anexo({ anexo }) {
  const { data: signedUrl } = useQuery({
    queryKey: ['comunicacao-anexo-url', anexo.storage_path],
    queryFn: () => comunicacaoApi.anexos.getSignedUrl(anexo.storage_path),
    staleTime: 4 * 60 * 1000,
  });

  const isImage = anexo.tipo_mime?.startsWith('image/');
  const isAudio = anexo.tipo_mime?.startsWith('audio/');

  if (isAudio) {
    return signedUrl ? (
      <audio controls preload="none" src={signedUrl} className="mt-1 h-10 max-w-full sm:max-w-xs">
        Seu navegador não suporta áudio.
      </audio>
    ) : (
      <div className="mt-1 h-10 w-40 animate-pulse rounded-md bg-black/10" />
    );
  }

  if (isImage) {
    return (
      <a href={signedUrl || '#'} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        {signedUrl ? (
          <img src={signedUrl} alt={anexo.nome_arquivo} className="max-w-full rounded-lg sm:max-w-xs" />
        ) : (
          <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-black/10 text-xs text-muted-foreground">
            Carregando...
          </div>
        )}
      </a>
    );
  }

  return (
    <a
      href={signedUrl || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-center gap-2 rounded-md border border-border/50 bg-black/5 px-2 py-1.5 text-xs"
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="max-w-40 truncate">{anexo.nome_arquivo}</span>
      <span className="text-muted-foreground">{formatBytes(anexo.tamanho_bytes)}</span>
    </a>
  );
}

const MENTION_PATTERN = /@\[([^\]]+)\]/g;

function renderConteudoComMencoes(conteudo, isOwn) {
  const parts = [];
  let lastIndex = 0;
  let match;
  MENTION_PATTERN.lastIndex = 0;
  const mentionClass = isOwn
    ? 'rounded bg-primary-foreground/20 px-1 font-medium text-primary-foreground'
    : 'rounded bg-primary/20 px-1 font-medium text-primary';
  while ((match = MENTION_PATTERN.exec(conteudo)) !== null) {
    if (match.index > lastIndex) parts.push(conteudo.slice(lastIndex, match.index));
    parts.push(
      <span key={match.index} className={mentionClass}>
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < conteudo.length) parts.push(conteudo.slice(lastIndex));
  return parts;
}

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

export default function MessageBubble({ mensagem, isOwn, isAdmin, onUpdate, onDelete, onReply, onToggleReacao, onRemoveFailed }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(mensagem.conteudo);
  const [saving, setSaving] = useState(false);

  const isDeleted = Boolean(mensagem.excluida_em);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === mensagem.conteudo) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdate(mensagem.id, trimmed);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`group flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40 ${isOwn ? 'flex-row-reverse justify-start' : ''}`}>
      {isOwn ? null : (
        <Avatar className="mt-0.5 h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs">{initials(mensagem.autor?.nome)}</AvatarFallback>
        </Avatar>
      )}

      <div className={`flex min-w-0 flex-col ${isOwn ? 'max-w-[75%] items-end' : 'max-w-[62%] items-start'}`}>
        <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {isOwn ? null : (
            <span className="text-sm font-semibold text-foreground">{mensagem.autor?.nome || 'Usuário'}</span>
          )}
          <span className="text-xs text-muted-foreground">{format(new Date(mensagem.criado_em), 'HH:mm')}</span>
          {mensagem.editada_em && !isDeleted ? (
            <span className="text-xs text-muted-foreground">(editada)</span>
          ) : null}
          {mensagem._pending ? <Spinner size="sm" className="text-muted-foreground" /> : null}
        </div>

        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">Mensagem excluída</p>
        ) : isEditing ? (
          <div className="mt-1 w-full space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-16"
              autoFocus
            />
            <div className={`flex gap-2 ${isOwn ? 'justify-end' : ''}`}>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(mensagem.conteudo);
                  setIsEditing(false);
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`mt-0.5 rounded-lg px-3 py-1.5 ${
              isOwn ? 'rounded-tr-none bg-primary text-primary-foreground' : 'rounded-tl-none bg-muted text-foreground'
            }`}
          >
            {mensagem.resposta_a ? (
              <div
                className={`mb-1 flex max-w-full flex-col rounded-md border-l-2 border-primary/50 bg-black/5 px-2 py-1 text-xs ${isOwn ? 'items-end text-right' : 'items-start text-left'}`}
              >
                <span className="font-medium text-foreground/80">
                  {mensagem.resposta_a.autor?.nome || 'Usuário'}
                </span>
                <span className="truncate text-muted-foreground">
                  {mensagem.resposta_a.excluida_em ? 'Mensagem excluída' : mensagem.resposta_a.conteudo || '(anexo)'}
                </span>
              </div>
            ) : null}
            {mensagem.conteudo ? (
              <p className="whitespace-pre-wrap break-words text-sm">{renderConteudoComMencoes(mensagem.conteudo, isOwn)}</p>
            ) : null}
            {Array.isArray(mensagem.anexos)
              ? mensagem.anexos.map((anexo) => <Anexo key={anexo.id} anexo={anexo} />)
              : null}
          </div>
        )}

        {mensagem._failed ? (
          <button
            type="button"
            onClick={() => onRemoveFailed?.(mensagem.id)}
            className="mt-1 flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <AlertCircle className="h-3 w-3" />
            Falha ao enviar. Toque para remover.
          </button>
        ) : null}

        {!isDeleted && Array.isArray(mensagem.reacoes) && mensagem.reacoes.length > 0 ? (
          <div className={`mt-1 flex flex-wrap gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {mensagem.reacoes.map((reacao) => (
              <button
                key={reacao.emoji}
                type="button"
                onClick={() => onToggleReacao(reacao.emoji)}
                className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${
                  reacao.reagiu ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                }`}
              >
                <span>{reacao.emoji}</span>
                <span className="text-muted-foreground">{reacao.total}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!isDeleted && !isEditing && !mensagem._pending && !mensagem._failed ? (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <ReactionPicker onSelect={onToggleReacao} />
          <MessageActionsMenu
            onReply={() => onReply(mensagem)}
            onEdit={isOwn ? () => setIsEditing(true) : undefined}
            onDelete={isOwn || isAdmin ? () => onDelete(mensagem.id) : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}
