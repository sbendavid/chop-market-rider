import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { authApi, riderApi } from '@/api/endpoints';
import { Banner, ErrorState, Icon, ListRow, Loading, Row, Screen, Section, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm, notify } from '@/lib/confirm';
import { formatLocalPhone } from '@/lib/phone';
import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';
import { VEHICLE_LABEL } from '@/lib/vehicle';

function AccountBody() {
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const rider = useQuery({ queryKey: queryKeys.me, queryFn: riderApi.me });
  const onboarding = useQuery({ queryKey: queryKeys.onboarding, queryFn: authApi.onboarding });
  const logoutAll = useMutation({ mutationFn: authApi.logoutAll });

  if (rider.isLoading) return <Loading />;
  if (rider.error || !rider.data) return <ErrorState error={rider.error} onRetry={() => rider.refetch()} />;
  const r = rider.data;
  const ready = onboarding.data?.complete ?? false;

  const onSignOut = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You’ll go offline and stop getting jobs on this phone.',
      confirmText: 'Sign out',
    });
    if (!ok) return;
    if (r.isOnline) {
      // Don't leave a ghost "online" rider that kitchens and customers wait on.
      try {
        await riderApi.setOnline(false);
      } catch (err) {
        notify('Can’t sign out yet', errorMessage(err));
        return;
      }
    }
    await signOut({ remote: true });
  };

  return (
    <Screen
      edges={[]}
      onRefresh={() => {
        void rider.refetch();
        void onboarding.refetch();
      }}
      refreshing={rider.isRefetching}>
      <View style={styles.header}>
        <Text variant="title">{user?.fullName || 'Your account'}</Text>
        <Row>
          <Icon name={ready ? 'check' : 'clock'} size={16} color={ready ? 'success' : 'warning'} />
          <Text variant="caption" color={ready ? 'success' : 'warning'}>
            {ready ? 'Ready to ride' : 'Setup not finished'}
          </Text>
          {r.ratingCount > 0 && (
            <Text variant="caption">
              · ★ {r.rating.toFixed(1)} ({r.ratingCount})
            </Text>
          )}
          <Text variant="caption">· {r.totalDeliveries} deliveries</Text>
        </Row>
      </View>

      <Section title="Riding">
        <View>
          {!ready && <ListRow title="Finish setup" subtitle="What’s left before you can go online" onPress={() => router.push('/setup')} />}
          <ListRow
            title="Vehicle"
            subtitle={`${VEHICLE_LABEL[r.vehicleType]}${r.plateNumber ? ` · ${r.plateNumber}` : ''}`}
            onPress={() => router.push('/vehicle')}
          />
          <ListRow title="Past deliveries" onPress={() => router.push('/history')} />
          <ListRow title="Safety & Trust-Lock refresher" onPress={() => router.push('/training')} />
        </View>
      </Section>

      <Section title="Account">
        <View>
          <ListRow title={user?.fullName || 'Your name'} subtitle={formatLocalPhone(user?.phoneNumber)} />
          {(user?.kycLevel ?? 0) < 1 && (
            <ListRow title="Verify your identity" subtitle="Required to ride and get paid" onPress={() => router.push('/kyc')} />
          )}
          <ListRow
            title="Sign out of other devices"
            subtitle={logoutAll.isSuccess ? 'Done. Only this phone is signed in.' : undefined}
            onPress={() => logoutAll.mutate()}
          />
          <ListRow title="Sign out" onPress={onSignOut} />
        </View>
      </Section>
      {logoutAll.error && <Banner tone="danger" text={errorMessage(logoutAll.error)} />}
      <Text variant="caption" align="center">
        Chop Market Rider {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}

export default function AccountTab() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <AccountBody />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.one },
});
