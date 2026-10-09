import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Banner, Button, Screen, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const setUser = useSession((s) => s.setUser);
  const valid = name.trim().length >= 2;

  const save = useMutation({
    mutationFn: async () => {
      await authApi.updateProfile({ fullName: name.trim() });
      return authApi.me();
    },
    onSuccess: async (user) => {
      await setUser(user);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
  });

  return (
    <Screen
      footer={
        <Button title="Continue" disabled={!valid} loading={save.isPending} onPress={() => save.mutate()} />
      }>
      <View style={styles.hero}>
        <Text variant="title">Welcome to Chop Market</Text>
        <Text variant="body" color="textSecondary">
          Your full name, as on your ID. Customers and kitchens see only your first name.
        </Text>
      </View>
      <TextField
        label="Your name"
        placeholder="e.g. Tolu Adebayo"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        autoFocus
        maxLength={80}
        onSubmitEditing={() => valid && save.mutate()}
      />
      {save.error && <Banner tone="danger" text={errorMessage(save.error)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: Spacing.two, marginTop: Spacing.three },
});
