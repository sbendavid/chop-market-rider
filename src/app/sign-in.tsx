import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Banner, Button, Icon, Row, Screen, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { toE164 } from '@/lib/phone';

export default function SignInScreen() {
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const e164 = toE164(phone);

  const request = useMutation({
    mutationFn: () => authApi.requestOtp({ phone: e164! }),
    onSuccess: (res) =>
      router.push({
        pathname: '/verify',
        params: { phone: e164!, resendIn: String(res.resendIn), devCode: res.devCode ?? '' },
      }),
  });

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          title="Send code"
          disabled={!e164}
          loading={request.isPending}
          onPress={() => request.mutate()}
        />
      }>
      <View style={styles.hero}>
        <Text variant="title">Deliver with Chop Market</Text>
        <Text variant="body" color="textSecondary">
          Sign in with your phone number. We’ll text you a 6-digit code.
        </Text>
      </View>
      <TextField
        label="Phone number"
        placeholder="0803 123 4567"
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        autoFocus
        value={phone}
        onChangeText={setPhone}
        onBlur={() => setTouched(true)}
        onSubmitEditing={() => e164 && request.mutate()}
        maxLength={17}
        error={touched && phone && !e164 ? 'Enter a valid Nigerian mobile number' : null}
        leading={<Text variant="bodyStrong">🇳🇬</Text>}
      />
      {request.error && <Banner tone="danger" text={errorMessage(request.error)} />}
      <Row style={styles.note}>
        <Icon name="shield" size={16} color="textSecondary" />
        <Text variant="caption" style={styles.flex}>
          By continuing you agree to our Terms and Privacy Policy. We use your number to sign you in
          and alert you to delivery jobs.
        </Text>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.two, marginTop: Spacing.three },
  note: { alignItems: 'flex-start' },
  flex: { flex: 1 },
});
