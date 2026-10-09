import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Banner, Button, Card, Icon, Screen, Section, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-client';

const LESSONS: { title: string; points: string[] }[] = [
  {
    title: 'Ride safe',
    points: [
      'Wear your helmet every trip, fastened. Your passenger box is not a seat.',
      'Never use the phone while moving. Pull over to read a job or call.',
      'Don’t ride against traffic or on BRT lanes, even when you’re late.',
      'In heavy rain or flooding, stop somewhere safe. A late order beats an accident.',
    ],
  },
  {
    title: 'Look after the food',
    points: [
      'Check the bag against the item list before you leave the kitchen.',
      'Keep the bag sealed and upright in a clean delivery box. Never open it.',
      'Go straight to the customer. No personal stops with food on board.',
    ],
  },
  {
    title: 'Trust-Lock: the delivery code',
    points: [
      'Customers pay before cooking starts. The money waits safely until delivery.',
      'At the door, ask the customer for their 4-digit code and enter it in the app.',
      'The code releases your pay and the kitchen’s. Only enter it when the food is in their hands.',
      'No code, no handover. If they can’t find it, they can open their order in the Chop Market app.',
      'Never ask for cash or a transfer. Chop Market customers have already paid.',
    ],
  },
];

const QUIZ: { q: string; options: string[]; answer: number }[] = [
  {
    q: 'When do you enter the customer’s 4-digit code?',
    options: [
      'When I collect the food from the kitchen',
      'When the food is in the customer’s hands',
      'When I’m close to the customer’s address',
    ],
    answer: 1,
  },
  {
    q: 'The customer says they’ll pay you in cash instead. What do you do?',
    options: [
      'Take the cash and hand over the food',
      'Explain it’s already paid and ask for the delivery code',
      'Leave the food at the gate',
    ],
    answer: 1,
  },
  {
    q: 'A new job comes in while you’re riding. What do you do?',
    options: ['Read it at the next red light', 'Pull over somewhere safe first', 'Accept it quickly with one hand'],
    answer: 1,
  },
];

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.option, { borderColor: selected ? theme.primary : theme.border }]}>
      <Icon name={selected ? 'check' : 'circle'} size={20} color={selected ? 'primary' : 'textSecondary'} />
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function TrainingScreen() {
  const queryClient = useQueryClient();
  const onboarding = useQuery({ queryKey: queryKeys.onboarding, queryFn: authApi.onboarding });
  const alreadyDone = onboarding.data?.steps.some((s) => s.key === 'safety_training' && s.done) ?? false;
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [checked, setChecked] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const wrong = QUIZ.filter((item, i) => answers[i] !== item.answer).length;

  const complete = useMutation({
    mutationFn: () => authApi.completeStep('safety_training'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding });
      router.back();
    },
  });

  const submit = () => {
    setChecked(true);
    if (wrong === 0) complete.mutate();
  };

  return (
    <Screen
      footer={
        alreadyDone ? (
          <Button title="Done" variant="secondary" onPress={() => router.back()} />
        ) : (
          <Button title="Finish training" disabled={!allAnswered} loading={complete.isPending} onPress={submit} />
        )
      }>
      <Text variant="body" color="textSecondary">
        Three minutes that keep you safe and make sure you always get paid.
      </Text>
      {LESSONS.map((lesson) => (
        <Card key={lesson.title}>
          <Text variant="heading">{lesson.title}</Text>
          {lesson.points.map((p) => (
            <View key={p} style={styles.point}>
              <Icon name="check" size={18} color="success" />
              <Text variant="body" style={styles.flex}>
                {p}
              </Text>
            </View>
          ))}
        </Card>
      ))}

      {!alreadyDone &&
        QUIZ.map((item, qi) => (
          <Section key={item.q} title={`Question ${qi + 1}`}>
            <Text variant="bodyStrong">{item.q}</Text>
            {item.options.map((label, oi) => (
              <Option
                key={label}
                label={label}
                selected={answers[qi] === oi}
                onPress={() => {
                  setChecked(false);
                  setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)));
                }}
              />
            ))}
          </Section>
        ))}
      {checked && wrong > 0 && (
        <Banner
          tone="warning"
          text={`${wrong} answer${wrong > 1 ? 's' : ''} not quite right. Read the Trust-Lock and safety points again and retry.`}
        />
      )}
      {complete.error && <Banner tone="danger" text={errorMessage(complete.error)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  point: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  option: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
    padding: Spacing.three,
    borderWidth: 1.5,
    borderRadius: Radius.md,
  },
});
