import { Search } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PositionsToolbar({
  departments,
  onPositionDepartmentFilterChange,
  onSearchChange,
  positionDepartmentFilter,
  search,
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar por cargo ou departamento..."
            className="h-10 rounded-xl pl-10 text-[14px]"
          />
        </div>

        <Select value={positionDepartmentFilter} onValueChange={onPositionDepartmentFilterChange}>
          <SelectTrigger className="h-10 w-full rounded-xl text-[13px] md:w-[220px]">
            <SelectValue placeholder="Todos Departamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Departamentos</SelectItem>
            <SelectItem value="none">Sem departamento</SelectItem>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>
    </Card>
  );
}
