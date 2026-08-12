import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Sem isso, o botao/gesto de voltar do Android fecha o app inteiro em vez de navegar
// pra tela anterior. So ativa dentro do shell nativo (Capacitor.isNativePlatform());
// no browser esse plugin nem existe, entao a versao web fica intocada.
const ROOT_PATHS = ['/solicitacoes', '/entrar'];

export default function NativeBackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      if (ROOT_PATHS.includes(pathnameRef.current)) {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listenerPromise.then((listener) => listener.remove());
    };
  }, [navigate]);

  return null;
}
