import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnMount: false,
			refetchOnReconnect: false,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
