import React from 'react';
import { appClient } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Cake } from 'lucide-react';

function normalizeBirthDateKey(value) {
  if (!value) return null;
  const normalized = typeof value === 'string' ? value.slice(0, 10) : String(value).slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(parsed, 'MM-dd');
}

export default function BirthdayWidget() {
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-birthdays'],
    queryFn: () => appClient.entities.Employee.list('name', 200),
  });

  const today = format(new Date(), 'MM-dd');
  const birthdays = employees.filter((employee) => {
    return normalizeBirthDateKey(employee.birth_date) === today;
  });

  if (birthdays.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Cake className="w-5 h-5 text-pink-500" />
        <h2 className="text-lg font-semibold text-pink-700">Aniversariantes de Hoje</h2>
      </div>
      <div className="space-y-2">
        {birthdays.map((employee) => (
          <div key={employee.id} className="flex items-center gap-3 p-2 bg-white/60 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm">
              {employee.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-pink-900">{employee.name}</p>
              <p className="text-xs text-pink-600">{employee.department_name || employee.department || 'Sem departamento'} · {employee.position || employee.function_role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

