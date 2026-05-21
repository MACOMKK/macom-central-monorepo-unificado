import React from 'react';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift } from 'lucide-react';

const AVATAR_COLORS = [
  '#3b82f6', '#ec4899', '#10b981', '#f97316',
  '#8b5cf6', '#eab308', '#14b8a6', '#ef4444',
];

function parseBirthDate(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' ? value.slice(0, 10) : String(value).slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function BirthdaysPanel() {
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => appClient.entities.Employee.list('name', 200),
  });

  const today = new Date();
  const currentMonth = today.getMonth();
  const todayStr = format(today, 'MM-dd');

  const birthdaysThisMonth = employees
    .filter((employee) => {
      const birthDate = parseBirthDate(employee.birth_date);
      return birthDate ? birthDate.getMonth() === currentMonth : false;
    })
    .sort((a, b) => {
      const dayA = parseBirthDate(a.birth_date)?.getDate() || 0;
      const dayB = parseBirthDate(b.birth_date)?.getDate() || 0;
      return dayA - dayB;
    })
    .slice(0, 5);

  const formatDisplayName = (name) => {
    if (!name) return 'Sem nome';
    return name.split(' ').slice(0, 2).join(' ');
  };

  return (
    <div className="h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border/80 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Gift className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold text-foreground">
          Aniversariantes do Mes
        </h2>
      </div>

      {isLoading ? (
        <p className="px-5 py-8 text-sm text-muted-foreground">Carregando aniversariantes...</p>
      ) : birthdaysThisMonth.length === 0 ? (
        <div className="m-5 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Nenhum aniversariante encontrado para este mes.
          {' '}
          As datas exibidas aqui vem do perfil do colaborador.
        </div>
      ) : (
        <div className="space-y-1 px-4 py-3">
          {birthdaysThisMonth.map((employee, index) => {
            const birthDate = parseBirthDate(employee.birth_date);
            if (!birthDate) return null;
            const employeeDayStr = format(birthDate, 'MM-dd');
            const isBirthday = employeeDayStr === todayStr;
            const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

            return (
              <div key={employee.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/40">
                <div
                  className="relative h-12 w-12 shrink-0 rounded-full ring-2 ring-rose-500/90 ring-offset-2 ring-offset-background"
                >
                  {employee.photo_url ? (
                    <img src={employee.photo_url} alt={employee.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: color }}
                    >
                      {employee.name?.charAt(0)}
                    </div>
                  )}
                  {isBirthday ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
                      <Gift className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">
                    {formatDisplayName(employee.name)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee.department_name || employee.department || 'Sem departamento'}
                  </p>
                </div>

                {isBirthday ? (
                  <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500">
                    Hoje!
                  </span>
                ) : (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {format(birthDate, "d 'de' MMM", { locale: ptBR })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link
        to="/colaboradores"
        className="flex items-center justify-center border-t border-border/80 px-5 py-4 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        Ver todos aniversariantes
      </Link>
    </div>
  );
}

