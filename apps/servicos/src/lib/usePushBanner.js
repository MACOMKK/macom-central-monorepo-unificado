import { useCallback, useState } from 'react';
import { usePushNotifications } from '@macom/push';

const DISMISS_STORAGE_KEY = 'servicos:push-banner-dismissed-until';
const DISMISS_DAYS = 7;
const PUSH_SISTEMA = 'servicos';

function isDismissed() {
  const until = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
  return Date.now() < until;
}

// Mesma ideia do useInstallPrompt.js -- aqui o "dispensado" nao serve pra permission === 'denied'
// (aviso permanece ate reativar manualmente no navegador, ja que nao ha novo prompt possivel).
export function usePushBanner() {
  const push = usePushNotifications({ sistema: PUSH_SISTEMA });
  const [dismissed, setDismissed] = useState(isDismissed);

  const dismiss = useCallback(() => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(until));
    setDismissed(true);
  }, []);

  const needsAttention = push.supported && push.permission !== 'granted' && !push.subscribed;
  const canShowBanner = needsAttention && !dismissed;

  return {
    canShowBanner,
    permission: push.permission,
    loading: push.loading,
    subscribe: push.subscribe,
    dismiss,
  };
}
