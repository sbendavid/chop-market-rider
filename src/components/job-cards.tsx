import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/client';
import { riderApi } from '@/api/endpoints';
import type { Delivery, Job, OrderStatus } from '@/api/types';
import { Banner, Button, Card, Icon, Row, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { notify } from '@/lib/confirm';
import { formatNaira } from '@/lib/money';
import { queryKeys } from '@/lib/query-client';
import { formatDistance } from '@/lib/trip';

const KITCHEN_STATE: Partial<Record<OrderStatus, string>> = {
  accepted: 'Kitchen accepted',
  preparing: 'Being prepared',
  ready_for_pickup: 'Food is ready',
};

/** Where an active job is up to, in the rider's words. */
export function deliveryStage(d: Delivery): { label: string; tone: 'warning' | 'success' | 'surface' } {
  if (d.status === 'picked_up') return { label: 'On the way to the customer', tone: 'success' };
  if (d.readyAt) return { label: 'Food is ready: go collect it', tone: 'success' };
  return { label: 'Head to the kitchen: food is being prepared', tone: 'warning' };
}

/** A nearby, unclaimed delivery. First rider to accept gets it. */
export function JobCard({ job, disabled }: { job: Job; disabled?: boolean }) {
  const queryClient = useQueryClient();
  const claim = useMutation({
    mutationFn: () => riderApi.claim(job.orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveriesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
      router.push({ pathname: '/job/[id]', params: { id: job.orderId } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
        notify('Job not available', err.message);
      }
    },
  });
  const ready = job.status === 'ready_for_pickup';

  return (
    <Card>
      <Row style={styles.between}>
        <Text variant="heading" style={styles.flex} numberOfLines={1}>
          {job.kitchen.name}
        </Text>
        <Text variant="heading" color="success">
          {formatNaira(job.payoutKobo)}
        </Text>
      </Row>
      <Text variant="caption" color={ready ? 'success' : 'textSecondary'}>
        {KITCHEN_STATE[job.status] ?? job.status}
        {job.deliveryMode === 'economy' ? ' · Economy (can batch up to 3)' : ''}
      </Text>
      <Stop icon="kitchen" title={job.kitchen.address ?? 'Kitchen'} meta={`${formatDistance(job.toPickupMeters)} away`} />
      <Stop
        icon="pin"
        title={job.dropoff.address ?? 'Customer'}
        meta={job.tripMeters ? `${formatDistance(job.tripMeters)} trip` : undefined}
      />
      {claim.error && !(claim.error instanceof ApiError && claim.error.status === 409) && (
        <Banner tone="danger" text={errorMessage(claim.error)} />
      )}
      <Button
        title={`Accept · earn ${formatNaira(job.payoutKobo)}`}
        loading={claim.isPending}
        disabled={disabled}
        onPress={() => claim.mutate()}
      />
    </Card>
  );
}

/** The rider's own job, summarised on the Jobs tab. */
export function ActiveJobCard({ delivery }: { delivery: Delivery }) {
  const stage = deliveryStage(delivery);
  return (
    <Card tone={stage.tone} onPress={() => router.push({ pathname: '/job/[id]', params: { id: delivery._id } })}>
      <Row style={styles.between}>
        <Text variant="heading" style={styles.flex}>
          #{delivery.ref} · {delivery.kitchen.name}
        </Text>
        <Icon name="chevron" color="textSecondary" />
      </Row>
      <Text variant="bodyStrong">{stage.label}</Text>
      <Text variant="caption" color="text">
        {delivery.itemCount} item{delivery.itemCount === 1 ? '' : 's'} for {delivery.customer.firstName} · earn{' '}
        {formatNaira(delivery.payoutKobo)}
      </Text>
    </Card>
  );
}

function Stop({ icon, title, meta }: { icon: 'kitchen' | 'pin'; title: string; meta?: string }) {
  return (
    <Row style={styles.stop}>
      <Icon name={icon} size={18} color="textSecondary" />
      <View style={styles.flex}>
        <Text variant="body" numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text variant="caption">{meta}</Text> : null}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  flex: { flex: 1 },
  stop: { alignItems: 'flex-start', gap: Spacing.two },
});
