import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api/client';
import { walletApi } from '@/api/endpoints';
import { Banner, Button, Loading, Screen, Text, TextField } from '@/components/ui';
import { queryKeys } from '@/lib/query-client';

const digits4 = (v: string) => v.replace(/\D/g, '').slice(0, 4);

/** A 4-digit PIN that every withdrawal must include, so a borrowed phone can't empty the wallet. */
export default function PinScreen() {
  const queryClient = useQueryClient();
  const wallet = useQuery({ queryKey: queryKeys.wallet, queryFn: walletApi.summary });
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const save = useMutation({
    mutationFn: () => walletApi.setPin({ pin, ...(wallet.data?.hasTransactionPin ? { currentPin: current } : {}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      router.back();
    },
  });

  if (wallet.isLoading) return <Loading />;
  const changing = !!wallet.data?.hasTransactionPin;
  const weak = /^(\d)\1{3}$/.test(pin) || ['1234', '4321', '0123'].includes(pin);
  const valid = pin.length === 4 && pin === confirmPin && !weak && (!changing || current.length === 4);

  return (
    <Screen footer={<Button title="Save PIN" disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} />}>
      <Text variant="body" color="textSecondary">
        You’ll enter this PIN every time you withdraw. Don’t share it, not even with Chop Market staff.
      </Text>
      {changing && (
        <TextField
          label="Current PIN"
          value={current}
          onChangeText={(v) => setCurrent(digits4(v))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
        />
      )}
      <TextField
        label="New PIN"
        value={pin}
        onChangeText={(v) => setPin(digits4(v))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        error={pin.length === 4 && weak ? 'Too easy to guess. Avoid 1234 or repeated digits.' : null}
      />
      <TextField
        label="Confirm new PIN"
        value={confirmPin}
        onChangeText={(v) => setConfirmPin(digits4(v))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        error={confirmPin.length === 4 && confirmPin !== pin ? 'PINs don’t match' : null}
      />
      {save.error && <Banner tone="danger" text={errorMessage(save.error)} />}
    </Screen>
  );
}
