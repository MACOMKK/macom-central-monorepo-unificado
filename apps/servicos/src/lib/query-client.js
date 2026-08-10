import { QueryClient, keepPreviousData } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 90 * 1000,
    },
  },
});
