import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, X } from 'lucide-react';
import { Badge, Button, Skeleton } from '@macom/ui';
import { toast } from 'sonner';

import { appClient } from '@/api/client';

export default function ProfileRequestsSection() {
  const queryClient = useQueryClient();
  const [reviewingRequest, setReviewingRequest] = useState(null);

  const { data: profileChangeRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['profile-change-requests'],
    queryFn: () => appClient.entities.ProfileChangeRequest.list(),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }) => appClient.entities.ProfileChangeRequest.update(id, { status }),
    onMutate: ({ id }) => {
      setReviewingRequest(id);
    },
    onSuccess: (_savedRequest, variables) => {
      queryClient.setQueryData(['profile-change-requests'], (old = []) => (
        Array.isArray(old) ? old.filter((item) => item.id !== variables.id) : old
      ));
      queryClient.invalidateQueries({ queryKey: ['profile-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(variables.status === 'approved' ? 'Solicitacao aprovada.' : 'Solicitacao reprovada.');
      setReviewingRequest(null);
    },
    onError: () => {
      toast.error('Nao foi possivel analisar a solicitacao.');
      setReviewingRequest(null);
    },
  });

  const handleReviewRequest = (id, status) => {
    reviewMutation.mutate({ id, status });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold">Solicitacoes de perfil</h2>
          <p className="text-sm text-muted-foreground">Aprove ou reprove trocas de departamento e unidade.</p>
        </div>
        <Badge className="w-fit bg-primary/10 text-primary">
          {profileChangeRequests.length} pendente{profileChangeRequests.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {requestsLoading ? (
        <div className="space-y-3">
          {[1, 2].map((item) => <Skeleton key={item} className="h-28 rounded-xl" />)}
        </div>
      ) : profileChangeRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhuma solicitacao pendente.
        </div>
      ) : (
        <div className="space-y-3">
          {profileChangeRequests.map((request) => (
            <div key={request.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{request.collaborator_name || request.collaborator_email}</p>
                  <p className="text-xs text-muted-foreground">{request.collaborator_email}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => handleReviewRequest(request.id, 'rejected')}
                    disabled={reviewingRequest === request.id}
                  >
                    {reviewingRequest === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    Reprovar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => handleReviewRequest(request.id, 'approved')}
                    disabled={reviewingRequest === request.id}
                  >
                    {reviewingRequest === request.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Aprovar
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Departamento</p>
                  <p className="mt-1 text-muted-foreground">{request.current_department_name || '-'}</p>
                  <p className="mt-1 font-semibold text-foreground">{request.requested_department_name || '-'}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidade</p>
                  <p className="mt-1 text-muted-foreground">{request.current_unit_name || '-'}</p>
                  <p className="mt-1 font-semibold text-foreground">{request.requested_unit_name || '-'}</p>
                </div>
              </div>

              {request.note ? (
                <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-muted-foreground">{request.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
