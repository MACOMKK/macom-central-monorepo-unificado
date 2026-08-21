import { BellRing, X } from 'lucide-react';
import { usePushBanner } from '@/lib/usePushBanner';

export default function PushPermissionBanner() {
  const { canShowBanner, permission, loading, subscribe, dismiss } = usePushBanner();

  if (!canShowBanner) return null;

  const denied = permission === 'denied';

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-2xl">
      <BellRing className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 truncate text-xs font-medium">
        {denied ? 'Notificações bloqueadas no navegador' : 'Ative as notificações'}
      </p>
      {!denied && (
        <button
          type="button"
          disabled={loading}
          onClick={subscribe}
          className="shrink-0 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          Ativar
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
