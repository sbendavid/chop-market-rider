import { useInfiniteQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { riderApi } from '@/api/endpoints';
import type { Delivery, OrderStatus } from '@/api/types';
import { Button, EmptyState, ErrorState, Loading, Row, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatNaira } from '@/lib/money';
import { queryKeys } from '@/lib/query-client';

const STATUS_TEXT: Partial<Record<OrderStatus, string>> = {
  delivered: 'Delivered',
  completed: 'Delivered',
  disputed: 'Delivered · customer raised an issue',
  cancelled: 'Cancelled',
};

function PastDelivery({ d }: { d: Delivery }) {
  const theme = useTheme();
  const paid = d.status !== 'cancelled';
  const when = d.deliveredAt ?? d.updatedAt;
  return (
    <Row style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">
          #{d.ref} · {d.kitchen.name}
        </Text>
        <Text variant="caption">
          {new Date(when).toLocaleString()} · {STATUS_TEXT[d.status] ?? d.status}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          To {d.customer.firstName}, {d.dropoff.address}
        </Text>
      </View>
      <Text variant="bodyStrong" color={paid ? 'success' : 'textSecondary'}>
        {paid ? formatNaira(d.payoutKobo) : '—'}
      </Text>
    </Row>
  );
}

export default function HistoryScreen() {
  const history = useInfiniteQuery({
    queryKey: queryKeys.deliveries('history'),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => riderApi.deliveries('history', pageParam),
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });

  if (history.isLoading) return <Loading />;
  if (history.error) return <ErrorState error={history.error} onRetry={() => history.refetch()} />;
  const items = history.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Screen onRefresh={() => history.refetch()} refreshing={history.isRefetching}>
      {items.length === 0 ? (
        <EmptyState icon="history" title="No deliveries yet" body="Your finished deliveries and earnings show here." />
      ) : (
        items.map((d) => <PastDelivery key={d._id} d={d} />)
      )}
      {history.hasNextPage && (
        <Button
          title="Load more"
          variant="ghost"
          loading={history.isFetchingNextPage}
          onPress={() => history.fetchNextPage()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: Spacing.half },
  row: { paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
});
