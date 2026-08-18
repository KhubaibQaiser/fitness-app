'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'solito/navigation';
import {
  Body,
  Card,
  Check,
  FormField,
  FormSection,
  GhostButton,
  Muted,
  PageHeader,
  PrimaryButton,
  StickyFormFooter,
  useFocusChain,
  XStack,
  YStack,
} from '@gymos/ui';
import { useRecordVitals, useVitals } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { VitalsEntrySkeleton } from './vitals-entry-skeleton';

type FieldKey =
  | 'weightKg'
  | 'bodyFatPct'
  | 'waistCm'
  | 'chestCm'
  | 'hipCm'
  | 'armLeftCm'
  | 'armRightCm'
  | 'thighLeftCm'
  | 'thighRightCm'
  | 'restingHr'
  | 'bpSystolic'
  | 'bpDiastolic';

type Field = { key: FieldKey; label: string; unit: string };

const BODY: Field[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%' },
];

const MEASURE: Field[] = [
  { key: 'waistCm', label: 'Waist', unit: 'cm' },
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'hipCm', label: 'Hip', unit: 'cm' },
];

const BILATERAL: [Field, Field][] = [
  [
    { key: 'armLeftCm', label: 'Arm left', unit: 'cm' },
    { key: 'armRightCm', label: 'Arm right', unit: 'cm' },
  ],
  [
    { key: 'thighLeftCm', label: 'Thigh left', unit: 'cm' },
    { key: 'thighRightCm', label: 'Thigh right', unit: 'cm' },
  ],
];

const VITALS: Field[] = [
  { key: 'restingHr', label: 'Resting HR', unit: 'bpm' },
  { key: 'bpSystolic', label: 'BP systolic', unit: 'mmHg' },
  { key: 'bpDiastolic', label: 'BP diastolic', unit: 'mmHg' },
];

const FIELD_ORDER: FieldKey[] = [
  ...BODY.map((field) => field.key),
  ...MEASURE.map((field) => field.key),
  ...BILATERAL.flatMap(([left, right]) => [left.key, right.key]),
  ...VITALS.map((field) => field.key),
];

/** Fast vitals capture — sectioned, prior values as hints, field-level errors. */
export const VitalsEntryScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const vitals = useVitals(clientId);
  const record = useRecordVitals(clientId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const submit = useCallback(() => {
    const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');
    if (filled.length === 0 || record.isPending) return;
    const next: Record<string, string> = {};
    for (const [k, v] of filled) {
      const n = Number(v);
      if (!Number.isFinite(n)) next[k] = 'Enter a valid number';
      else if (n <= 0) next[k] = 'Must be greater than zero';
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;
    const payload = Object.fromEntries(filled.map(([k, v]) => [k, Number(v)]));
    record.mutate(payload, { onSuccess: () => setSaved(true) });
  }, [record, values]);

  const chain = useFocusChain(FIELD_ORDER, { onSubmit: submit });

  if (vitals.isPending) {
    return <VitalsEntrySkeleton />;
  }

  if (saved) {
    return (
      <AppScreen>
        <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" paddingVertical="$8">
          <YStack
            width={72}
            height={72}
            borderRadius={999}
            backgroundColor="$successMuted"
            alignItems="center"
            justifyContent="center"
          >
            <Check size={32} color="$success" />
          </YStack>
          <Body fontFamily="$heading" fontWeight="800" fontSize={20}>
            Vitals saved
          </Body>
          <Muted textAlign="center">
            History was appended. Prior readings were not overwritten.
          </Muted>
          <PrimaryButton onPress={() => router.back()}>Back</PrimaryButton>
        </YStack>
      </AppScreen>
    );
  }

  const latest = vitals.data?.items ?? [];
  const priorOf = (key: FieldKey): number | null => {
    for (const row of latest) {
      const value = row[key];
      if (value !== null) return value;
    }
    return null;
  };

  const filled = Object.entries(values).filter(([, v]) => v.trim() !== '');

  const renderField = (field: Field) => {
    const prior = priorOf(field.key);
    return (
      <FormField
        key={field.key}
        label={field.label}
        unit={field.unit}
        value={values[field.key] ?? ''}
        onChangeText={(text) => {
          setValues((v) => ({ ...v, [field.key]: text }));
          setFieldErrors((e) => {
            const { [field.key]: _, ...rest } = e;
            return rest;
          });
        }}
        placeholder={prior !== null ? `Last: ${prior}` : '-'}
        inputMode="decimal"
        hint={prior !== null ? `Previous: ${prior} ${field.unit}` : null}
        error={fieldErrors[field.key] ?? null}
        {...chain.bind(field.key)}
      />
    );
  };

  const renderFields = (fields: Field[]) => fields.map(renderField);

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <GhostButton flex={1} onPress={() => router.back()}>
            Cancel
          </GhostButton>
          <PrimaryButton
            flex={1}
            disabled={filled.length === 0 || record.isPending}
            onPress={submit}
          >
            {record.isPending
              ? 'Saving…'
              : `Save ${filled.length || ''} measurement${filled.length === 1 ? '' : 's'}`}
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <PageHeader
        title="Record vitals"
        subtitle="Fill only what you measured. History is never overwritten."
      />
      {chain.toolbar}
      <Card gap="$4">
        <FormSection title="Body composition">{renderFields(BODY)}</FormSection>
      </Card>
      <Card gap="$4">
        <FormSection title="Circumferences">
          {renderFields(MEASURE)}
          {BILATERAL.map(([left, right]) => (
            <XStack key={left.key} gap="$3" width="100%">
              <YStack flex={1}>{renderField(left)}</YStack>
              <YStack flex={1}>{renderField(right)}</YStack>
            </XStack>
          ))}
        </FormSection>
      </Card>
      <Card gap="$4">
        <FormSection title="Cardio">{renderFields(VITALS)}</FormSection>
      </Card>
      {record.isError ? (
        <Body color="$danger" role="alert">
          {record.error.message}
        </Body>
      ) : null}
      <Muted fontSize={12}>Empty fields are skipped. Prior values are never overwritten.</Muted>
    </AppScreen>
  );
};
