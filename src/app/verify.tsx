import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Banner, Button, Screen, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { deviceInfo } from '@/lib/device';
import { formatLocalPhone } from '@/lib/phone';
import { useSession } from '@/lib/session';

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

export default function VerifyScreen() {
  const params = useLocalSearchParams<{ phone: string; resendIn?: string; devCode?: string }>();
  const signIn = useSession((s) => s.signIn);
  // Development servers return the code so you can test without SMS.
  const [code, setCode] = useState(__DEV__ ? (params.devCode ?? '') : '');
  const [left, setLeft] = useCountdown(Number(params.resendIn) || 60);

  const verify = useMutation({
    mutationFn: async (value: string) =>
      authApi.verifyOtp({ phone: params.phone, code: value, role: 'rider', device: await deviceInfo() }),
    // The sign-in screens are only mounted while signed out, so they close automatically.
    onSuccess: (result) => signIn(result),
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestOtp({ phone: params.phone }),
    onSuccess: (res) => {
      setLeft(res.resendIn);
      if (__DEV__ && res.devCode) setCode(res.devCode);
    },
  });

  const onChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    // Submit as soon as the 6th digit arrives (including SMS autofill).
    if (digits.length === 6 && !verify.isPending) verify.mutate(digits);
  };

  const pretty = formatLocalPhone(params.phone);

  return (
    <Screen
      footer={
        <Button
          title="Verify"
          disabled={code.length !== 6}
          loading={verify.isPending}
          onPress={() => verify.mutate(code)}
        />
      }>
      <View style={styles.hero}>
        <Text variant="title">Enter the code</Text>
        <Text variant="body" color="textSecondary">
          Sent by SMS to {pretty}
        </Text>
      </View>
      <TextField
        value={code}
        onChangeText={onChange}
        placeholder="••••••"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={6}
        accessibilityLabel="6-digit code"
        style={styles.code}
      />
      {verify.error && <Banner tone="danger" text={errorMessage(verify.error)} />}
      {resend.error && <Banner tone="danger" text={errorMessage(resend.error)} />}
      {left > 0 ? (
        <Text variant="caption" align="center">
          Resend code in {left}s
        </Text>
      ) : (
        <Button
          title="Resend code"
          variant="ghost"
          loading={resend.isPending}
          onPress={() => resend.mutate()}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.two, marginTop: Spacing.three },
  code: { fontSize: 28, letterSpacing: 12, textAlign: 'center' },
});
