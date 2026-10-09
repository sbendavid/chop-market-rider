import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant = 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'code';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color, align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      // Respect the user's font size, but keep layouts intact on the largest setting.
      maxFontSizeMultiplier={1.6}
      style={[
        styles[variant],
        { color: theme[color ?? (variant === 'caption' ? 'textSecondary' : 'text')] },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  code: { fontSize: 40, lineHeight: 48, fontWeight: '700', fontFamily: Fonts.mono, letterSpacing: 10 },
});
