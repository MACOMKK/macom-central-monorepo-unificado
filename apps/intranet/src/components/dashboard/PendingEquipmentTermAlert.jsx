import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileSignature } from 'lucide-react';

import { appClient } from '@/api/client';

export default function PendingEquipmentTermAlert() {
  const { data: terms = [] } = useQuery({
    queryKey: ['possession-terms'],
    queryFn: () => appClient.possessionTerms.list(),
  });

  if (terms.length === 0) return null;

  return (
    <Link
      to="/termo-equipamento"
      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm transition-colors hover:bg-amber-100"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <FileSignature className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {terms.length === 1
            ? 'Voce tem 1 termo de equipamento pendente de assinatura'
            : `Voce tem ${terms.length} termos de equipamento pendentes de assinatura`}
        </p>
        <p className="text-xs text-amber-700">Clique para revisar e assinar digitalmente.</p>
      </div>
    </Link>
  );
}
