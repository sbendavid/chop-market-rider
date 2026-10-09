import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiError } from '@/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data plans are expensive: don't refetch what we just fetched.
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, err) => {
        // Retry network blips, never client errors (4xx won't fix themselves).
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
});

// Refetch when the app returns to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}

export const queryKeys = {
  me: ['rider-me'] as const,
  onboarding: ['onboarding'] as const,
  summary: ['rider-summary'] as const,
  jobs: ['jobs'] as const,
  deliveries: (view: string) => ['deliveries', view] as const,
  deliveriesAll: ['deliveries'] as const,
  wallet: ['wallet'] as const,
  statement: ['statement'] as const,
  payouts: ['payouts'] as const,
  banks: ['banks'] as const,
  kyc: ['kyc'] as const,
};
