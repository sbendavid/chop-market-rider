import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { authApi } from '@/api/endpoints';

import { getDeviceId, platform } from './device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register this phone for delivery jobs. Best effort: skipped on simulators,
 * on web, without an EAS project id, or when the user declines.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('jobs', {
        name: 'Delivery jobs',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted =
      current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await authApi.registerPushToken({ deviceId: await getDeviceId(), platform, pushToken });
  } catch {
    // Push is a convenience; the app polls/streams order status anyway.
  }
}
