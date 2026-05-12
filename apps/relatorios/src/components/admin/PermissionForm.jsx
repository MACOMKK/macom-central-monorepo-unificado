import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { dataClient } from '@/api/dataClient';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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

  const activeUsers = users.filter(user => user.active !== false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = activeUsers.find(u => u.email === selectedUser);
      const perms = selectedReports.map(reportId => {
        const report = reports.find(r => r.id === reportId);
        return {
          user_email: selectedUser,
          user_name: user?.full_name || '',
          report_id: reportId,
          report_title: report?.title || '',
          unit_id: report?.unit_id || '',
          unit_name: report?.unit_name || '',
        };
      });
      return dataClient.entities.ReportPermission.bulkCreate(perms);
    },
    onSuccess: onSaved,
  });

  const toggleReport = (reportId) => {
    setSelectedReports(prev =>
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Usuário *</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o usuário" />
          </SelectTrigger>
          <SelectContent>
            {activeUsers.map(u => (
              <SelectItem key={u.email} value={u.email}>
                {u.full_name || u.email} {u.role === 'admin' ? '(Admin)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Relatórios *</Label>
        <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relatório cadastrado</p>
          ) : (
            reports.map(report => (
              <label key={report.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                <Checkbox
                  checked={selectedReports.includes(report.id)}
                  onCheckedChange={() => toggleReport(report.id)}
                />
                <div>
                  <p className="text-sm font-medium">{report.title}</p>
                  {report.unit_name && <p className="text-xs text-muted-foreground">{report.unit_name}</p>}
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
