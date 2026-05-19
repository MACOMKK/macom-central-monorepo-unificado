import React, { useRef } from 'react';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-blue-400', 'bg-pink-400', 'bg-green-400', 'bg-orange-400',
  'bg-purple-400', 'bg-yellow-400', 'bg-teal-400', 'bg-red-400',
];

const DATE_BADGE_COLORS = [
  'bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500',
  'bg-purple-500', 'bg-yellow-500', 'bg-teal-500', 'bg-red-500',
];

const CONFETTI = ['🎊', '🎉', '✨', '🎈', '🎁'];

function Confetti() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl opacity-60">
      {[...Array(6)].map((_, i) => (
        <span
          key={i}
          className="absolute text-xs"
          style={{
            top: `${10 + (i * 13) % 40}%`,
            left: `${5 + (i * 17) % 85}%`,
            transform: `rotate(${i * 45}deg)`,
            fontSize: '10px',
          }}
        >
          {CONFETTI[i % CONFETTI.length]}
        </span>
      ))}
    </div>
  );
}

export default function MonthlyBirthdaysWidget() {
  const scrollRef = useRef(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => appClient.entities.Employee.list('name', 200),
  });

  const today = new Date();
  const currentMonth = today.getMonth();

  const birthdaysThisMonth = employees
    .filter(emp => {
      if (!emp.birth_date) return false;
      const birthDate = new Date(emp.birth_date + 'T00:00:00');
      return birthDate.getMonth() === currentMonth;
    })
    .sort((a, b) => {
      const dayA = new Date(a.birth_date + 'T00:00:00').getDate();
      const dayB = new Date(b.birth_date + 'T00:00:00').getDate();
      return dayA - dayB;
    });

  if (birthdaysThisMonth.length === 0) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#141414' }}>
      <div className="flex items-stretch">
        {/* Left panel */}
        <div className="flex flex-col justify-center px-6 py-8 min-w-[180px] shrink-0">
          <h2 className="text-white font-bold text-2xl leading-tight mb-2">
            Aniversariantes<br />do Mês
          </h2>
          <p className="text-gray-400 text-sm capitalize">
            {format(today, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {birthdaysThisMonth.length} {birthdaysThisMonth.length === 1 ? 'aniversariante' : 'aniversariantes'}
          </p>
        </div>

        {/* Scroll left button */}
        <button
          onClick={() => scroll(-1)}
          className="flex items-center justify-center w-8 shrink-0 text-gray-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Cards carousel */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto py-5 pr-4 scrollbar-hide flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {birthdaysThisMonth.map((emp, idx) => {
            const birthDate = new Date(emp.birth_date + 'T00:00:00');
            const isToday =
              birthDate.getDate() === today.getDate() &&
              birthDate.getMonth() === today.getMonth();
            const colorIdx = idx % AVATAR_COLORS.length;

            return (
              <div
                key={emp.id}
                className="relative flex flex-col items-center gap-2 rounded-xl p-4 shrink-0 w-[148px]"
                style={{ background: '#1e1e1e' }}
              >
                <Confetti />

                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white font-bold text-2xl shrink-0 z-10`}>
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    emp.name?.charAt(0)
                  )}
                </div>

                {/* Name */}
                <p className="text-white font-bold text-sm text-center leading-tight z-10">
                  {emp.name}{isToday ? ' 🎂' : ''}
                </p>

                {/* Date badge */}
                <span className={`${DATE_BADGE_COLORS[colorIdx]} text-white text-xs font-semibold px-3 py-0.5 rounded-full z-10`}>
                  {format(birthDate, "dd 'de' MMM", { locale: ptBR })}
                </span>

                {/* Position */}
                {emp.position && (
                  <p className="text-gray-400 text-xs text-center truncate w-full z-10">{emp.position}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Scroll right button */}
        <button
          onClick={() => scroll(1)}
          className="flex items-center justify-center w-8 shrink-0 text-gray-500 hover:text-white transition-colors pr-2"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

