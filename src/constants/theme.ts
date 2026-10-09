import '@/global.css';

import { Platform } from 'react-native';

/**
 * Design tokens. Warm brand orange for actions; green is reserved for
 * money-is-safe moments (escrow, verified, delivered) so it keeps its meaning.
 */
export const Colors = {
  light: {
    text: '#1C1A17',
    textSecondary: '#6B655C',
    background: '#FFFFFF',
    surface: '#F6F3EE',
    border: '#E7E1D7',
    primary: '#E0570B',
    primaryPressed: '#B94608',
    onPrimary: '#FFFFFF',
    success: '#17794A',
    successSoft: '#E3F3EA',
    warning: '#9A5B00',
    warningSoft: '#FFF2DC',
    danger: '#C0262D',
    dangerSoft: '#FCE9EA',
  },
  dark: {
    text: '#F5F1EA',
    textSecondary: '#ADA597',
    background: '#121110',
    surface: '#1E1C19',
    border: '#34302A',
    primary: '#FF7A2F',
    primaryPressed: '#E0570B',
    onPrimary: '#1C1A17',
    success: '#4CC587',
    successSoft: '#163527',
    warning: '#F2B04A',
    warningSoft: '#3A2A10',
    danger: '#FF6B70',
    dangerSoft: '#3D1A1C',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** Comfortable thumb target on small Android phones. */
export const TouchTarget = 48;

export const MaxContentWidth = 720;
