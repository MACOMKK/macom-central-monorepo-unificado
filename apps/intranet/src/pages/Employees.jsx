import React, { useMemo, useState } from 'react';
import { appClient } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Mail, MapPin, Users, Pencil, Building, MessageCircle } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Skeleton } from '@macom/ui';
import EmployeeForm from '../components/employees/EmployeeForm';
import { usePermissions } from '@/lib/usePermissions';
import { toast } from 'sonner';
import Pagination, { usePaginatedItems } from '../components/Pagination';

function replaceEmployee(employees, employee) {
  if (!employee?.id) return employees;
  return employees.map((item) => (item.id === employee.id ? { ...item, ...employee } : item));
}

function getWhatsappUrl(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

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
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['employees'] });
      const previousEmployees = queryClient.getQueryData(['employees']);
      const optimisticEmployee = {
        ...data,
        id,
        updated_date: new Date().toISOString(),
      };

      queryClient.setQueryData(['employees'], (old = []) => (
        Array.isArray(old) ? replaceEmployee(old, optimisticEmployee) : old
      ));
      setEditingEmployee(null);
      setDialogOpen(false);

      return { previousEmployees };
    },
    onSuccess: (updatedEmployee) => {
      queryClient.setQueryData(['employees'], (old = []) => (
        Array.isArray(old) ? replaceEmployee(old, updatedEmployee) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-birthdays'] });
      setEditingEmployee(null);
      setDialogOpen(false);
      toast.success('Colaborador atualizado!');
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(['employees'], context?.previousEmployees);
      toast.error('Não foi possível atualizar o colaborador.');
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
  const {
    page,
    setPage,
    totalItems,
    totalPages,
    paginatedItems: paginatedEmployees,
  } = usePaginatedItems(filtered, 12, [search, deptFilter]);

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleCopyEmail = async (email) => {
    if (!email) return;

    try {
      await copyText(email);
      toast.success('E-mail copiado!');
    } catch (_error) {
      toast.error('Nao foi possivel copiar o e-mail.');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
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
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground mt-1">Diretorio de funcionarios da empresa</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2 pb-1 sm:min-w-0 sm:flex-wrap">
            {departmentOptions.map((department) => (
              <button
                key={department}
                onClick={() => setDeptFilter(department)}
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium transition-colors ${
                  deptFilter === department ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {department === 'all' ? 'Todos' : department}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-[360px] rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum colaborador encontrado.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {paginatedEmployees.map((employee) => (
              <div
                key={employee.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="relative border-b border-slate-100 px-4 pb-5 pt-6 text-center sm:p-6">
                  {employee.phone ? (
                    <a
                      href={getWhatsappUrl(employee.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute right-3 top-3 flex max-w-[150px] items-center gap-1 truncate rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold leading-none text-emerald-700 transition-colors hover:bg-emerald-100"
                      title={`Abrir WhatsApp para ${employee.phone}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      {employee.phone}
                    </a>
                  ) : null}

                  {canEdit ? (
                    <div className="absolute left-3 top-3 flex shrink-0 sm:left-4 sm:top-4">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => openEdit(employee)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}

                  {employee.photo_url ? (
                    <img
                      src={employee.photo_url}
                      alt={`Foto de ${employee.name}`}
                      className="mx-auto mb-4 h-24 w-24 rounded-full border-4 border-slate-50 object-cover transition-colors group-hover:border-primary/20"
                    />
                  ) : (
                    <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-50 bg-primary/10 text-2xl font-bold text-primary transition-colors group-hover:border-primary/20">
                      {getInitials(employee.name)}
                    </div>
                  )}

                  <h3 className="text-lg font-bold leading-tight text-foreground">{employee.name}</h3>
                  <p className="mb-1 text-sm font-medium text-primary">{employee.position || employee.function_role || 'Sem cargo'}</p>
                  <p className="flex items-center justify-center gap-1 text-sm text-slate-500">
                    <Building size={14} />
                    {employee.department_name || employee.department || 'Sem departamento'}
                  </p>
                </div>

                <div className="space-y-3 bg-slate-50 p-4">
                  {employee.email ? (
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(employee.email)}
                      className="flex w-full items-center gap-3 text-left text-sm text-slate-600 transition-colors hover:text-foreground"
                      title={`Copiar ${employee.email}`}
                    >
                      <div className="rounded-md bg-white p-1.5 text-slate-400 shadow-sm">
                        <Mail size={16} />
                      </div>
                      <span className="truncate" title={employee.email}>{employee.email}</span>
                    </button>
                  ) : null}

                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <div className="rounded-md bg-white p-1.5 text-slate-400 shadow-sm">
                      <MapPin size={16} />
                    </div>
                    <span>{employee.unit_name || 'Unidade não informada'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={12}
            onPageChange={setPage}
            itemLabel="colaboradores"
          />
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
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

