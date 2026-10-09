import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  trailing,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const palette = {
    primary: { bg: theme.primary, pressed: theme.primaryPressed, fg: 'onPrimary' as const, border: theme.primary },
    secondary: { bg: theme.surface, pressed: theme.border, fg: 'text' as const, border: theme.border },
    ghost: { bg: 'transparent', pressed: theme.surface, fg: 'primary' as const, border: 'transparent' },
    danger: { bg: theme.dangerSoft, pressed: theme.border, fg: 'danger' as const, border: theme.dangerSoft },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? palette.pressed : palette.bg, borderColor: palette.border },
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme[palette.fg]} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={18} color={palette.fg} />}
          <Text variant="bodyStrong" color={palette.fg} numberOfLines={1}>
            {title}
          </Text>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  inactive: { opacity: 0.55 },
});
