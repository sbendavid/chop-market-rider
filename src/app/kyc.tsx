import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { authApi, kycApi } from '@/api/endpoints';
import type { KycVerification } from '@/api/types';
import { RequireAuth } from '@/components/require-auth';
import {
  Banner,
  Button,
  Card,
  Chip,
  Icon,
  Loading,
  Row,
  Screen,
  Section,
  Text,
  TextField,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-client';
import { useSession } from '@/lib/session';

/** Bump when the privacy notice text changes; the server records which version was accepted. */
const POLICY_VERSION = '2026-10-01';

function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkRow}>
      <View
        style={[
          styles.box,
          { borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? theme.primary : 'transparent' },
        ]}>
        {checked && <Icon name="check" size={16} color="onPrimary" />}
      </View>
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Front camera, then shrink to ~480px JPEG (~60-120 KB) before upload: cheap on data. */
async function takeSelfie(): Promise<{ uri: string; base64: string } | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Allow camera access to take your selfie.');
  const shot = await ImagePicker.launchCameraAsync({
    cameraType: ImagePicker.CameraType.front,
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (shot.canceled || !shot.assets[0]) return null;
  const ref = await ImageManipulator.manipulate(shot.assets[0].uri).resize({ width: 480 }).renderAsync();
  const out = await ref.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error('Could not process the photo. Please try again.');
  return { uri: out.uri, base64: out.base64 };
}

function Result({ result }: { result: KycVerification }) {
  if (result.status === 'verified') {
    return (
      <Card tone="success">
        <Text variant="heading">You’re verified</Text>
        <Text variant="body">You can now add your bank account and receive payouts.</Text>
        <Button title="Continue setup" onPress={() => router.back()} />
      </Card>
    );
  }
  if (result.status === 'pending' || result.status === 'manual_review') {
    return (
      <Card tone="warning">
        <Text variant="heading">We’re checking your details</Text>
        <Text variant="body">This can take up to a few hours. We’ll notify you when it’s done.</Text>
      </Card>
    );
  }
  return <Banner tone="danger" text={result.failureReason ?? 'We could not verify these details.'} />;
}

function KycForm() {
  const queryClient = useQueryClient();
  const setUser = useSession((s) => s.setUser);
  const status = useQuery({ queryKey: queryKeys.kyc, queryFn: kycApi.status });
  const [idType, setIdType] = useState<'NIN' | 'BVN'>('NIN');
  const [idNumber, setIdNumber] = useState('');
  const [consentId, setConsentId] = useState(false);
  const [consentFace, setConsentFace] = useState(false);
  const [selfie, setSelfie] = useState<{ uri: string; base64: string } | null>(null);
  const [selfieError, setSelfieError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      await kycApi.consent({
        purposes: ['identity_verification', 'biometric_processing'],
        policyVersion: POLICY_VERSION,
      });
      return kycApi.verify({ idType, idNumber, selfieImageBase64: selfie?.base64 ?? '' });
    },
    onSuccess: async (result) => {
      setSelfie(null); // don't keep the photo around
      void queryClient.invalidateQueries({ queryKey: queryKeys.kyc });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wallet });
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding });
      if (result.status === 'verified') await setUser(await authApi.me());
    },
  });

  const capture = async () => {
    setSelfieError(null);
    try {
      const shot = await takeSelfie();
      if (shot) setSelfie(shot);
    } catch (err) {
      setSelfieError(errorMessage(err));
    }
  };

  if (status.isLoading) return <Loading />;
  if (status.data && status.data.kycLevel >= 1) {
    return (
      <Screen>
        <Card tone="success">
          <Row>
            <Icon name="check" color="success" />
            <Text variant="heading">Identity verified</Text>
          </Row>
          {status.data.legalName && (
            <Text variant="body">
              {status.data.legalName.firstName} {status.data.legalName.lastName}
            </Text>
          )}
        </Card>
      </Screen>
    );
  }

  if (submit.data) {
    return (
      <Screen>
        <Result result={submit.data} />
        {submit.data.status === 'failed' && <Button title="Try again" onPress={() => submit.reset()} />}
      </Screen>
    );
  }

  const valid = /^\d{11}$/.test(idNumber) && consentId && consentFace && !!selfie;

  return (
    <Screen
      footer={<Button title="Verify" disabled={!valid} loading={submit.isPending} onPress={() => submit.mutate()} />}>
      <Text variant="body" color="textSecondary">
        Customers hand their food and their delivery code to you, and Nigerian law requires us to confirm who receives
        payments. It takes about a minute.
      </Text>

      <Section title="Your ID">
        <Row>
          <Chip label="NIN" selected={idType === 'NIN'} onPress={() => setIdType('NIN')} />
          <Chip label="BVN" selected={idType === 'BVN'} onPress={() => setIdType('BVN')} />
        </Row>
        <TextField
          value={idNumber}
          onChangeText={(v) => setIdNumber(v.replace(/\D/g, '').slice(0, 11))}
          placeholder={idType === 'NIN' ? '11-digit NIN' : '11-digit BVN'}
          keyboardType="number-pad"
          maxLength={11}
          hint={idType === 'NIN' ? 'Dial *346# to get your NIN.' : 'Dial *565*0# to get your BVN.'}
        />
      </Section>

      <Section title="Selfie">
        <Text variant="caption">Good light, no cap or glasses. We compare it with your ID photo.</Text>
        {selfie ? (
          <Row>
            <Image source={{ uri: selfie.uri }} style={styles.selfie} contentFit="cover" />
            <Button title="Retake" variant="secondary" onPress={capture} />
          </Row>
        ) : (
          <Button title="Take selfie" icon="account" variant="secondary" onPress={capture} />
        )}
        {selfieError && <Banner text={selfieError} />}
      </Section>

      <Section title="Your consent">
        <Checkbox
          checked={consentId}
          onPress={() => setConsentId((v) => !v)}
          label={`Check my ${idType} with the government database through our verification partner.`}
        />
        <Checkbox
          checked={consentFace}
          onPress={() => setConsentFace((v) => !v)}
          label="Use my selfie once to match my face to my ID. It is not stored after the check."
        />
        <Text variant="caption">
          Your {idType} is stored encrypted and never shown in full. You can ask us to delete your data
          at any time.
        </Text>
      </Section>

      {submit.error && <Banner tone="danger" text={errorMessage(submit.error)} />}
    </Screen>
  );
}

export default function KycScreen() {
  return (
    <RequireAuth>
      <KycForm />
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  checkRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start', paddingVertical: Spacing.one },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfie: { width: 72, height: 72, borderRadius: Radius.md },
});
