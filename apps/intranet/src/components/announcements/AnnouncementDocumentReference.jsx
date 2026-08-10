import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileText } from 'lucide-react';

import { appClient } from '@/api/client';
import { Button, Spinner } from '@macom/ui';

function getErrorMessage(error, fallback) {
  if (!error) return fallback;
  return error instanceof Error ? error.message : fallback;
}

function DocumentChip({ document, onError }) {
  const openMutation = useMutation({
    mutationFn: async () => {
      const results = await appClient.entities.Document.filter({ id: document.id });
      const found = Array.isArray(results) ? results[0] : null;
      if (!found?.file_url) {
        throw new Error('Você não tem permissão para abrir este documento.');
      }
      return found;
    },
    onSuccess: (found) => {
      window.open(found.file_url, '_blank', 'noopener,noreferrer');
    },
    onError: (error) => {
      onError?.(getErrorMessage(error, 'Não foi possível abrir o documento.'));
    },
  });

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{document.title}</p>
          <p className="text-xs text-muted-foreground">Documento relacionado</p>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 gap-2"
        disabled={openMutation.isPending}
        onClick={() => openMutation.mutate()}
      >
        {openMutation.isPending ? <Spinner size="sm" /> : null}
        Abrir documento
      </Button>
    </div>
  );
}

export default function AnnouncementDocumentReference({ documents, onError, maxVisible }) {
  if (!Array.isArray(documents) || documents.length === 0) return null;

  const hasLimit = Number.isInteger(maxVisible) && maxVisible > 0;
  const visibleDocuments = hasLimit ? documents.slice(0, maxVisible) : documents;
  const hiddenCount = documents.length - visibleDocuments.length;

  return (
    <div className="mt-3 space-y-2">
      {visibleDocuments.map((document) => (
        <DocumentChip key={document.id} document={document} onError={onError} />
      ))}
      {hiddenCount > 0 ? (
        <p className="px-1 text-xs text-muted-foreground">
          +{hiddenCount} documento{hiddenCount > 1 ? 's' : ''}
        </p>
      ) : null}
    </div>
  );
}
