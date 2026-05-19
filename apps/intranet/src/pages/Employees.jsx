import React, { useMemo, useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Phone, Mail, MapPin, Users, Pencil } from 'lucide-react';
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@macom/ui';
import { Skeleton } from '@/components/ui/skeleton';
import EmployeeForm from '../components/employees/EmployeeForm';
import { usePermissions } from '@/lib/usePermissions';
import { toast } from 'sonner';

export default function Employees() {
  const { canEdit } = usePermissions('colaboradores');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => appClient.entities.Employee.list('name', 200),
  });

  const departmentOptions = useMemo(() => {
    const values = employees
      .map((employee) => employee.department_name || employee.department)
      .filter(Boolean);
    return ['all', ...new Set(values)];
  }, [employees]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => appClient.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditingEmployee(null);
      setDialogOpen(false);
      toast.success('Colaborador atualizado!');
    },
  });

  const filtered = employees.filter((employee) => {
    const searchTerm = search.toLowerCase();
    const matchSearch =
      !searchTerm ||
      employee.name?.toLowerCase().includes(searchTerm) ||
      employee.email?.toLowerCase().includes(searchTerm);
    const employeeDepartment = employee.department_name || employee.department;
    const matchDept = deptFilter === 'all' || employeeDepartment === deptFilter;
    return matchSearch && matchDept;
  });

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = (data) => {
    if (!editingEmployee) return;
    updateMutation.mutate({
      id: editingEmployee.id,
      data: {
        name: data.name,
        phone: data.phone,
        position: data.position,
      },
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">Diretorio de funcionarios da empresa</p>
        </div>
        {canEdit && (
          <div className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground">
            O cadastro de novos colaboradores depende do provisionamento no Auth.
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {departmentOptions.map((department) => (
            <button
              key={department}
              onClick={() => setDeptFilter(department)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                deptFilter === department ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {department === 'all' ? 'Todos' : department}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-44 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum colaborador encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((employee) => (
            <div key={employee.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {employee.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{employee.name}</h3>
                  <p className="text-xs text-muted-foreground">{employee.position || employee.function_role}</p>
                  {(employee.department_name || employee.department) && (
                    <Badge className="mt-1 text-[10px] bg-gray-100 text-gray-700">
                      {employee.department_name || employee.department}
                    </Badge>
                  )}
                </div>
                {canEdit && (
                  <div className="flex shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(employee)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-1.5">
                {employee.email && (
                  <a href={`mailto:${employee.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                    <Mail className="w-3.5 h-3.5" /> {employee.email}
                  </a>
                )}
                {employee.phone && (
                  <a href={`tel:${employee.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                    <Phone className="w-3.5 h-3.5" /> {employee.phone}
                  </a>
                )}
                {employee.unit_name && (
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {employee.unit_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            key={editingEmployee?.id || 'edit'}
            initial={editingEmployee || {}}
            onSubmit={handleSubmit}
            isLoading={updateMutation.isPending}
            mode="edit"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

