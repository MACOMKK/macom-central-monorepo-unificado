import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Skeleton, Spinner } from '@macom/ui';
import { toast } from 'sonner';

import { appClient } from '@/api/client';

export default function NetworkAccessSection() {
  const queryClient = useQueryClient();
  const [ipCidr, setIpCidr] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const { data: trustedIpAccesses = [], isLoading } = useQuery({
    queryKey: ['trusted-ip-accesses'],
    queryFn: () => appClient.entities.TrustedIpAccess.list(),
  });

  const createMutation = useMutation({
    mutationFn: (value) => appClient.entities.TrustedIpAccess.create({ ip_cidr: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-ip-accesses'] });
      setIpCidr('');
      toast.success('IP liberado cadastrado.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Nao foi possivel cadastrar o IP.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => appClient.entities.TrustedIpAccess.delete(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trusted-ip-accesses'] });
      toast.success('IP removido.');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Nao foi possivel remover o IP.');
      setDeletingId(null);
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = ipCidr.trim();
    if (!value) return;
    createMutation.mutate(value);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Acesso por rede</h2>
          <p className="text-sm text-muted-foreground">IPs liberados entram automaticamente com acesso somente para visualizacao.</p>
        </div>
        <Badge className="w-fit bg-primary/10 text-primary">
          {trustedIpAccesses.length} IP{trustedIpAccesses.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground" htmlFor="trusted-ip-cidr">
            IP publico
          </label>
          <Input
            id="trusted-ip-cidr"
            value={ipCidr}
            onChange={(event) => setIpCidr(event.target.value)}
            placeholder="200.174.178.114"
            required
          />
        </div>
        <Button type="submit" disabled={createMutation.isPending} className="gap-2 sm:w-auto">
          {createMutation.isPending ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
          Cadastrar IP
        </Button>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => <Skeleton key={item} className="h-20 rounded-xl" />)}
        </div>
      ) : trustedIpAccesses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum IP liberado cadastrado.
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {trustedIpAccesses.map((access) => (
            <div key={access.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{access.ip_cidr}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {access.last_access_date
                    ? `Ultimo acesso em ${new Date(access.last_access_date).toLocaleString('pt-BR')}`
                    : 'Ainda sem acessos registrados'}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Remover IP"
                aria-label={`Remover IP ${access.ip_cidr}`}
                disabled={deletingId === access.id}
                onClick={() => deleteMutation.mutate(access.id)}
                className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
              >
                {deletingId === access.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
