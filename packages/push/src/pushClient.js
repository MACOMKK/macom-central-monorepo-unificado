import { assertSupabaseConfigured, supabase } from '@macom/api-client/supabaseClient';
import { PUSH_SW_URL, VAPID_PUBLIC_KEY } from './constants';

// Pacote generico de Web Push, pensado pra ser reaproveitado por qualquer app do monorepo (hoje
// so `servicos` usa) -- basta chamar `subscribeToPush({ sistema })`/`unsubscribeFromPush({
// sistema })` com o slug do app (mesmo `sistema` de public.sistemas). Backend generico
// correspondente: Edge Function `push-api` + supabase/functions/_shared/push.ts.
// App sem PWA: copiar `packages/push/push-sw.js` pra `public/push-sw.js` -- e registrado sob
// demanda por `getOrRegisterSW()` abaixo. App com PWA (vite-plugin-pwa): a logica de push (mesmo
// codigo de push-sw.js) precisa ir dentro do service worker do proprio app (estrategia
// `injectManifest`), nao em um arquivo separado -- os dois SWs disputariam o mesmo escopo '/'.
// Ver apps/servicos/src/sw.js como referencia.

export function isPushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPushPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function toError(message) {
  return new Error(typeof message === 'string' ? message : message?.message || 'Falha na inscricao de push.');
}

// Reaproveita o service worker ja registrado no escopo '/' se houver um (caso de apps PWA, cujo
// vite-plugin-pwa ja registrou um SW que trata push -- ver apps/servicos/src/sw.js). So registra
// push-sw.js aqui se nao houver nenhum registro ainda (apps sem PWA). Nao da pra ter os dois SWs
// coexistindo: o registro e chaveado por escopo, entao o segundo `.register()` substituiria o
// primeiro.
async function getOrRegisterSW() {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }
  const registration = await navigator.serviceWorker.register(PUSH_SW_URL);
  await navigator.serviceWorker.ready;
  return registration;
}

async function invokePushApi(body) {
  assertSupabaseConfigured();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw toError('Sessao expirada. Faca login novamente.');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw toError(result?.error);
  return result;
}

export async function subscribeToPush({ sistema }) {
  if (!isPushSupported()) throw new Error('Este navegador nao suporta notificacoes.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Permissao de notificacao negada.');

  const registration = await getOrRegisterSW();

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await invokePushApi({ action: 'subscribe', sistema, subscription: subscription.toJSON() });
  return subscription;
}

export async function unsubscribeFromPush({ sistema }) {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await invokePushApi({ action: 'unsubscribe', sistema, endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}

export async function getActivePushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) || null;
}

// Avisa o backend que este dispositivo esta com o app aberto/visivel agora -- usado por
// sendPushToColaborador (supabase/functions/_shared/push.ts) pra pular o push nativo neste
// dispositivo especifico e evitar duplicar o toast in-app que ja chega via Realtime. Falha
// silenciosa: se o heartbeat nao chegar, o pior caso e so voltar a receber o push normalmente.
export async function sendPushHeartbeat({ sistema }) {
  if (!isPushSupported()) return;
  try {
    const subscription = await getActivePushSubscription();
    if (!subscription) return;
    await invokePushApi({ action: 'heartbeat', sistema, endpoint: subscription.endpoint });
  } catch {
    // silencioso -- heartbeat nao pode derrubar a tela do usuario
  }
}
