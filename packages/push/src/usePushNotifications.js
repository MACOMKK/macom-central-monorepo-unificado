import { useCallback, useEffect, useState } from 'react';
import {
  clearPushHeartbeat,
  getActivePushSubscription,
  getPushPermission,
  isPushSupported,
  sendPushHeartbeat,
  subscribeToPush,
  unsubscribeFromPush,
} from './pushClient';

const HEARTBEAT_INTERVALO_MS = 20 * 1000;

// Hook generico -- qualquer app so precisa de `usePushNotifications({ sistema: '<slug>' })` pra
// ter o estado (suportado/permissao/inscrito) e as acoes de ativar/desativar notificacoes com o
// app fechado.
export function usePushNotifications({ sistema }) {
  const supported = isPushSupported();
  const [permission, setPermission] = useState(getPushPermission());
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supported) return;
    getActivePushSubscription().then((subscription) => setSubscribed(Boolean(subscription)));
  }, [supported]);

  // Enquanto a aba estiver visivel e a inscricao ativa, avisa o backend periodicamente -- e o
  // sinal que sendPushToColaborador usa pra saber que este dispositivo esta com o app aberto na
  // tela agora, e pular o push nativo (o toast in-app via Realtime ja cobre esse caso).
  useEffect(() => {
    if (!supported || !subscribed) return undefined;

    function heartbeatSeVisivel() {
      if (document.visibilityState === 'visible') sendPushHeartbeat({ sistema });
    }

    // Ao ficar oculta (minimizado, trocou de aba) ou fechar/recarregar, avisa na hora -- sem
    // isso o push so voltaria a chegar depois do heartbeat anterior envelhecer (ate 35s).
    function onFicaOculta() {
      if (document.visibilityState === 'hidden') clearPushHeartbeat({ sistema });
      else heartbeatSeVisivel();
    }

    function onPageHide() {
      clearPushHeartbeat({ sistema });
    }

    heartbeatSeVisivel();
    const intervalId = setInterval(heartbeatSeVisivel, HEARTBEAT_INTERVALO_MS);
    document.addEventListener('visibilitychange', onFicaOculta);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onFicaOculta);
      window.removeEventListener('pagehide', onPageHide);
      clearPushHeartbeat({ sistema });
    };
  }, [supported, subscribed, sistema]);

  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await subscribeToPush({ sistema });
      setSubscribed(true);
      setPermission(getPushPermission());
    } catch (err) {
      setError(err);
      setPermission(getPushPermission());
    } finally {
      setLoading(false);
    }
  }, [sistema]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await unsubscribeFromPush({ sistema });
      setSubscribed(false);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [sistema]);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe };
}
