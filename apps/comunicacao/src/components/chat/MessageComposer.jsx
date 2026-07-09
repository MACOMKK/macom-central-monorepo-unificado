import { useRef, useState } from 'react';
import { Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Button, Textarea } from '@macom/ui';
import { comunicacaoApi } from '@macom/api-client/comunicacaoApi';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';

const TYPING_DEBOUNCE_MS = 3000;

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
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { notifyTyping, stopTyping } = useTypingIndicator({ canalId, conversaId });

  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleChange = (event) => {
    setValue(event.target.value);
    notifyTyping();
    clearTypingTimeout();
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_MS);
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
      await onSend({ conteudo: trimmed, anexos });
      setValue('');
      setFiles([]);
    } catch (error) {
      setUploadError(error?.message || 'Nao foi possivel enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
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
        <Textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Escreva uma mensagem..."
          className="min-h-11 flex-1 resize-none"
          disabled={disabled || sending}
        />
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
