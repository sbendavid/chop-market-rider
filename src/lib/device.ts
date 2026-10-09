import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { secureStorage } from './storage';

const DEVICE_ID_KEY = 'cm.deviceId';
let cached: string | null = null;

/** Stable per-install id: ties sessions, push tokens and biometric keys to this phone. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  cached = await secureStorage.get(DEVICE_ID_KEY);
  if (!cached) {
    cached = Crypto.randomUUID();
    await secureStorage.set(DEVICE_ID_KEY, cached);
  }
  return cached;
}

export const platform = (Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web') as
  | 'ios'
  | 'android'
  | 'web';

export async function deviceInfo() {
  return {
    deviceId: await getDeviceId(),
    platform,
    name: Device.modelName ?? undefined,
  };
}
