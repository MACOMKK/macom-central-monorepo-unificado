import { Search } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CollaboratorsToolbar({
  collaboratorDepartmentFilter,
  collaboratorStatusFilter,
  collaboratorUnitFilter,
  departments,
  onCollaboratorDepartmentFilterChange,
  onCollaboratorStatusFilterChange,
  onCollaboratorUnitFilterChange,
  onSearchChange,
  search,
  units,
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por nome, telefone ou departamento..."
            className="h-10 rounded-xl pl-10 text-[14px]"
          />
        </div>

        <Select value={collaboratorUnitFilter} onValueChange={onCollaboratorUnitFilterChange}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[180px]">
            <SelectValue placeholder="Todas Unidades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Unidades</SelectItem>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={collaboratorDepartmentFilter} onValueChange={onCollaboratorDepartmentFilterChange}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[180px]">
            <SelectValue placeholder="Todos Departamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Departamentos</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={collaboratorStatusFilter} onValueChange={onCollaboratorStatusFilterChange}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[160px]">
            <SelectValue placeholder="Todos Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
