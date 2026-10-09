import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useRef } from 'react';

import { ApiError } from '@/api/client';

/**
 * A money-moving mutation with an Idempotency-Key per attempt. The key is
 * reused when the outcome is unknown (network failure) or still running (409),
 * so a retry can never send money twice; any other answer is final and the
 * next attempt gets a fresh key.
 */
export function useIdempotentMutation<TData, TVars>(
  prefix: string,
  fn: (vars: TVars, idempotencyKey: string) => Promise<TData>,
  options: Omit<UseMutationOptions<TData, Error, TVars>, 'mutationFn'> = {},
) {
  const key = useRef<string | null>(null);
  return useMutation<TData, Error, TVars>({
    ...options,
    mutationFn: (vars) => {
      key.current ??= `${prefix}-${Crypto.randomUUID()}`;
      return fn(vars, key.current);
    },
    onSuccess: (...args) => {
      key.current = null;
      return options.onSuccess?.(...args);
    },
    onError: (err, ...rest) => {
      if (err instanceof ApiError && !err.isNetwork && err.status !== 409) key.current = null;
      return options.onError?.(err, ...rest);
    },
  });
}
