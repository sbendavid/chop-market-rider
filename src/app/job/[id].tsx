import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { errorMessage } from '@/api/client';
import { deliveryApi, riderApi } from '@/api/endpoints';
import type { Delivery } from '@/api/types';
import { deliveryStage } from '@/components/job-cards';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  KeyValue,
  Loading,
  Row,
  Screen,
  Section,
  Text,
  TextField,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { haversineMeters } from '@/lib/geo';
import { confirm } from '@/lib/confirm';
import { formatNaira } from '@/lib/money';
import { queryKeys } from '@/lib/query-client';
import { callPhone, formatDistance, openDirections } from '@/lib/trip';
import { useRiderPosition } from '@/lib/use-location-stream';

function useRefreshAfterChange() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.deliveriesAll });
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
    void queryClient.invalidateQueries({ queryKey: queryKeys.statement });
  };
}

/** Straight-line distance from the rider to a stop, when both are known. */
function useDistanceTo(stop: { lat: number | null; lng: number | null }) {
  const position = useRiderPosition((s) => s.position);
  if (!position || stop.lat == null || stop.lng == null) return null;
  return haversineMeters(position, { lat: stop.lat, lng: stop.lng });
}

function StopCard({
  step,
  title,
  name,
  address,
  landmark,
  phone,
  phoneLabel,
  place,
  current,
}: {
  step: number;
  title: string;
  name: string;
  address: string | null;
  landmark?: string | null;
  phone: string | null;
  phoneLabel: string;
  place: { lat: number | null; lng: number | null };
  current: boolean;
}) {
  const meters = useDistanceTo(place);
  return (
    <Card tone={current ? 'surface' : undefined} style={!current && styles.dim}>
      <Text variant="caption">
        Step {step} · {title}
        {meters != null ? ` · ${formatDistance(meters)} away` : ''}
      </Text>
      <Text variant="heading">{name}</Text>
      {address ? <Text variant="body">{address}</Text> : null}
      {landmark ? (
        <Row style={styles.top}>
          <Icon name="pin" size={16} color="textSecondary" />
          <Text variant="body" color="textSecondary" style={styles.flex}>
            {landmark}
          </Text>
        </Row>
      ) : null}
      {current && (
        <Row>
          <Button
            title="Directions"
            icon="directions"
            variant="secondary"
            style={styles.flex}
            onPress={() => openDirections({ ...place, address })}
          />
          {phone ? (
            <Button
              title={phoneLabel}
              icon="phone"
              variant="secondary"
              style={styles.flex}
              onPress={() => callPhone(phone)}
            />
          ) : null}
        </Row>
      )}
    </Card>
  );
}

function Collect({ delivery }: { delivery: Delivery }) {
  const refresh = useRefreshAfterChange();
  const pickup = useMutation({
    mutationFn: async () => {
      if (!delivery.readyAt) {
        const ok = await confirm({
          title: 'Kitchen hasn’t marked it ready',
          message: 'Only continue if the sealed bag is already in your hands.',
          confirmText: 'I have the food',
        });
        if (!ok) return false;
      }
      await deliveryApi.pickedUp(delivery._id);
      return true;
    },
    onSuccess: (done) => {
      if (done) refresh();
    },
  });

  return (
    <Section title="Check the bag">
      {delivery.items.map((item) => (
        <Text key={item.dishName} variant="body">
          {item.quantity} × {item.dishName}
        </Text>
      ))}
      <Text variant="caption">
        Make sure there are {delivery.itemCount} item{delivery.itemCount === 1 ? '' : 's'} and the bag is sealed
        before you leave.
      </Text>
      {pickup.error && <Banner tone="danger" text={errorMessage(pickup.error)} />}
      <Button title="I’ve collected the food" icon="bag" loading={pickup.isPending} onPress={() => pickup.mutate()} />
    </Section>
  );
}

function Handover({ delivery, onDelivered }: { delivery: Delivery; onDelivered: () => void }) {
  const refresh = useRefreshAfterChange();
  const [code, setCode] = useState('');
  const confirmCode = useMutation({
    mutationFn: () => deliveryApi.confirm(delivery._id, code),
    onSuccess: () => {
      onDelivered();
      refresh();
    },
    onError: () => setCode(''),
  });

  return (
    <Section title="Hand over with Trust-Lock">
      <Text variant="body">
        Ask {delivery.customer.firstName} for their 4-digit delivery code. Enter it only when the food is in their hands:
        it releases your pay and the kitchen’s.
      </Text>
      <TextField
        placeholder="0000"
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        accessibilityLabel="Customer's delivery code"
      />
      {confirmCode.error && <Banner tone="danger" text={errorMessage(confirmCode.error)} />}
      <Button
        title="Confirm delivery"
        icon="lock"
        disabled={code.length !== 4}
        loading={confirmCode.isPending}
        onPress={() => confirmCode.mutate()}
      />
      <ShowQr delivery={delivery} />
      <Text variant="caption">
        Customer not answering? Call them. Never leave the food without their code or QR confirmation.
      </Text>
    </Section>
  );
}

/**
 * Fallback when the customer can't find their code: they scan this with their
 * phone camera and confirm on the web page it opens. Valid for 5 minutes.
 */
