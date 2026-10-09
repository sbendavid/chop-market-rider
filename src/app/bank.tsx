import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { ApiError, errorMessage } from '@/api/client';
import { walletApi } from '@/api/endpoints';
import type { Bank } from '@/api/types';
import { Banner, Button, Card, ErrorState, Icon, ListRow, Loading, Screen, Text, TextField } from '@/components/ui';
import { useSession } from '@/lib/session';
import { queryKeys } from '@/lib/query-client';

export default function BankScreen() {
  const queryClient = useQueryClient();
  const verified = useSession((s) => (s.user?.kycLevel ?? 0) >= 1);
  const banks = useQuery({ queryKey: queryKeys.banks, queryFn: walletApi.banks, staleTime: 24 * 60 * 60_000 });
  const [bank, setBank] = useState<Bank | null>(null);
  const [search, setSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (banks.data ?? []).filter((b) => !q || b.name.toLowerCase().includes(q)).slice(0, 30);
  }, [banks.data, search]);

  const save = useMutation({
    mutationFn: () => walletApi.setPayoutAccount({ bankCode: bank?.code ?? '', accountNumber }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding });
    },
  });
  const mismatch = save.error instanceof ApiError && save.error.code === 'PAYOUT_NAME_MISMATCH';

  if (!verified) {
    return (
      <Screen>
        <Card>
          <Text variant="bodyStrong">Verify your identity first</Text>
          <Text variant="body">Payouts only go to a bank account in your verified name.</Text>
          <Button title="Verify identity" icon="shield" onPress={() => router.replace('/kyc')} />
        </Card>
      </Screen>
    );
  }
  if (banks.isLoading) return <Loading />;
  if (banks.error) return <ErrorState error={banks.error} onRetry={() => banks.refetch()} />;

  if (save.data) {
    return (
      <Screen footer={<Button title="Done" onPress={() => router.back()} />}>
        <Card tone="success">
          <Icon name="check" color="success" />
          <Text variant="heading">{save.data.accountName}</Text>
          <Text variant="body">
            {save.data.bankName} · {save.data.accountNumber}
          </Text>
          <Text variant="caption" color="text">
            Withdrawals will be sent to this account.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title="Save account"
          disabled={!bank || !/^\d{10}$/.test(accountNumber)}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
      }>
      {bank ? (
        <ListRow title={bank.name} subtitle="Tap to change bank" onPress={() => setBank(null)} />
      ) : (
        <>
          <TextField label="Bank" placeholder="Search your bank" value={search} onChangeText={setSearch} autoFocus />
          <View>
            {filtered.map((b) => (
              <ListRow key={b.code} title={b.name} onPress={() => setBank(b)} />
            ))}
          </View>
        </>
      )}
      {bank && (
        <TextField
          label="Account number (NUBAN)"
          value={accountNumber}
          onChangeText={(v) => setAccountNumber(v.replace(/\D/g, '').slice(0, 10))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="0123456789"
          autoFocus
          hint="We check the name on the account matches your verified ID."
        />
      )}
      {save.error && (
        <Banner
          tone="danger"
          text={mismatch ? 'This account isn’t in your verified name. Use an account that belongs to you.' : errorMessage(save.error)}
        />
      )}
    </Screen>
  );
}
