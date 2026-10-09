import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { riderApi } from '@/api/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerForPush } from '@/lib/push';
import { queryClient, queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import { useLocationStream } from '@/lib/use-location-stream';
import { useRiderLive } from '@/lib/use-rider-live';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const status = useSession((s) => s.status);
  const bootstrap = useSession((s) => s.bootstrap);
  const needsName = useSession((s) => s.status === 'signedIn' && !s.user?.fullName);
  const signedIn = status === 'signedIn';
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
    if (status === 'signedIn') void registerForPush();
  }, [status]);

  useEffect(() => {
    if (needsName) router.push('/welcome');
  }, [needsName]);

  // Job and delivery banners open the Jobs tab, which shows the active job first.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate('/'));
    return () => sub.remove();
  }, []);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
    },
  };

  if (status === 'loading') return null;

  return (
    <QueryClientProvider client={queryClient}>
      {signedIn && <LiveRider />}
      <ThemeProvider value={theme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="job/[id]" options={{ title: 'Delivery' }} />
            <Stack.Screen name="setup" options={{ title: 'Get ready to ride' }} />
            <Stack.Screen name="vehicle" options={{ title: 'Your vehicle' }} />
            <Stack.Screen name="training" options={{ title: 'Safety & Trust-Lock' }} />
            <Stack.Screen name="kyc" options={{ title: 'Verify your identity' }} />
            <Stack.Screen name="bank" options={{ title: 'Bank account' }} />
            <Stack.Screen name="withdraw" options={{ title: 'Withdraw', presentation: 'modal' }} />
            <Stack.Screen name="pin" options={{ title: 'Withdrawal PIN', presentation: 'modal' }} />
            <Stack.Screen name="history" options={{ title: 'Past deliveries' }} />
            <Stack.Screen
              name="welcome"
              options={{ title: '', headerBackVisible: false, gestureEnabled: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="verify" options={{ title: 'Enter code' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Socket feed + location sharing, driven by the server's view of online/on-job. */
function LiveRider() {
  const summary = useQuery({ queryKey: queryKeys.summary, queryFn: riderApi.summary });
  const online = summary.data?.isOnline ?? false;
  useRiderLive(true, online);
  useLocationStream(online, (summary.data?.activeJobs ?? 0) > 0);
  return null;
}
