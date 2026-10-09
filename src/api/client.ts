import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getDeviceId, platform } from '@/lib/device';
import { secureStorage } from '@/lib/storage';

import type { Envelope, Tokens } from './types';

/**
 * API origin: EXPO_PUBLIC_API_URL when set; in development, the machine
 * running Metro (so a phone on the same Wi-Fi reaches the local server).
 */
function resolveOrigin(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:5000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
}

export const API_ORIGIN = resolveOrigin();
const API_BASE = `${API_ORIGIN}/api/v1`;
const REFRESH_KEY = 'cm.refreshToken';
/** Generous for 3G; requests still fail fast enough to show a retry. */
const DEFAULT_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** No response at all: offline, DNS, timeout. Safe to retry with the same idempotency key. */
  get isNetwork() {
    return this.status === 0;
  }
}

// ---------------------------------------------------------------- tokens

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onSessionExpired: (() => void) | null = null;

export const tokens = {
  async save(t: Pick<Tokens, 'accessToken' | 'refreshToken'>) {
    accessToken = t.accessToken;
    await secureStorage.set(REFRESH_KEY, t.refreshToken);
  },
  async clear() {
    accessToken = null;
    await secureStorage.remove(REFRESH_KEY);
  },
  hasRefreshToken: async () => Boolean(await secureStorage.get(REFRESH_KEY)),
  /** Current access token, refreshing first if there isn't one yet. */
  async getAccessToken(): Promise<string | null> {
    return accessToken ?? refreshAccessToken();
  },
  setSessionExpiredHandler(fn: () => void) {
    onSessionExpired = fn;
  },
};

/**
 * Rotate the refresh token. Single-flight: concurrent 401s share one refresh,
 * because the server treats reuse of a rotated token as theft and revokes the session.
 */
function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await secureStorage.get(REFRESH_KEY);
      if (!refreshToken) return null;
      const res = await rawRequest<Tokens>('POST', '/auth/refresh-token', {
        body: { refreshToken },
      });
      await tokens.save(res);
      return res.accessToken;
    } catch (err) {
      // Only an explicit rejection (expired, revoked, suspended) ends the session.
      // Offline, rate-limited (429) or server errors: keep it and retry later.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await tokens.clear();
        onSessionExpired?.();
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ---------------------------------------------------------------- requests

type Query = Record<string, string | number | boolean | undefined | null>;

export type RequestOptions = {
  body?: unknown;
  query?: Query;
  /** Send the access token (default true). */
  auth?: boolean;
  /** Required by the server on payment endpoints. Reuse the same key when retrying. */
  idempotencyKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: Query) {
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function rawRequest<T>(
  method: string,
  path: string,
  opts: RequestOptions & { token?: string | null } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  opts.signal?.addEventListener('abort', () => controller.abort());

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Client-Platform': platform,
    'X-Device-Id': await getDeviceId(),
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted && !opts.signal?.aborted
        ? 'This is taking too long. Check your connection and try again.'
        : "You're offline. Check your connection and try again.",
      0,
      'NETWORK',
    );
  } finally {
    clearTimeout(timer);
  }

  const json = (await res.json().catch(() => null)) as
    | (Envelope<T> & { code?: string; details?: unknown })
    | null;
  if (!res.ok) {
    throw new ApiError(
      json?.message ?? `Something went wrong (${res.status})`,
      res.status,
      json?.code,
      json?.details,
    );
  }
  return json?.data as T;
}

/** Authenticated request with one transparent token refresh on 401. */
export async function request<T>(method: string, path: string, opts: RequestOptions = {}) {
  if (opts.auth === false) return rawRequest<T>(method, path, opts);

  const token = await tokens.getAccessToken();
  if (!token) throw new ApiError('Please sign in to continue', 401, 'SIGNED_OUT');
  try {
    return await rawRequest<T>(method, path, { ...opts, token });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    accessToken = null;
    const fresh = await refreshAccessToken();
    if (!fresh) throw err;
    return rawRequest<T>(method, path, { ...opts, token: fresh });
  }
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PUT', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};

/** Friendly message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong. Please try again.';
}
