import { useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, Button, Textarea } from '@macom/ui';
import MessageActionsMenu from './MessageActionsMenu';

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
    <div className="group flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40">
      <Avatar className="mt-0.5 h-8 w-8">
        <AvatarFallback className="text-xs">{initials(mensagem.autor?.nome)}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-foreground">{mensagem.autor?.nome || 'Usuário'}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(mensagem.criado_em), 'HH:mm')}</span>
          {mensagem.editada_em && !isDeleted ? (
            <span className="text-xs text-muted-foreground">(editada)</span>
          ) : null}
        </div>

        {isDeleted ? (
          <p className="text-sm italic text-muted-foreground">Mensagem excluída</p>
        ) : isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-16"
              autoFocus
            />
            <div className="flex gap-2">
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
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{mensagem.conteudo}</p>
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
