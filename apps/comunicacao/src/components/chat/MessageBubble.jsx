import { useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { Avatar, AvatarFallback, Button, Textarea } from '@macom/ui';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import MessageActionsMenu from './MessageActionsMenu';

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

  if (isImage) {
    return (
      <a href={signedUrl || '#'} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        {signedUrl ? (
          <img src={signedUrl} alt={anexo.nome_arquivo} className="max-w-xs rounded-lg" />
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

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

export default function MessageBubble({ mensagem, isOwn, onUpdate, onDelete }) {
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
    <div className={`group flex w-full items-start gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40 ${isOwn ? 'flex-row-reverse justify-start' : ''}`}>
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials(mensagem.autor?.nome)}</AvatarFallback>
      </Avatar>

      <div className={`flex min-w-0 max-w-[70%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-semibold text-foreground">{isOwn ? 'Você' : mensagem.autor?.nome || 'Usuário'}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(mensagem.criado_em), 'HH:mm')}</span>
          {mensagem.editada_em && !isDeleted ? (
            <span className="text-xs text-muted-foreground">(editada)</span>
          ) : null}
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
            {mensagem.conteudo ? (
              <p className="whitespace-pre-wrap break-words text-sm">{mensagem.conteudo}</p>
            ) : null}
            {Array.isArray(mensagem.anexos)
              ? mensagem.anexos.map((anexo) => <Anexo key={anexo.id} anexo={anexo} />)
              : null}
          </div>
        )}
      </div>

      {isOwn && !isDeleted && !isEditing ? (
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <MessageActionsMenu onEdit={() => setIsEditing(true)} onDelete={() => onDelete(mensagem.id)} />
        </div>
      ) : null}
    </div>
  );
}
