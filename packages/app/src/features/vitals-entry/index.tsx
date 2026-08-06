'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import {
  Body,
  Card,
  Input,
  Label,
  LoadingState,
  Muted,
  PrimaryButton,
  Row,
  Screen,
  Title,
  YStack,
} from '@gymos/ui';
import { useRecordVitals, useVitals } from '../../api';

type Field = {
  key: string;
  label: string;
  unit: string;
  priorKey:
    | 'weightKg'
    | 'bodyFatPct'
    | 'waistCm'
    | 'chestCm'
    | 'hipCm'
    | 'armCm'
    | 'thighCm'
    | 'restingHr'
    | 'bpSystolic'
    | 'bpDiastolic';
};

const FIELDS: Field[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg', priorKey: 'weightKg' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%', priorKey: 'bodyFatPct' },
  { key: 'waistCm', label: 'Waist', unit: 'cm', priorKey: 'waistCm' },
  { key: 'chestCm', label: 'Chest', unit: 'cm', priorKey: 'chestCm' },
  { key: 'hipCm', label: 'Hip', unit: 'cm', priorKey: 'hipCm' },
  { key: 'armCm', label: 'Arm', unit: 'cm', priorKey: 'armCm' },
  { key: 'thighCm', label: 'Thigh', unit: 'cm', priorKey: 'thighCm' },
  { key: 'restingHr', label: 'Resting HR', unit: 'bpm', priorKey: 'restingHr' },
  { key: 'bpSystolic', label: 'BP systolic', unit: 'mmHg', priorKey: 'bpSystolic' },
  { key: 'bpDiastolic', label: 'BP diastolic', unit: 'mmHg', priorKey: 'bpDiastolic' },
];

/** Fast one-screen vitals capture — prior values ghosted, numeric keypads. */
export const VitalsEntryScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const vitals = useVitals(clientId);
  const record = useRecordVitals(clientId);
  const [values, setValues] = useState<Record<string, string>>({});

  if (vitals.isPending) return <LoadingState />;

  const latest = vitals.data?.items ?? [];
  const priorOf = (key: Field['priorKey']): number | null => {
    for (const row of latest) {
      const value = row[key];
      if (value !== null) return value;
    }
    return null;
  };

  const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');
  const submit = () => {
    if (filled.length === 0 || record.isPending) return;
    const payload = Object.fromEntries(filled.map(([k, v]) => [k, Number(v)]));
    record.mutate(payload, { onSuccess: () => router.back() });
  };

  return (
    <Screen>
      <Title>Record vitals</Title>
      <Muted>Fill only what you measured — history is never overwritten.</Muted>
      <Card gap="$3">
        {FIELDS.map((field) => {
          const prior = priorOf(field.priorKey);
          return (
            <YStack key={field.key} gap="$1">
              <Row>
                <Label>{field.label}</Label>
                <Muted fontSize={12}>
                  {prior !== null ? `last: ${prior} ${field.unit}` : field.unit}
                </Muted>
              </Row>
              <Input
                value={values[field.key] ?? ''}
                onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))}
                placeholder={prior !== null ? String(prior) : '—'}
                inputMode="decimal"
                size="$4"
                aria-label={field.label}
              />
            </YStack>
          );
        })}
        {record.isError ? <Body color="$danger">{record.error.message}</Body> : null}
        <PrimaryButton disabled={filled.length === 0 || record.isPending} onPress={submit}>
          {record.isPending
            ? 'Saving…'
            : `Save ${filled.length || ''} measurement${filled.length === 1 ? '' : 's'}`}
        </PrimaryButton>
      </Card>
    </Screen>
  );
};
