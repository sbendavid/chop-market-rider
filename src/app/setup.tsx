import { useQuery } from '@tanstack/react-query';
import { type Href, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { authApi } from '@/api/endpoints';
import { Button, Card, ErrorState, Icon, ListRow, Loading, Row, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { queryKeys } from '@/lib/query-client';

/** Where each onboarding step is completed. */
const STEP_SCREEN: Record<string, Href> = {
  kyc_verified: '/kyc',
  vehicle_details: '/vehicle',
  safety_training: '/training',
  payout_account: '/bank',
};

export default function SetupScreen() {
  const onboarding = useQuery({ queryKey: queryKeys.onboarding, queryFn: authApi.onboarding });

  if (onboarding.isLoading) return <Loading />;
  if (onboarding.error || !onboarding.data)
    return <ErrorState error={onboarding.error} onRetry={() => onboarding.refetch()} />;

  const steps = onboarding.data.steps;
  const done = steps.filter((s) => s.done).length;

  return (
    <Screen onRefresh={() => onboarding.refetch()} refreshing={onboarding.isRefetching}>
      <Text variant="body" color="textSecondary">
        {done} of {steps.length} done. Finish these and you can go online and start earning.
      </Text>
      <View>
        {steps.map((step) => {
          const target = STEP_SCREEN[step.key];
          return (
            <ListRow
              key={step.key}
              title={step.label}
              subtitle={step.done ? 'Done' : step.required ? 'Required' : 'Optional'}
              onPress={!step.done && target ? () => router.push(target) : undefined}
              right={
                <Icon name={step.done ? 'check' : 'circle'} size={22} color={step.done ? 'success' : 'textSecondary'} />
              }
            />
          );
        })}
      </View>
      {onboarding.data.complete && (
        <Card tone="success">
          <Row>
            <Icon name="check" color="success" />
            <Text variant="heading" style={styles.flex}>
              You’re ready to ride
            </Text>
          </Row>
          <Text variant="body">Go online from the Jobs tab when you’re on your bike.</Text>
          <Button title="Go to jobs" onPress={() => router.navigate('/')} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, marginLeft: Spacing.one },
});
