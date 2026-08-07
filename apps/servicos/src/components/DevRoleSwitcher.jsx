import { FlaskConical } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

const OPTIONS = [
  { value: 'real', label: 'Nivel real (sem simulacao)' },
  { value: 'usuario', label: 'Simular: Usuario' },
  { value: 'gestor', label: 'Simular: Gestor' },
  { value: 'admin', label: 'Simular: Admin' },
];

// Widget temporario, so em dev, pra alternar entre os 3 niveis de acesso
// (Camada 1: usuario | gestor | admin) sem depender de cadastro real no banco.
// Nao chama nenhuma action no backend: so troca o que o front enxerga em
// user.system_access_level/role, entao acoes reais continuam validadas pela
// edge function com o nivel de acesso verdadeiro do colaborador logado.
// Remover quando o sistema sair de fase de teste.
export default function DevRoleSwitcher() {
  const { realUser, roleOverride, setRoleOverride } = useAuth();

  if (!import.meta.env.DEV || !realUser) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-3 py-2 text-xs shadow-lg dark:bg-amber-950">
      <FlaskConical className="h-4 w-4 shrink-0 text-amber-600" />
      <Select value={roleOverride || 'real'} onValueChange={(value) => setRoleOverride(value === 'real' ? null : value)}>
        <SelectTrigger className="h-7 w-48 border-amber-400 bg-white text-xs dark:bg-amber-900">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
