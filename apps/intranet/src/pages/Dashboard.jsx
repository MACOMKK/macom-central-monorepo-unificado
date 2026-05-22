import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import WelcomeCard from '../components/dashboard/WelcomeCard';
import QuickAccessGrid from '../components/dashboard/QuickAccessGrid';
import RecentAnnouncements from '../components/dashboard/RecentAnnouncements';
import UpcomingEvents from '../components/dashboard/UpcomingEvents';
import BirthdaysPanel from '../components/dashboard/BirthdaysPanel';

export default function Dashboard() {
  const { user } = useAuth();
  const isBackendDegraded = user?.backend_status === 'degraded';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header + Welcome banner */}
      <WelcomeCard user={user} />

      {/* Quick access */}
      <QuickAccessGrid />

      {isBackendDegraded ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          O login foi liberado apenas com o Supabase Auth. Os dados da intranet estao temporariamente indisponiveis, entao a Home carregou em modo reduzido para evitar novas requisicoes com erro.
        </div>
      ) : (
        <>
          {/* Announcements + Birthdays */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentAnnouncements />
            </div>
            <div className="lg:col-span-1">
              <BirthdaysPanel />
            </div>
          </div>

          {/* Upcoming events */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <UpcomingEvents />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

