import { createContext, useContext } from 'react';
import { usePushNotifications } from '@macom/push';

const PushContext = createContext(null);

const PUSH_SISTEMA = 'servicos';

// Fonte unica do estado de push pro app inteiro -- Header, NotificationsBell e usePushBanner
// consomem este contexto em vez de cada um chamar usePushNotifications() por conta propria.
// Sem isso, cada chamada cria seu proprio useState('subscribed') independente: um subscribe()
// feito a partir do botao do Header nunca refletia no icone do sino (outra instancia do hook),
// ja que cada uma so re-checa a subscription ativa uma vez, no proprio mount.
export function PushProvider({ children }) {
  const push = usePushNotifications({ sistema: PUSH_SISTEMA });
  return <PushContext.Provider value={push}>{children}</PushContext.Provider>;
}

export function usePush() {
  const context = useContext(PushContext);
  if (!context) throw new Error('usePush precisa estar dentro de <PushProvider>.');
  return context;
}
