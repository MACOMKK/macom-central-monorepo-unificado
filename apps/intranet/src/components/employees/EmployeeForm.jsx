import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

function normalizeDateInput(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export default function EmployeeForm({ onSubmit, isLoading, initial = {}, mode = 'edit' }) {
  const isEditMode = mode === 'edit';
  const [form, setForm] = useState({
    name: initial.name || '',
    email: initial.email || '',
    phone: initial.phone || '',
    department: initial.department || '',
    position: initial.position || '',
    unit: initial.unit || '',
    birth_date: normalizeDateInput(initial.birth_date),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['catalog-departments'],
    queryFn: () => appClient.catalogs.listDepartments(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['catalog-units'],
    queryFn: () => appClient.catalogs.listUnits(),
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nome Completo</Label>
        <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="Nome do colaborador" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="email@macom.com.br"
            disabled={isEditMode}
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone/Ramal</Label>
          <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(91) 9999-9999" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Cargo</Label>
        <Input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} placeholder="Cargo do colaborador" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Departamento</Label>
          <Select
            value={form.department || '__none__'}
            onValueChange={(value) => setForm({ ...form, department: value === '__none__' ? '' : value })}
            disabled={isEditMode}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem departamento</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.key}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Select
            value={form.unit || '__none__'}
            onValueChange={(value) => setForm({ ...form, unit: value === '__none__' ? '' : value })}
            disabled={isEditMode}
          >
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem unidade</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.key}>
                  {unit.city || unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Data de Nascimento</Label>
        <Input type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} disabled={isEditMode} />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Salvando...' : 'Salvar Colaborador'}
      </Button>
    </form>
  );
}

