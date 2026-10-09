import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, errorMessage } from '@/api/client';
import { authApi, riderApi } from '@/api/endpoints';
import type { Delivery, Job, RiderSummary } from '@/api/types';
import { ActiveJobCard, JobCard } from '@/components/job-cards';
import { Banner, Button, Card, EmptyState, ErrorState, Icon, Loading, Row, Screen, Section, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentLocation } from '@/lib/location';
import { formatNaira } from '@/lib/money';
import { queryKeys } from '@/lib/query-client';
import { useRiderPosition } from '@/lib/use-location-stream';

const MAX_ECONOMY_BATCH = 3;

/** Mirrors the server rule: one standard job at a time, or up to 3 economy jobs batched. */
function canTake(job: Job, active: Delivery[]) {
  if (active.length === 0) return true;
  return (
    active.length < MAX_ECONOMY_BATCH &&
    job.deliveryMode === 'economy' &&
    active.every((d) => d.deliveryMode === 'economy')
  );
}

function OnlineSwitch({ summary }: { summary: RiderSummary }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const sharing = useRiderPosition((s) => s.sharing);
  const toggle = useMutation({
    mutationFn: async (online: boolean) => {
      if (!online) return riderApi.setOnline(false);
      const here = await currentLocation();
      if (!here) throw new ApiError('Turn on location to go online. Jobs are matched to where you are.', 400);
      return riderApi.setOnline(true, here);
    },
    onSuccess: (rider) => {
      queryClient.setQueryData<RiderSummary>(queryKeys.summary, (old) =>
        old ? { ...old, isOnline: rider.isOnline } : old,
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    },
  });
  const online = toggle.isPending ? !!toggle.variables : summary.isOnline;

  return (
    <Card tone={online ? 'success' : 'surface'}>
      <Row style={styles.between}>
        <View style={styles.flex}>
          <Text variant="heading">{online ? 'You’re online' : 'You’re offline'}</Text>
          <Text variant="caption" color="text">
            {online
              ? sharing
                ? 'Finding jobs near you. Your location is shared while the app is open.'
                : 'Finding jobs near you.'
              : 'Go online to get delivery jobs.'}
          </Text>
        </View>
        <Switch
          value={online}
          onValueChange={(v) => toggle.mutate(v)}
          disabled={toggle.isPending}
          trackColor={{ true: theme.success, false: theme.border }}
          accessibilityLabel={online ? 'Go offline' : 'Go online'}
        />
      </Row>
      {toggle.error && <Banner tone="danger" text={errorMessage(toggle.error)} />}
    </Card>
  );
}

/** Shown until the rider checklist is done; the server refuses to go online before that. */
function SetupPrompt() {
  const onboarding = useQuery({ queryKey: queryKeys.onboarding, queryFn: authApi.onboarding });
  const left = onboarding.data?.steps.filter((s) => s.required && !s.done).length ?? 0;
  if (!onboarding.data || left === 0) return null;
  return (
    <Card tone="warning">
      <Row>
        <Icon name="checklist" color="warning" />
        <Text variant="heading" style={styles.flex}>
          {left} step{left > 1 ? 's' : ''} before your first delivery
        </Text>
      </Row>
      <Text variant="body">Verify your identity, add your vehicle, take the short safety training and add your bank.</Text>
      <Button title="Continue setup" onPress={() => router.push('/setup')} />
    </Card>
  );
}

function JobsBody() {
  const summary = useQuery({ queryKey: queryKeys.summary, queryFn: riderApi.summary });
  const online = summary.data?.isOnline ?? false;
  const active = useQuery({
    queryKey: queryKeys.deliveries('active'),
    queryFn: () => riderApi.deliveries('active'),
    refetchInterval: online ? 30_000 : false,
  });
  const jobs = useQuery({
    queryKey: queryKeys.jobs,
    queryFn: riderApi.jobs,
    enabled: online,
    // Sockets announce new jobs; the poll is a safety net for flaky networks.
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
  const locationError = useRiderPosition((s) => s.error);

  if (summary.isLoading) return <Loading />;
  if (summary.error || !summary.data) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;

  const s = summary.data;
  const mine = active.data?.data ?? [];
  const nearby = jobs.data ?? [];

  return (
    <Screen
      edges={[]}
      onRefresh={() => {
        void summary.refetch();
        void active.refetch();
        if (online) void jobs.refetch();
      }}
      refreshing={summary.isRefetching}>
      <Text variant="title">Jobs</Text>
      <SetupPrompt />
      <OnlineSwitch summary={s} />
      {online && locationError && <Banner tone="warning" text={locationError} />}
      <Text variant="caption">
        Today: {s.todayDeliveries} deliver{s.todayDeliveries === 1 ? 'y' : 'ies'} · {formatNaira(s.todayEarningsKobo)}
      </Text>

      {mine.length > 0 && (
        <Section title={mine.length > 1 ? `Your deliveries (${mine.length})` : 'Your delivery'}>
          {mine.map((d) => (
            <ActiveJobCard key={d._id} delivery={d} />
          ))}
        </Section>
      )}

      {online ? (
        <Section title="Nearby jobs">
          {jobs.isLoading ? (
            <Loading />
          ) : jobs.error ? (
            <ErrorState error={jobs.error} onRetry={() => jobs.refetch()} />
          ) : nearby.length === 0 ? (
            <EmptyState
              icon="rider"
              title="No jobs nearby right now"
              body="Stay online. We’ll buzz you when a kitchen within 5 km has food to deliver."
            />
          ) : (
            nearby.map((job) => <JobCard key={job.orderId} job={job} disabled={!canTake(job, mine)} />)
          )}
          {nearby.length > 0 && mine.length > 0 && (
            <Text variant="caption">Finish your current delivery to take a standard job. Economy jobs can be batched.</Text>
          )}
        </Section>
      ) : (
        mine.length === 0 && (
          <EmptyState icon="power" title="You’re offline" body="Go online when you’re on your bike and ready to ride." />
        )
      )}
    </Screen>
  );
}

export default function JobsTab() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: theme.background }]}>
      <JobsBody />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  between: { justifyContent: 'space-between', gap: Spacing.two },
  flex: { flex: 1, gap: Spacing.half },
});
