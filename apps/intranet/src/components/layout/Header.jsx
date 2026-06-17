import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ExternalLink, LogOut, Menu } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { appClient } from '@/api/client';
import { supabase } from '@/api/supabaseClient';
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

function formatNotificationDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const dateLabel = formatDateLabel();
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const rows = await appClient.entities.Profile.list();
      return rows[0] || null;
    },
    enabled: Boolean(user),
  });
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => appClient.notifications.list(20),
    enabled: Boolean(user),
    refetchInterval: 60000,
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
  const notifications = Array.isArray(notificationsData?.items) ? notificationsData.items : [];
  const unreadCount = Number(notificationsData?.unread_count || 0);

  const markReadMutation = useMutation({
    mutationFn: (id) => appClient.notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => appClient.notifications.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const collaboratorId = user?.collaborator_id || user?.id;
    if (!collaboratorId || !supabase) return undefined;

    const channel = supabase
      .channel(`intranet-notifications:${collaboratorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'gestao_intranet',
          table: 'notificacoes',
          filter: `colaborador_id=eq.${collaboratorId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          const notification = payload.new || {};
          if (notification.titulo) {
            toast.info(notification.titulo, {
              description: notification.mensagem || undefined,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.collaborator_id, user?.id]);

  const handleOpenPassword = () => {
    setProfileOpen(false);
    setPasswordDialogOpen(true);
  };

  const handleOpenProfile = () => {
    setProfileOpen(false);
    navigate('/perfil');
  };

  const handleOpenNotification = (notification) => {
    if (!notification?.read) {
      markReadMutation.mutate(notification.id);
    }
    setNotificationsOpen(false);
    if (notification?.link) {
      navigate(notification.link);
    }
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
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((current) => !current);
              setProfileOpen(false);
            }}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              notificationsOpen ? 'bg-slate-100 text-[#141414]' : 'text-slate-500 hover:bg-slate-100 hover:text-[#141414]'
            }`}
            aria-label="Notificacoes"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E30613] px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </button>

          {notificationsOpen ? (
            <div className="absolute right-0 top-[46px] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-800 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">Notificacoes</p>
                  <p className="text-xs text-slate-500">{unreadCount} nao lida{unreadCount === 1 ? '' : 's'}</p>
                </div>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => markAllReadMutation.mutate()}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#E30613] transition-colors hover:bg-red-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Ler todas
                  </button>
                ) : null}
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma notificacao por enquanto.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleOpenNotification(notification)}
                      className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${
                        notification.read ? 'bg-white' : 'bg-red-50/45'
                      }`}
                    >
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? 'bg-slate-200' : 'bg-[#E30613]'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{notification.title}</span>
                        {notification.message ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{notification.message}</span>
                        ) : null}
                        <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {notification.type} {notification.created_date ? `- ${formatNotificationDate(notification.created_date)}` : ''}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

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
