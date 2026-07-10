import { useRef, useState } from 'react';
import { Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Avatar, AvatarFallback, Button, Textarea } from '@macom/ui';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useColaboradores } from '@/hooks/useColaboradores';

const TYPING_DEBOUNCE_MS = 3000;

function getInitials(nome = '') {
  return (
    nome
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

function findMentionQuery(value, cursorPos) {
  const uptoCursor = value.slice(0, cursorPos);
  const match = uptoCursor.match(/(?:^|\s)@([^\s@[\]]*)$/);
  if (!match) return null;
  return { query: match[1], start: cursorPos - match[1].length - 1 };
}

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.xls,.xlsx';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageComposer({ onSend, disabled, canalId, conversaId, replyingTo, onCancelReply }) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [mentionState, setMentionState] = useState(null); // { query, start }
  const [mentionedById, setMentionedById] = useState({}); // { [id]: nome }
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const { notifyTyping, stopTyping } = useTypingIndicator({ canalId, conversaId });
  const { data: mentionCandidates = [] } = useColaboradores(mentionState?.query ?? '', {
    enabled: mentionState !== null,
  });
  const showMentionDropdown = mentionState !== null;

  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setValue(nextValue);
    notifyTyping();
    clearTypingTimeout();
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_MS);

    setMentionState(findMentionQuery(nextValue, event.target.selectionStart));
  };

  const handleSelectMention = (colaborador) => {
    if (!mentionState) return;
    const before = value.slice(0, mentionState.start);
    const after = value.slice(mentionState.start + 1 + mentionState.query.length);
    const inserted = `@[${colaborador.nome}] `;
    const nextValue = `${before}${inserted}${after}`;
    setValue(nextValue);
    setMentionedById((current) => ({ ...current, [colaborador.id]: colaborador.nome }));
    setMentionState(null);

    requestAnimationFrame(() => {
      const cursor = before.length + inserted.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  const handleSend = async () => {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || sending || disabled) return;

    clearTypingTimeout();
    stopTyping();
    setSending(true);
    setUploadError('');
    try {
      const anexos = [];
      for (const file of files) {
        anexos.push(await comunicacaoApi.anexos.upload({ file, canalId, conversaId }));
      }
      const mencoes = Object.entries(mentionedById)
        .filter(([, nome]) => trimmed.includes(`@[${nome}]`))
        .map(([id]) => id);
      await onSend({ conteudo: trimmed, anexos, mencoes });
      setValue('');
      setFiles([]);
      setMentionedById({});
    } catch (error) {
      setUploadError(error?.message || 'Nao foi possivel enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (showMentionDropdown) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMentionState(null);
        return;
      }
      if (event.key === 'Enter' && mentionCandidates.length > 0) {
        event.preventDefault();
        handleSelectMention(mentionCandidates[0]);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFilesSelected = (event) => {
    const selected = Array.from(event.target.files || []);
    setFiles((current) => [...current, ...selected]);
    event.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border p-3">
      {replyingTo ? (
        <div className="mb-2 flex items-center justify-between rounded-md border-l-2 border-primary/50 bg-muted/50 px-2 py-1.5 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-foreground/80">Respondendo a {replyingTo.autor?.nome || 'Usuário'}</p>
            <p className="truncate text-muted-foreground">{replyingTo.conteudo || '(anexo)'}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Cancelar resposta"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs"
            >
              <span className="max-w-40 truncate">{file.name}</span>
              <span className="text-muted-foreground">{formatBytes(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Remover anexo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {uploadError ? <p className="mb-2 text-xs text-destructive">{uploadError}</p> : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          accept={ACCEPT}
          onChange={handleFilesSelected}
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          aria-label="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <div className="relative flex-1">
          {showMentionDropdown && mentionCandidates.length > 0 ? (
            <ul className="absolute bottom-full left-0 mb-1 max-h-56 w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
              {mentionCandidates.map((colaborador) => (
                <li key={colaborador.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelectMention(colaborador)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">{getInitials(colaborador.nome)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate">{colaborador.nome}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem... (@ para mencionar)"
            className="min-h-11 w-full resize-none"
            disabled={disabled || sending}
          />
        </div>
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || sending || (!value.trim() && files.length === 0)}
          aria-label="Enviar"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
