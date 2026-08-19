import { useCallback, useEffect, useState } from 'react';

const DISMISS_STORAGE_KEY = 'servicos:install-prompt-dismissed-until';
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isDismissed() {
  const until = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) || 0);
  return Date.now() < until;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => window.__servicosInstallPrompt || null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(isDismissed);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const handlePromptReady = () => {
      if (window.__servicosInstallPrompt) {
        setDeferredPrompt(window.__servicosInstallPrompt);
      }
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('servicos:install-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('servicos:install-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    window.__servicosInstallPrompt = null;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(until));
    setDismissed(true);
  }, []);

  const canInstall = Boolean(deferredPrompt) && !isInstalled;

  return {
    canInstall,
    canShowBanner: canInstall && !dismissed,
    promptInstall,
    dismiss,
  };
}
