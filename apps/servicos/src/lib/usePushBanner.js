import { useCallback, useState } from 'react';
import { usePush } from './PushContext';

const DISMISS_STORAGE_KEY = 'servicos:push-banner-dismissed-until';
const DISMISS_DAYS = 7;

function isDismissed() {
  const until = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
  return Date.now() < until;
}

// Mesma ideia do useInstallPrompt.js -- aqui o "dispensado" nao serve pra permission === 'denied'
// (aviso permanece ate reativar manualmente no navegador, ja que nao ha novo prompt possivel).
export function usePushBanner() {
  const push = usePush();
  const [dismissed, setDismissed] = useState(isDismissed);

  const dismiss = useCallback(() => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(until));
    setDismissed(true);
  }, []);

  // Nao basta permission !== 'granted': o navegador pode ja ter concedido a permissao antes mas
  // a subscription real ter sumido (dados do site limpos, subscription expirada, revogada no
  // backend etc.) -- nesse caso permission continua 'granted' pra sempre, entao o que decide se
  // precisa reativar e apenas !subscribed. 'denied' e tratado à parte (Header esconde o botao,
  // ja que requestPermission() nao reabre o prompt nesse estado).
  const needsAttention = push.supported && push.permission !== 'denied' && !push.subscribed;
  const canShowBanner = needsAttention && !dismissed;

  return {
    canShowBanner,
    permission: push.permission,
    loading: push.loading,
    error: push.error,
    subscribe: push.subscribe,
    dismiss,
  };
}
