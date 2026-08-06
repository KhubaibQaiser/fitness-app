'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import {
  Body,
  Card,
  FormField,
  FormSection,
  LoadingState,
  Muted,
  PageHeader,
  PrimaryButton,
} from '@gymos/ui';
import { useRecordVitals, useVitals } from '../../api';
import { AppScreen } from '../shell/app-screen';

type FieldKey =
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

type Field = { key: FieldKey; label: string; unit: string };

const BODY: Field[] = [
  { key: 'weightKg', label: 'Weight', unit: 'kg' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%' },
];

const MEASURE: Field[] = [
  { key: 'waistCm', label: 'Waist', unit: 'cm' },
  { key: 'chestCm', label: 'Chest', unit: 'cm' },
  { key: 'hipCm', label: 'Hip', unit: 'cm' },
  { key: 'armCm', label: 'Arm', unit: 'cm' },
  { key: 'thighCm', label: 'Thigh', unit: 'cm' },
];

const VITALS: Field[] = [
  { key: 'restingHr', label: 'Resting HR', unit: 'bpm' },
  { key: 'bpSystolic', label: 'BP systolic', unit: 'mmHg' },
  { key: 'bpDiastolic', label: 'BP diastolic', unit: 'mmHg' },
];

/** Fast vitals capture — sectioned, prior values as hints, field-level errors. */
export const VitalsEntryScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const vitals = useVitals(clientId);
  const record = useRecordVitals(clientId);
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (vitals.isPending) {
    return (
      <AppScreen>
        <LoadingState />
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

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    for (const [k, v] of filled) {
      const n = Number(v);
      if (!Number.isFinite(n)) next[k] = 'Enter a valid number';
      else if (n <= 0) next[k] = 'Must be greater than zero';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = () => {
    if (filled.length === 0 || record.isPending) return;
    if (!validate()) return;
    const payload = Object.fromEntries(filled.map(([k, v]) => [k, Number(v)]));
    record.mutate(payload, { onSuccess: () => router.back() });
  };

  const renderFields = (fields: Field[]) =>
    fields.map((field) => {
      const prior = priorOf(field.key);
      return (
        <FormField
          key={field.key}
          label={`${field.label} (${field.unit})`}
          value={values[field.key] ?? ''}
          onChangeText={(text) => {
            setValues((v) => ({ ...v, [field.key]: text }));
            setFieldErrors((e) => {
              const { [field.key]: _, ...rest } = e;
              return rest;
            });
          }}
          placeholder={prior !== null ? `Last: ${prior}` : '—'}
          inputMode="decimal"
          hint={prior !== null ? `Previous: ${prior} ${field.unit}` : null}
          error={fieldErrors[field.key] ?? null}
        />
      );
    });

  return (
    <AppScreen>
      <PageHeader
        title="Record vitals"
        subtitle="Fill only what you measured — history is never overwritten."
      />
      <Card gap="$5">
        <FormSection title="Body">{renderFields(BODY)}</FormSection>
        <FormSection title="Measurements">{renderFields(MEASURE)}</FormSection>
        <FormSection title="Cardio">{renderFields(VITALS)}</FormSection>
        {record.isError ? (
          <Body color="$danger" role="alert">
            {record.error.message}
          </Body>
        ) : null}
        <PrimaryButton disabled={filled.length === 0 || record.isPending} onPress={submit}>
          {record.isPending
            ? 'Saving…'
            : `Save ${filled.length || ''} measurement${filled.length === 1 ? '' : 's'}`}
        </PrimaryButton>
        <Muted fontSize={12}>Empty fields are skipped. Prior values are never overwritten.</Muted>
      </Card>
    </AppScreen>
  );
};
