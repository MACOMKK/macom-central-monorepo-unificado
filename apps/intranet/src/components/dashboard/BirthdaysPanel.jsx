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
      if (!employee.birth_date) return false;
      return new Date(employee.birth_date + 'T00:00:00').getMonth() === currentMonth;
    })
    .sort((a, b) => {
      const dayA = new Date(a.birth_date + 'T00:00:00').getDate();
      const dayB = new Date(b.birth_date + 'T00:00:00').getDate();
      return dayA - dayB;
    })
    .slice(0, 5);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-base font-semibold">Aniversariantes do Mes</h2>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6">Carregando aniversariantes...</p>
      ) : birthdaysThisMonth.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Nenhum aniversariante encontrado para este mes.
          {' '}
          As datas exibidas aqui vem do perfil do colaborador.
        </div>
      ) : (
        <div className="space-y-3">
          {birthdaysThisMonth.map((employee, index) => {
            const birthDate = new Date(employee.birth_date + 'T00:00:00');
            const employeeDayStr = employee.birth_date.slice(5);
            const isBirthday = employeeDayStr === todayStr;
            const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

            return (
              <div key={employee.id} className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 relative"
                  style={{ background: color }}
                >
                  {employee.photo_url ? (
                    <img src={employee.photo_url} alt={employee.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    employee.name?.charAt(0)
                  )}
                  {isBirthday && <span className="absolute -top-1 -right-1 text-sm">B</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{employee.name?.split(' ').slice(0, 2).join(' ')}</p>
                  <p className="text-xs text-muted-foreground">{employee.department_name || employee.department || 'Sem departamento'}</p>
                </div>

                {isBirthday ? (
                  <span className="text-xs font-bold text-white bg-primary px-2.5 py-1 rounded-full shrink-0">
                    Hoje!
                  </span>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap">
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
        className="mt-4 flex items-center justify-center text-sm text-foreground font-medium hover:text-primary transition-colors pt-3 border-t border-border"
      >
        Ver todos aniversariantes
      </Link>
    </div>
  );
}

