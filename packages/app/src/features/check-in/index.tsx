'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Verdict } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  FormField,
  GhostButton,
  Muted,
  PageHeader,
  PrimaryButton,
  Row,
  SectionTitle,
  XStack,
  YStack,
} from '@gymos/ui';
import { useApplyAdjustment, useCompleteCheckIn } from '../../api';
import { AppScreen } from '../shell/app-screen';

const VERDICT_COPY: Record<
  Verdict['type'],
  { title: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }
> = {
  HOLD: { title: 'On track — hold the course', tone: 'success' },
  ADJUST_TARGETS: { title: 'Adjustment recommended', tone: 'warning' },
  ADHERENCE_FOCUS: { title: 'Focus on adherence, not targets', tone: 'warning' },
  PLATEAU_PROTOCOL: { title: 'Plateau — consider a diet break', tone: 'warning' },
  REFER_REVIEW: { title: 'Red flag — review before continuing', tone: 'danger' },
  INSUFFICIENT_DATA: { title: 'Not enough data yet', tone: 'neutral' },
};

/** Weekly check-in: capture → deterministic verdict → one-tap apply. */
export const CheckInScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const complete = useCompleteCheckIn(clientId);
  const apply = useApplyAdjustment(clientId);
  const [weight, setWeight] = useState('');
  const [adherence, setAdherence] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [result, setResult] = useState<{ checkInId: string; verdict: Verdict } | null>(null);

  const submit = () => {
    if (weight !== '' && !(Number(weight) > 0)) {
      setWeightError('Enter a valid weight');
      return;
    }
    setWeightError(null);
    if (complete.isPending) return;
    complete.mutate(
      {
        ...(weight !== '' ? { vitals: { weightKg: Number(weight) } } : {}),
        ...(adherence !== null ? { adherenceRating: adherence } : {}),
        ...(notes.trim() !== '' ? { coachNotes: notes.trim() } : {}),
      },
      { onSuccess: (data) => setResult({ checkInId: data.checkInId, verdict: data.verdict }) },
    );
  };

  if (result !== null) {
    const copy = VERDICT_COPY[result.verdict.type];
    const verdict = result.verdict;
    return (
      <AppScreen>
        <PageHeader title="Check-in verdict" />
        <Card gap="$3" tone={copy.tone === 'danger' ? 'danger' : 'default'}>
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
              <PrimaryButton
                disabled={apply.isPending}
                onPress={() =>
                  apply.mutate(result.checkInId, {
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
            </YStack>
          ) : null}
          {verdict.type === 'REFER_REVIEW' ? (
            <Body color="$danger">
              Automatic adjustments are paused. Review the client (and involve a physician where
              appropriate) before changing anything. This is not medical advice.
            </Body>
          ) : null}
          <GhostButton onPress={() => router.replace(`/clients/${clientId}`)}>Done</GhostButton>
        </Card>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <PageHeader title="Weekly check-in" subtitle="Capture → verdict → optional apply" />
      <Card gap="$4">
        <FormField
          label="Today's weight (kg)"
          value={weight}
          onChangeText={(t) => {
            setWeight(t);
            setWeightError(null);
          }}
          placeholder="e.g. 84.2"
          inputMode="decimal"
          error={weightError}
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
                minHeight={48}
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
          <Muted fontSize={12}>1 = barely · 5 = nailed it. Low adherence changes the advice.</Muted>
        </YStack>

        <FormField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Sleep, stress, travel, injuries…"
          multiline
          numberOfLines={3}
        />

        {complete.isError ? (
          <Body color="$danger" role="alert">
            {complete.error.message}
          </Body>
        ) : null}
        <PrimaryButton disabled={complete.isPending} onPress={submit}>
          {complete.isPending ? 'Analyzing…' : 'Complete check-in'}
        </PrimaryButton>
      </Card>
    </AppScreen>
  );
};
