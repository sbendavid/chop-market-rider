import { router } from 'expo-router';
import type { ReactNode } from 'react';

import { EmptyState } from '@/components/ui';
import { useSession } from '@/lib/session';

/**
 * Browsing is open to everyone; orders, wallet and account need a phone login.
 * Signed-out users see a prompt instead of the screen.
 */
export function RequireAuth({
  children,
  title = 'Sign in to continue',
  body = 'Use your phone number. It takes less than a minute.',
}: {
  children: ReactNode;
  title?: string;
  body?: string;
}) {
  const status = useSession((s) => s.status);
  if (status === 'signedIn') return <>{children}</>;
  return (
    <EmptyState
      icon="lock"
      title={title}
      body={body}
      action={{ title: 'Continue with phone', onPress: () => router.push('/sign-in') }}
    />
  );
}
