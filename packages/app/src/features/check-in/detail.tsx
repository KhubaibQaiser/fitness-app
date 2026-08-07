'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Verdict } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  ErrorState,
  FormField,
  GhostButton,
  LoadingState,
  Muted,
  PageHeader,
  PrimaryButton,
  Row,
  SectionTitle,
  XStack,
  YStack,
} from '@gymos/ui';
import { useApplyAdjustment, useCheckIn, useUpdateCheckIn } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { VERDICT_COPY } from './verdict-copy';

const asAdherence = (n: number | null): 1 | 2 | 3 | 4 | 5 | null =>
  n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : null;

const asVerdict = (value: unknown): Verdict | null => {
  if (value === null || typeof value !== 'object') return null;
  const type = (value as { type?: unknown }).type;
  if (
    type !== 'INSUFFICIENT_DATA' &&
    type !== 'HOLD' &&
    type !== 'ADHERENCE_FOCUS' &&
    type !== 'PLATEAU_PROTOCOL' &&
    type !== 'ADJUST_TARGETS' &&
    type !== 'REFER_REVIEW'
  ) {
    return null;
  }
  return value as Verdict;
};

/** View / edit a completed check-in and re-run the adaptive engine. */
export const CheckInDetailScreen = ({
  clientId,
  checkInId,
}: {
  clientId: string;
  checkInId: string;
}) => {
  const router = useRouter();
  const detail = useCheckIn(checkInId);
  const update = useUpdateCheckIn(clientId);
  const apply = useApplyAdjustment(clientId);

  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!detail.data || hydrated) return;
    const row = detail.data;
    setWeight(row.weightKg != null ? String(row.weightKg) : '');
    setAdherence(asAdherence(row.adherenceRating));
    setNotes(row.coachNotes ?? '');
    setVerdict(asVerdict(row.engineOutput));
    setHydrated(true);
  }, [detail.data, hydrated]);

  if (detail.isPending) {
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
  }
  if (detail.isError) {
    return (
      <AppScreen>
        <ErrorState message="Could not load this check-in." retry={() => void detail.refetch()} />
      </AppScreen>
    );
  }

  const checkIn = detail.data;
  const editable = checkIn.status === 'COMPLETED';
  const copy = verdict !== null ? VERDICT_COPY[verdict.type] : null;

  const submit = () => {
    if (!editable || update.isPending) return;
    if (weight !== '' && !(Number(weight) > 0)) {
      setWeightError('Enter a valid weight');
      return;
    }
    setWeightError(null);
    update.mutate(
      {
        checkInId,
        input: {
          ...(weight !== '' ? { vitals: { weightKg: Number(weight) } } : {}),
          ...(adherence !== null ? { adherenceRating: adherence } : {}),
          ...(notes.trim() !== '' ? { coachNotes: notes.trim() } : {}),
        },
      },
      {
        onSuccess: (data) => {
          setVerdict(data.verdict);
          void detail.refetch();
        },
      },
    );
  };

  return (
    <AppScreen>
      <PageHeader
        title={`Check-in · ${checkIn.scheduledFor}`}
        subtitle={editable ? 'Edit inputs and re-run the engine' : `${checkIn.status} — view only`}
      />

      {copy !== null && verdict !== null ? (
        <Card gap="$3" tone={copy.tone === 'danger' ? 'danger' : 'default'} marginBottom="$4">
          <Row>
            <Body fontWeight="800" fontSize={17} flex={1}>
              {copy.title}
            </Body>
            <Badge tone={copy.tone} label={verdict.type.replaceAll('_', ' ')} />
          </Row>
          {verdict.actualWeeklyDeltaKg !== undefined ? (
            <Muted>
              Actual {verdict.actualWeeklyDeltaKg} kg/wk vs expected {verdict.expectedWeeklyDeltaKg}{' '}
              kg/wk · confidence {(verdict.confidence * 100).toFixed(0)}%
            </Muted>
          ) : null}
          {verdict.reasons.map((reason) => (
            <Body key={reason} fontSize={14}>
              • {reason}
            </Body>
          ))}
          {verdict.type === 'ADJUST_TARGETS' && verdict.newTargets ? (
            <YStack gap="$2">
              <SectionTitle>Proposed targets</SectionTitle>
              <Body fontWeight="700">
                {verdict.newTargets.kcal} kcal (
                {verdict.deltaKcalPerDay !== undefined && verdict.deltaKcalPerDay > 0 ? '+' : ''}
                {verdict.deltaKcalPerDay} kcal/day)
              </Body>
              <Muted>
                P {verdict.newTargets.proteinG}g · F {verdict.newTargets.fatG}g · C{' '}
                {verdict.newTargets.carbsG}g
              </Muted>
              {editable ? (
                <>
                  <PrimaryButton
                    disabled={apply.isPending}
                    onPress={() =>
                      apply.mutate(checkInId, {
                        onSuccess: () => router.replace(`/clients/${clientId}/plan`),
                      })
                    }
                  >
                    {apply.isPending ? 'Re-solving plan…' : 'Apply — draft an adjusted plan'}
                  </PrimaryButton>
                  {apply.isError ? (
                    <Body color="$danger" role="alert">
                      {apply.error.message}
                    </Body>
                  ) : null}
                </>
              ) : null}
            </YStack>
          ) : null}
          {verdict.type === 'REFER_REVIEW' ? (
            <Body color="$danger">
              Automatic adjustments are paused. Review the client before changing anything. This is
              not medical advice.
            </Body>
          ) : null}
        </Card>
      ) : null}

      <Card gap="$4">
        <FormField
          label="Weight (kg)"
          value={weight}
          onChangeText={(t) => {
            if (!editable) return;
            setWeight(t);
            setWeightError(null);
          }}
          placeholder="e.g. 84.2"
          inputMode="decimal"
          error={weightError}
          disabled={!editable}
        />

        <YStack gap="$2">
          <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
            Plan adherence (1–5)
          </Body>
          <XStack gap="$2" role="group" aria-label="Adherence rating">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <GhostButton
                key={n}
                flex={1}
                disabled={!editable}
                onPress={() => setAdherence(n)}
                backgroundColor={adherence === n ? '$primary' : 'transparent'}
                color={adherence === n ? '$primaryFg' : '$color'}
                borderColor={adherence === n ? '$primary' : '$borderColor'}
                aria-pressed={adherence === n}
                aria-label={`Adherence ${n}`}
              >
                {n}
              </GhostButton>
            ))}
          </XStack>
        </YStack>

        <FormField
          label="Notes (optional)"
          value={notes}
          onChangeText={(t) => {
            if (!editable) return;
            setNotes(t);
          }}
          placeholder="Sleep, stress, travel, injuries…"
          multiline
          numberOfLines={3}
          disabled={!editable}
        />

        {update.isError ? (
          <Body color="$danger" role="alert">
            {update.error.message}
          </Body>
        ) : null}

        {editable ? (
          <PrimaryButton disabled={update.isPending} onPress={submit}>
            {update.isPending ? 'Re-running…' : 'Save & re-run'}
          </PrimaryButton>
        ) : null}

        <GhostButton onPress={() => router.replace(`/clients/${clientId}`)}>Back</GhostButton>
      </Card>
    </AppScreen>
  );
};