function ShowQr({ delivery }: { delivery: Delivery }) {
  const [open, setOpen] = useState(false);
  const qr = useMutation({ mutationFn: () => deliveryApi.qr(delivery._id) });

  if (!open) {
    return (
      <Button
        title="No code? Show a QR instead"
        variant="ghost"
        onPress={() => {
          setOpen(true);
          qr.mutate();
        }}
      />
    );
  }
  return (
    <Card>
      <Text variant="bodyStrong">Ask {delivery.customer.firstName} to scan this with their phone camera</Text>
      {qr.isPending && <Loading />}
      {qr.data && (
        <View style={styles.qr}>
          <QRCode value={qr.data.deepLink} size={220} quietZone={12} />
        </View>
      )}
      {qr.error && <Banner tone="danger" text={errorMessage(qr.error)} />}
      <Text variant="caption">
        They confirm on their phone once they have the food. This screen updates by itself. The QR expires after 5
        minutes.
      </Text>
      <Button title="New QR" variant="secondary" loading={qr.isPending} onPress={() => qr.mutate()} />
    </Card>
  );
}

/** After the job leaves the active list: delivered, or cancelled under the rider. */
function Outcome({ id, deliveredPayout }: { id: string; deliveredPayout: number | null }) {
  const history = useQuery({
    // Own key: the history screen caches this view as an infinite list.
    queryKey: [...queryKeys.deliveries('history'), 'latest'],
    queryFn: () => riderApi.deliveries('history'),
  });
  const past = history.data?.data.find((d) => d._id === id);
  const delivered = deliveredPayout != null || past?.status === 'delivered' || past?.status === 'completed';

  if (history.isLoading && deliveredPayout == null) return <Loading />;
  if (delivered) {
    return (
      <Screen footer={<Button title="Back to jobs" onPress={() => router.navigate('/')} />}>
        <Card tone="success">
          <Row>
            <Icon name="check" color="success" />
            <Text variant="heading" style={styles.flex}>
              Delivered
            </Text>
          </Row>
          <Text variant="body">
            You earned {formatNaira(deliveredPayout ?? past?.payoutKobo ?? 0)}. It’s in your wallet now.
          </Text>
        </Card>
      </Screen>
    );
  }
  if (past?.status === 'cancelled') {
    return (
      <Screen footer={<Button title="Back to jobs" onPress={() => router.navigate('/')} />}>
        <Banner
          tone="warning"
          text={`This order was cancelled${past.cancellationReason ? `: ${past.cancellationReason}` : ''}. Don’t collect or deliver it.`}
        />
      </Screen>
    );
  }
  return (
    <EmptyState
      icon="rider"
      title="Delivery not found"
      body="It may have been reassigned."
      action={{ title: 'Back to jobs', onPress: () => router.navigate('/') }}
    />
  );
}

export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const active = useQuery({
    queryKey: queryKeys.deliveries('active'),
    queryFn: () => riderApi.deliveries('active'),
    refetchInterval: 20_000,
  });
  const [deliveredPayout, setDeliveredPayout] = useState<number | null>(null);

  if (active.isLoading) return <Loading />;
  if (active.error) return <ErrorState error={active.error} onRetry={() => active.refetch()} />;

  const delivery = active.data?.data.find((d) => d._id === id);
  if (!delivery || deliveredPayout != null) return <Outcome id={id} deliveredPayout={deliveredPayout} />;

  const stage = deliveryStage(delivery);
  const collected = delivery.status === 'picked_up';
  const payout = delivery.payoutKobo;

  return (
    <Screen onRefresh={() => active.refetch()} refreshing={active.isRefetching}>
      <Card tone={stage.tone}>
        <Text variant="caption" color="text">
          Order #{delivery.ref}
        </Text>
        <Text variant="heading">{stage.label}</Text>
      </Card>

      <StopCard
        step={1}
        title="Collect"
        name={delivery.kitchen.name}
        address={delivery.kitchen.address}
        phone={delivery.kitchen.phone}
        phoneLabel="Call kitchen"
        place={delivery.kitchen}
        current={!collected}
      />
      {!collected && <Collect delivery={delivery} />}

      <StopCard
        step={2}
        title="Deliver"
        name={delivery.customer.firstName}
        address={delivery.dropoff.address}
        landmark={delivery.dropoff.landmark}
        phone={delivery.customer.phone}
        phoneLabel={`Call ${delivery.customer.firstName}`}
        place={delivery.dropoff}
        current={collected}
      />
      {collected && <Handover delivery={delivery} onDelivered={() => setDeliveredPayout(payout)} />}

      <View>
        <KeyValue label="You earn" value={formatNaira(payout)} strong />
        {delivery.tripMeters ? <KeyValue label="Trip" value={formatDistance(delivery.tripMeters)} /> : null}
      </View>
      <Text variant="caption">
        Phone numbers are shown only during this delivery, for this delivery. Don’t save or share them.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { alignItems: 'flex-start', gap: Spacing.one },
  dim: { opacity: 0.6 },
  qr: { alignSelf: 'center', backgroundColor: '#fff', padding: Spacing.two, borderRadius: 12 },
});
