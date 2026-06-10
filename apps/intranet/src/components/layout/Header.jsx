import React, { useEffect, useRef, useState } from 'react';
import { Bell, ExternalLink, LogOut, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { appClient } from '@/api/client';
import PasswordChangeForm from '@/components/auth/PasswordChangeForm';
import { useAuth } from '@/lib/AuthContext';

function formatDateLabel() {
  const formatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const profileRef = useRef(null);
  const dateLabel = formatDateLabel();
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const rows = await appClient.entities.Profile.list();
      return rows[0] || null;
    },
    enabled: Boolean(user),
  });
  const displayName = currentProfile?.name || user?.full_name || user?.email || 'Usuario';
  const displayEmail = currentProfile?.email || user?.email || '';
  const photoUrl = currentProfile?.photo_url || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenPassword = () => {
    setProfileOpen(false);
    setPasswordDialogOpen(true);
  };

  const handleOpenProfile = () => {
    setProfileOpen(false);
    navigate('/perfil');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#141414] lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 sm:hidden">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[#E30613]">Intranet</p>
          <p className="truncate text-xs font-medium text-slate-500">{dateLabel}</p>
        </div>

        <div className="hidden items-center gap-2 text-sm font-semibold capitalize text-slate-500 sm:flex">
          {dateLabel}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#141414]"
          aria-label="Notificacoes"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold uppercase transition-colors ${
              profileOpen
                ? 'border-[#E30613] bg-[#E30613] text-white ring-2 ring-[#E30613]/25'
                : 'border-[#E30613] bg-[#E30613] text-white hover:bg-[#c80510]'
            }`}
            aria-label="Abrir menu da conta"
          >
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[46px] z-50 w-[min(360px,calc(100vw-2rem))] rounded-md border border-[#3a3a3d] bg-[#242529] px-6 py-6 text-[#d7d7db] shadow-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[#8f9198]">Conta</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E30613] text-sm font-bold text-white">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                  <p className="truncate text-sm text-[#a7a8ad]">{displayEmail}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenProfile}
                className="mt-7 flex w-full items-center justify-between text-left text-sm font-medium text-[#d7d7db] transition-colors hover:text-white"
              >
                Perfil
                <ExternalLink className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleOpenPassword}
                className="mt-4 flex w-full items-center justify-between text-left text-sm font-medium text-[#d7d7db] transition-colors hover:text-white"
              >
                Gerenciar conta
                <ExternalLink className="h-4 w-4" />
              </button>

              <div className="my-6 h-px bg-[#3a3a3d]" />

              <button
                type="button"
                onClick={() => appClient.auth.logout('/login')}
                className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-[#d7d7db] transition-colors hover:text-[#E30613]"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {passwordDialogOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="absolute inset-0" onClick={() => setPasswordDialogOpen(false)} />
          <div className="relative w-full max-w-md">
            <PasswordChangeForm
              onCancel={() => setPasswordDialogOpen(false)}
              onSuccess={() => setPasswordDialogOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
