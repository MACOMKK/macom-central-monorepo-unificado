import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { crmDataClient } from '@/api/crmDataClient';
import { companyFromUnit } from '@/lib/empresa';

export function deriveUnidadesFromResponsaveis(responsaveis = []) {
  const unique = new Map();
  responsaveis.forEach((responsavel) => {
    if (responsavel.unidade_id) {
      unique.set(responsavel.unidade_id, {
        id: responsavel.unidade_id,
        nome: responsavel.unidade_nome || companyFromUnit(responsavel.unidade_nome),
      });
    }
  });
  return [...unique.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

export function useUnidadesEmpresa() {
  const { data: responsaveis = [], isLoading } = useQuery({
    queryKey: ['crm-responsaveis'],
    queryFn: () => crmDataClient.entities.Responsavel.list(),
  });

  const unidades = useMemo(() => deriveUnidadesFromResponsaveis(responsaveis), [responsaveis]);

  const empresas = useMemo(() => {
    const unique = new Set();
    unidades.forEach((unidade) => unique.add(companyFromUnit(unidade.nome)));
    return [...unique];
  }, [unidades]);

  return { unidades, empresas, isLoading };
}
