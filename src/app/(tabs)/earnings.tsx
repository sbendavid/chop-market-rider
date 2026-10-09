import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { riderApi, walletApi } from '@/api/endpoints';
import type { LedgerTxType, Payout, StatementEntry } from '@/api/types';
import { Button, Card, ErrorState, KeyValue, ListRow, Loading, Row, Screen, Section, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatNaira } from '@/lib/money';
import { queryKeys } from '@/lib/query-client';

const TX_LABELS: Record<LedgerTxType, string> = {
  wallet_funding: 'Money added',
  escrow_funding: 'Payment',
  escrow_release: 'Delivery earnings',
  escrow_refund: 'Refund',
  pending_release: 'Held earnings released',
  payout_initiated: 'Withdrawal',
  payout_settled: 'Withdrawal completed',
  payout_reversed: 'Withdrawal returned',
  adjustment: 'Adjustment',
};

const PAYOUT_STATUS: Record<Payout['status'], string> = {
  pending: 'Processing',
  processing: 'Processing',
  succeeded: 'Paid',
  failed: 'Failed, money returned',
  reversed: 'Reversed, money returned',
};

function Entry({ entry }: { entry: StatementEntry }) {
  const theme = useTheme();
  const credit = entry.amount > 0;
  return (
    <Row style={[styles.entry, { borderBottomColor: theme.border }]}>
      <View style={styles.flex}>
        <Text variant="body">{TX_LABELS[entry.type] ?? entry.type}</Text>
        <Text variant="caption">{new Date(entry.createdAt).toLocaleString()}</Text>
      </View>
      <Text variant="bodyStrong" color={credit ? 'success' : 'text'}>
        {credit ? '+' : ''}
        {formatNaira(entry.amount)}
      </Text>
    </Row>
  );
}

function EarningsBody() {
  const wallet = useQuery({ queryKey: queryKeys.wallet, queryFn: walletApi.summary });
  const summary = useQuery({ queryKey: queryKeys.summary, queryFn: riderApi.summary });
  const payouts = useQuery({ queryKey: queryKeys.payouts, queryFn: walletApi.payouts });
  const statement = useInfiniteQuery({
    queryKey: queryKeys.statement,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => walletApi.statement(pageParam),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  if (wallet.isLoading) return <Loading />;
  if (wallet.error || !wallet.data) return <ErrorState error={wallet.error} onRetry={() => wallet.refetch()} />;

  const w = wallet.data;
  const s = summary.data;
  const entries = statement.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen
      edges={[]}
      onRefresh={() => {
        void wallet.refetch();
        void summary.refetch();
        void statement.refetch();
        void payouts.refetch();
      }}
      refreshing={wallet.isRefetching}>
      <Text variant="title">Earnings</Text>
      <Card>
        <Text variant="caption">Available to withdraw</Text>
        <Text variant="title">{formatNaira(w.availableKobo)}</Text>
        <Button
          title="Withdraw to bank"
          icon="bank"
          disabled={w.availableKobo < 100_00}
          onPress={() => router.push(!w.payoutAccount ? '/bank' : !w.hasTransactionPin ? '/pin' : '/withdraw')}
        />
        <Text variant="caption">You’re paid for each delivery the moment the customer’s code is confirmed.</Text>
      </Card>

      {s && (
        <Card>
          <KeyValue label="Today" value={`${s.todayDeliveries} · ${formatNaira(s.todayEarningsKobo)}`} />
          <KeyValue label="All-time deliveries" value={String(s.totalDeliveries)} />
          <KeyValue
            label="Rating"
            value={s.rating != null ? `${s.rating.toFixed(1)} (${s.ratingCount})` : 'No ratings yet'}
          />
        </Card>
      )}

      <Section title="Bank account">
        <ListRow
          title={w.payoutAccount ? `${w.payoutAccount.bankName} · ${w.payoutAccount.accountNumber}` : 'Add a bank account'}
          subtitle={w.payoutAccount?.accountName ?? 'Withdrawals go to an account in your verified name'}
          onPress={() => router.push('/bank')}
        />
        <ListRow
          title={w.hasTransactionPin ? 'Change withdrawal PIN' : 'Set a withdrawal PIN'}
          onPress={() => router.push('/pin')}
        />
      </Section>

      {!!payouts.data?.length && (
        <Section title="Withdrawals">
          {payouts.data.slice(0, 5).map((p) => (
            <KeyValue
              key={p._id}
              label={`${new Date(p.createdAt).toLocaleDateString()} · ${PAYOUT_STATUS[p.status] ?? p.status}`}
              value={formatNaira(p.amountKobo)}
            />
          ))}
        </Section>
      )}

      <Section title="Activity">
        {entries.length === 0 ? (
          <Text variant="caption">Your delivery earnings will show here.</Text>
        ) : (
          entries.map((e) => <Entry key={e._id} entry={e} />)
        )}
        {statement.hasNextPage && (
          <Button title="Load more" variant="ghost" loading={statement.isFetchingNextPage} onPress={() => statement.fetchNextPage()} />
        )}
      </Section>
    </Screen>
  );
}

export default function EarningsTab() {
  const theme = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: theme.background }]}>
      <EarningsBody />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  entry: { paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
});
