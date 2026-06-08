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

function parseBirthDate(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' ? value.slice(0, 10) : String(value).slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-60">
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
    queryKey: ['employee-birthdays'],
    queryFn: () => appClient.entities.EmployeeBirthday.list('name', 200),
  });

  const today = new Date();
  const currentMonth = today.getMonth();

  const birthdaysThisMonth = employees
    .filter((employee) => {
      const birthDate = parseBirthDate(employee.birth_date);
      return birthDate ? birthDate.getMonth() === currentMonth : false;
    })
    .sort((a, b) => {
      const dayA = parseBirthDate(a.birth_date)?.getDate() || 0;
      const dayB = parseBirthDate(b.birth_date)?.getDate() || 0;
      return dayA - dayB;
    });

  if (birthdaysThisMonth.length === 0) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' });
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: '#141414' }}>
      <div className="flex items-stretch">
        <div className="flex min-w-[180px] shrink-0 flex-col justify-center px-6 py-8">
          <h2 className="mb-2 text-2xl font-bold leading-tight text-white">
            Aniversariantes
            <br />
            do Mês
          </h2>
          <p className="text-sm capitalize text-gray-400">
            {format(today, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {birthdaysThisMonth.length} {birthdaysThisMonth.length === 1 ? 'aniversariante' : 'aniversariantes'}
          </p>
        </div>

        <button
          onClick={() => scroll(-1)}
          className="flex w-8 shrink-0 items-center justify-center text-gray-500 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-3 overflow-x-auto py-5 pr-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {birthdaysThisMonth.map((employee, index) => {
            const birthDate = parseBirthDate(employee.birth_date);
            if (!birthDate) return null;

            const isToday =
              birthDate.getDate() === today.getDate() &&
              birthDate.getMonth() === today.getMonth();
            const colorIndex = index % AVATAR_COLORS.length;

            return (
              <div
                key={employee.id}
                className="relative flex w-[148px] shrink-0 flex-col items-center gap-2 rounded-xl p-4"
                style={{ background: '#1e1e1e' }}
              >
                <Confetti />

                <div className={`z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${AVATAR_COLORS[colorIndex]} text-2xl font-bold text-white`}>
                  {employee.photo_url ? (
                    <img src={employee.photo_url} alt={employee.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    employee.name?.charAt(0)
                  )}
                </div>

                <p className="z-10 text-center text-sm font-bold leading-tight text-white">
                  {employee.name}
                  {isToday ? ' 🎂' : ''}
                </p>

                <span className={`${DATE_BADGE_COLORS[colorIndex]} z-10 rounded-full px-3 py-0.5 text-xs font-semibold text-white`}>
                  {format(birthDate, "dd 'de' MMM", { locale: ptBR })}
                </span>

                {employee.position ? (
                  <p className="z-10 w-full truncate text-center text-xs text-gray-400">{employee.position}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => scroll(1)}
          className="flex w-8 shrink-0 items-center justify-center pr-2 text-gray-500 transition-colors hover:text-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
