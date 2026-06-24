import { QueryClient } from '@tanstack/react-query';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const CACHE_POLICIES = [
  {
    queryKey: ['leads'],
    options: { staleTime: 45 * SECOND, gcTime: 10 * MINUTE },
  },
  {
    queryKey: ['clientes'],
    options: { staleTime: 60 * SECOND, gcTime: 10 * MINUTE },
  },
  {
    queryKey: ['eventos'],
    options: { staleTime: 30 * SECOND, gcTime: 10 * MINUTE },
  },
  {
    queryKey: ['eventos-resumo'],
    options: { staleTime: 30 * SECOND, gcTime: 10 * MINUTE },
  },
  {
    queryKey: ['historico-atendimento'],
    options: { staleTime: 30 * SECOND, gcTime: 10 * MINUTE },
  },
  {
    queryKey: ['crm-responsaveis'],
    options: { staleTime: 15 * MINUTE, gcTime: 30 * MINUTE },
  },
  {
    queryKey: ['crm-distribuicao'],
    options: { staleTime: 5 * MINUTE, gcTime: 30 * MINUTE },
  },
];

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			staleTime: 30 * SECOND,
			gcTime: 10 * MINUTE,
			retry: 1,
		},
	},
});

CACHE_POLICIES.forEach(({ queryKey, options }) => {
	queryClientInstance.setQueryDefaults(queryKey, options);
});
