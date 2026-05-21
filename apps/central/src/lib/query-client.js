import { QueryCache, QueryClient, MutationCache } from '@tanstack/react-query';

import { supabase } from '@macom/api-client/supabaseClient';

let signingOutPromise = null;

function isAuthError(error) {
	if (!error) return false;
	const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
	return (
		error?.status === 401 ||
		error?.code === 'auth_required' ||
		message.includes('sessao expirada') ||
		message.includes('nao autenticado') ||
		message.includes('unauthorized')
	);
}

async function handleAuthError(error) {
	if (!isAuthError(error) || !supabase) {
		return;
	}

	if (!signingOutPromise) {
		signingOutPromise = supabase.auth.signOut()
			.catch(() => null)
			.finally(() => {
				signingOutPromise = null;
			});
	}

	await signingOutPromise;
}

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: handleAuthError,
	}),
	mutationCache: new MutationCache({
		onError: handleAuthError,
	}),
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
