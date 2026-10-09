import { create } from 'zustand';

import { tokens } from '@/api/client';
import { authApi } from '@/api/endpoints';
import type { AuthResult, User } from '@/api/types';

import { queryClient } from './query-client';
import { closeSocket } from './socket';
import { secureStorage } from './storage';

const USER_KEY = 'cm.user';

type SessionState = {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  /** Restore the last session from the device. No network needed (fast cold start). */
  bootstrap: () => Promise<void>;
  signIn: (result: AuthResult) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  /** Local sign-out; `remote` also revokes the session on the server. */
  signOut: (opts?: { remote?: boolean }) => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  user: null,

  async bootstrap() {
    const [hasToken, cached] = await Promise.all([
      tokens.hasRefreshToken(),
      secureStorage.get(USER_KEY),
    ]);
    if (!hasToken || !cached) {
      set({ status: 'signedOut', user: null });
      return;
    }
    set({ status: 'signedIn', user: JSON.parse(cached) as User });
    // Refresh the profile in the background (picks up KYC level, name changes).
    authApi
      .me()
      .then((user) => get().setUser(user))
      .catch(() => undefined);
  },

  async signIn(result) {
    await tokens.save(result);
    await secureStorage.set(USER_KEY, JSON.stringify(result.user));
    set({ status: 'signedIn', user: result.user });
  },

  async setUser(user) {
    await secureStorage.set(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  async signOut(opts) {
    if (opts?.remote) await authApi.logout().catch(() => undefined);
    closeSocket();
    await tokens.clear();
    await secureStorage.remove(USER_KEY);
    queryClient.clear();
    set({ status: 'signedOut', user: null });
  },
}));

// The API client calls this when the server rejects the refresh token
// (expired, revoked from another device, or account suspended).
tokens.setSessionExpiredHandler(() => {
  void useSession.getState().signOut();
});

export const useIsSignedIn = () => useSession((s) => s.status === 'signedIn');
