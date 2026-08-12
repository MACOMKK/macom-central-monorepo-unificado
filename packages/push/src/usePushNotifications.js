import { useCallback, useEffect, useState } from 'react';
import {
  getActivePushSubscription,
  getPushPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from './pushClient';

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
