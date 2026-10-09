import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api/client';
import { riderApi } from '@/api/endpoints';
import type { RiderProfile, VehicleType } from '@/api/types';
import { Banner, Button, Chip, ErrorState, Loading, Row, Screen, Section, Text, TextField } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';
import { VEHICLE_LABEL } from '@/lib/vehicle';

const TYPES = Object.keys(VEHICLE_LABEL) as VehicleType[];
const PLATE = /^[A-Za-z0-9-]{5,10}$/;

function VehicleForm({ rider }: { rider: RiderProfile }) {
  const queryClient = useQueryClient();
  const [vehicleType, setVehicleType] = useState<VehicleType>(rider.vehicleType);
  const [plate, setPlate] = useState(rider.plateNumber ?? '');
  const needsPlate = vehicleType !== 'bicycle';
  const cleaned = plate.replace(/\s+/g, '').toUpperCase();
  const plateOk = !needsPlate || PLATE.test(cleaned);

  const save = useMutation({
    mutationFn: () => riderApi.update({ vehicleType, ...(cleaned ? { plateNumber: cleaned } : {}) }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding });
      router.back();
    },
  });

  return (
    <Screen footer={<Button title="Save" disabled={!plateOk} loading={save.isPending} onPress={() => save.mutate()} />}>
      <Text variant="body" color="textSecondary">
        Customers and kitchens see your vehicle and plate so they know who’s coming.
      </Text>
      <Section title="What do you ride?">
        <Row style={{ flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <Chip key={t} label={VEHICLE_LABEL[t]} selected={vehicleType === t} onPress={() => setVehicleType(t)} />
          ))}
        </Row>
      </Section>
      {needsPlate && (
        <TextField
          label="Plate number"
          placeholder="e.g. LAG123XY"
          autoCapitalize="characters"
          autoCorrect={false}
          value={plate}
          onChangeText={setPlate}
          maxLength={12}
          error={plate && !plateOk ? 'Enter the plate as shown, 5 to 10 letters and numbers' : null}
        />
      )}
      {save.error && <Banner tone="danger" text={errorMessage(save.error)} />}
    </Screen>
  );
}

export default function VehicleScreen() {
  const rider = useQuery({ queryKey: queryKeys.me, queryFn: riderApi.me });
  if (rider.isLoading) return <Loading />;
  if (rider.error || !rider.data) return <ErrorState error={rider.error} onRetry={() => rider.refetch()} />;
  return <VehicleForm rider={rider.data} />;
}
