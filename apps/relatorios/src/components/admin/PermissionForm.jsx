import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dataClient } from '@/api/dataClient';
import { Button, Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@macom/ui';
import { Save } from 'lucide-react';

export default function PermissionForm({ onSaved, onCancel }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedReports, setSelectedReports] = useState([]);

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => dataClient.entities.User.list(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['all-reports-for-perm'],
    queryFn: () => dataClient.entities.Report.list(),
  });

  const activeUsers = users.filter((user) => user.active !== false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const perms = selectedReports.map((reportId) => ({
        collaborator_id: selectedUser,
        report_id: reportId,
      }));
      return dataClient.entities.ReportPermission.bulkCreate(perms);
    },
    onSuccess: (createdPermissions) => onSaved?.(createdPermissions),
  });

  const toggleReport = (reportId) => {
    setSelectedReports((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Usuario *</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o usuario" />
          </SelectTrigger>
          <SelectContent>
            {activeUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email} {user.role === 'admin' ? '(Admin)' : user.role === 'manager' ? '(Gestor)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Relatórios *</Label>
        <div className="max-h-60 overflow-y-auto rounded-lg border p-3 space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relatorio cadastrado</p>
          ) : (
            reports.map((report) => (
              <label key={report.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted">
                <Checkbox
                  checked={selectedReports.includes(report.id)}
                  onCheckedChange={() => toggleReport(report.id)}
                />
                <div>
                  <p className="text-sm font-medium">{report.title}</p>
                  {report.unit_label ? <p className="text-xs text-muted-foreground">{report.unit_label}</p> : null}
                </div>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!selectedUser || selectedReports.length === 0 || saveMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
