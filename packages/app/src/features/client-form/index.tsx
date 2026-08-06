'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import {
  Body,
  Card,
  GhostButton,
  Input,
  Label,
  Muted,
  PrimaryButton,
  Row,
  Screen,
  Switch,
  Title,
  XStack,
  YStack,
} from '@gymos/ui';
import { useCreateClient } from '../../api';

const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary' },
  { value: 1.375, label: 'Light' },
  { value: 1.55, label: 'Moderate' },
  { value: 1.725, label: 'Very active' },
  { value: 1.9, label: 'Athlete' },
] as const;

/** New client intake — the minimum needed for safe target computation. */
export const ClientFormScreen = () => {
  const router = useRouter();
  const create = useCreateClient();
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'F' | 'M'>('M');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [activity, setActivity] = useState<number>(1.55);
  const [pregnant, setPregnant] = useState(false);

  const valid = name.trim().length > 0 && dob !== '' && heightCm !== '';

  const submit = () => {
    if (!valid || create.isPending) return;
    create.mutate(
      {
        name: name.trim(),
        sex,
        dob,
        ...(phone.trim() !== '' ? { phone: phone.trim() } : {}),
        heightCm: Number(heightCm),
        activityLevel: activity,
        ...(sex === 'F' && pregnant ? { medicalFlags: { pregnant: true } } : {}),
      },
      { onSuccess: (client) => router.replace(`/clients/${client.id}`) },
    );
  };

  return (
    <Screen>
      <Title>New client</Title>
      <Card gap="$3">
        <YStack gap="$1.5">
          <Label>Full name</Label>
          <Input value={name} onChangeText={setName} placeholder="e.g. Adnan Khan" size="$4" />
        </YStack>

        <YStack gap="$1.5">
          <Label>Sex</Label>
          <XStack gap="$2">
            {(['M', 'F'] as const).map((option) => (
              <GhostButton
                key={option}
                flex={1}
                onPress={() => setSex(option)}
                backgroundColor={sex === option ? '$primary' : 'transparent'}
                color={sex === option ? '$primaryFg' : '$color'}
              >
                {option === 'M' ? 'Male' : 'Female'}
              </GhostButton>
            ))}
          </XStack>
        </YStack>

        <YStack gap="$1.5">
          <Label>Date of birth</Label>
          <Input value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" size="$4" />
        </YStack>

        <YStack gap="$1.5">
          <Label>Height (cm)</Label>
          <Input
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="175"
            inputMode="numeric"
            size="$4"
          />
        </YStack>

        <YStack gap="$1.5">
          <Label>Phone (for WhatsApp)</Label>
          <Input
            value={phone}
            onChangeText={setPhone}
            placeholder="+92 3xx xxxxxxx"
            inputMode="tel"
            size="$4"
          />
        </YStack>

        <YStack gap="$1.5">
          <Label>Activity level</Label>
          <XStack gap="$2" flexWrap="wrap">
            {ACTIVITY_LEVELS.map((level) => (
              <GhostButton
                key={level.value}
                size="$3"
                onPress={() => setActivity(level.value)}
                backgroundColor={activity === level.value ? '$primary' : 'transparent'}
                color={activity === level.value ? '$primaryFg' : '$color'}
              >
                {level.label}
              </GhostButton>
            ))}
          </XStack>
        </YStack>

        {sex === 'F' ? (
          <Row>
            <Body>Currently pregnant</Body>
            <Switch checked={pregnant} onCheckedChange={(v) => setPregnant(v)} size="$3">
              <Switch.Thumb />
            </Switch>
          </Row>
        ) : null}

        {create.isError ? <Body color="$danger">{create.error.message}</Body> : null}
        <PrimaryButton disabled={!valid || create.isPending} onPress={submit}>
          {create.isPending ? 'Saving…' : 'Add client'}
        </PrimaryButton>
        <Muted fontSize={12}>
          Pregnancy and medical conditions activate safety gates: AI plan generation then requires
          your explicit, logged override.
        </Muted>
      </Card>
    </Screen>
  );
};
