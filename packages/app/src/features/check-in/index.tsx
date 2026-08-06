'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Verdict } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  GhostButton,
  Input,
  Label,
  Muted,
  PrimaryButton,
  Row,
  Screen,
  SectionTitle,
  TextArea,
  Title,
  XStack,
  YStack,
} from '@gymos/ui';
import { useApplyAdjustment, useCompleteCheckIn } from '../../api';

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
  const [result, setResult] = useState<{ checkInId: string; verdict: Verdict } | null>(null);

  const submit = () => {
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
      <Screen>
        <Title>Check-in verdict</Title>
        <Card
          gap="$3"
          borderWidth={2}
          borderColor={copy.tone === 'danger' ? '$danger' : '$borderColor'}
        >
          <Row>
            <Body fontWeight="800" fontSize={17}>
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
              {apply.isError ? <Body color="$danger">{apply.error.message}</Body> : null}
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
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Weekly check-in</Title>
      <Card gap="$3">
        <YStack gap="$1.5">
          <Label>Today's weight (kg)</Label>
          <Input
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 84.2"
            inputMode="decimal"
            size="$5"
          />
        </YStack>

        <YStack gap="$1.5">
          <Label>How well did they follow the plan this week?</Label>
          <XStack gap="$2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <GhostButton
                key={n}
                flex={1}
                size="$4"
                onPress={() => setAdherence(n)}
                backgroundColor={adherence === n ? '$primary' : 'transparent'}
                color={adherence === n ? '$primaryFg' : '$color'}
              >
                {n}
              </GhostButton>
            ))}
          </XStack>
          <Muted fontSize={12}>1 = barely · 5 = nailed it. Low adherence changes the advice.</Muted>
        </YStack>

        <YStack gap="$1.5">
          <Label>Notes (optional)</Label>
          <TextArea
            value={notes}
            onChangeText={setNotes}
            placeholder="Sleep, stress, travel, injuries…"
            size="$4"
            numberOfLines={3}
          />
        </YStack>

        {complete.isError ? <Body color="$danger">{complete.error.message}</Body> : null}
        <PrimaryButton disabled={complete.isPending} onPress={submit}>
          {complete.isPending ? 'Analyzing…' : 'Complete check-in'}
        </PrimaryButton>
      </Card>
    </Screen>
  );
};
