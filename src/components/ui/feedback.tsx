import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';

export function Loading({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.primary} size="large" />
      {label && <Text variant="caption">{label}</Text>}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text variant="bodyStrong" align="center">
        {errorMessage(error)}
      </Text>
      {onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: { title: string; onPress: () => void };
}) {
  return (
    <View style={styles.center}>
      <Icon name={icon} size={40} color="textSecondary" />
      <Text variant="heading" align="center">
        {title}
      </Text>
      {body && (
        <Text variant="body" color="textSecondary" align="center">
          {body}
        </Text>
      )}
      {action && <Button title={action.title} onPress={action.onPress} />}
    </View>
  );
}

/** Inline message (errors, warnings, trust notes). */
export function Banner({
  tone = 'warning',
  icon,
  text,
}: {
  tone?: 'warning' | 'danger' | 'success';
  icon?: IconName;
  text: string;
}) {
  const theme = useTheme();
  const bg = { warning: theme.warningSoft, danger: theme.dangerSoft, success: theme.successSoft }[tone];
  const fg: ThemeColor = tone;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={18} color={fg} />}
      <Text variant="label" color={fg} style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.text : theme.surface,
          borderColor: selected ? theme.text : theme.border,
        },
      ]}>
      <Text variant="label" color={selected ? 'background' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Stepper({
  value,
  min = 0,
  onChange,
}: {
  value: number;
  min?: number;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  // Going below the minimum serving removes the line.
  const dec = () => onChange(value - 1 < min ? 0 : value - 1);
  return (
    <View style={[styles.stepper, { borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        onPress={dec}
        hitSlop={8}
        style={styles.stepBtn}>
        <Icon name="remove" size={18} color="primary" />
      </Pressable>
      <Text variant="bodyStrong" style={styles.stepValue}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        onPress={() => onChange(value + 1)}
        hitSlop={8}
        style={styles.stepBtn}>
        <Icon name="add" size={18} color="primary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    minHeight: 240,
  },
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    height: 40,
  },
  stepBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 24, textAlign: 'center' },
});
