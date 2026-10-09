import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/api/client';
import { walletApi } from '@/api/endpoints';
import { Banner, Button, Card, Chip, KeyValue, Loading, Row, Screen, Text, TextField } from '@/components/ui';
import { formatNaira, nairaToKobo } from '@/lib/money';
import { queryKeys } from '@/lib/query-client';
import { useIdempotentMutation } from '@/lib/use-idempotent-mutation';

const MIN_KOBO = 100_00;

export default function WithdrawScreen() {
  const queryClient = useQueryClient();
  const wallet = useQuery({ queryKey: queryKeys.wallet, queryFn: walletApi.summary });
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const kobo = nairaToKobo(amount);

  const withdraw = useIdempotentMutation(
    'payout',
    (_: void, key: string) => walletApi.withdraw(kobo!, pin, key),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
        void queryClient.invalidateQueries({ queryKey: queryKeys.payouts });
        void queryClient.invalidateQueries({ queryKey: queryKeys.statement });
      },
    },
  );

  if (wallet.isLoading || !wallet.data) return <Loading />;
  const w = wallet.data;
  const account = w.payoutAccount;

  if (withdraw.data) {
    return (
      <Screen footer={<Button title="Done" onPress={() => router.back()} />}>
        <Card tone="success">
          <Text variant="heading">{formatNaira(withdraw.data.amountKobo)} is on its way</Text>
          <Text variant="body">
            To {account?.bankName} · {account?.accountNumber}. Most transfers arrive within minutes.
          </Text>
          <Text variant="caption" color="text">
            Reference {withdraw.data.reference}
          </Text>
        </Card>
      </Screen>
    );
  }

  const tooMuch = kobo != null && kobo > w.availableKobo;
  const tooLittle = kobo != null && kobo < MIN_KOBO;
  const valid = kobo != null && !tooMuch && !tooLittle && pin.length === 4 && !!account;

  return (
    <Screen
      footer={
        <Button
          title={valid ? `Withdraw ${formatNaira(kobo)}` : 'Withdraw'}
          icon="lock"
          disabled={!valid}
          loading={withdraw.isPending}
          onPress={() => withdraw.mutate()}
        />
      }>
      <Card>
        <KeyValue label="Available" value={formatNaira(w.availableKobo)} strong />
        {account && <KeyValue label="To" value={`${account.bankName} · ${account.accountNumber}`} />}
      </Card>
      <TextField
        label="Amount (₦)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="5000"
        error={tooMuch ? 'More than your available balance' : tooLittle ? 'Minimum is ₦100' : null}
      />
      <Row>
        <Chip label="All" onPress={() => setAmount(String(Math.floor(w.availableKobo / 100)))} />
      </Row>
      <TextField
        label="Withdrawal PIN"
        value={pin}
        onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
      />
      {withdraw.error && <Banner tone="danger" text={errorMessage(withdraw.error)} />}
    </Screen>
  );
}
