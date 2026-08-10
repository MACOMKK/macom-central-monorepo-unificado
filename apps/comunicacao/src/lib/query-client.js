import { QueryClient, keepPreviousData } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 90 * 1000,
      gcTime: 10 * 60 * 1000,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
