'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Verdict } from '@gymos/contracts';
import {
  AlertTriangle,
  Badge,
  Body,
  Card,
  Check,
  ClipboardList,
  FormField,
  GhostButton,
  Muted,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  Row,
  SectionTitle,
  StickyFormFooter,
  useFocusChain,
  YStack,
} from '@gymos/ui';
import { useApplyAdjustment, useCompleteCheckIn } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { adherenceBarTone, adherencePctToRating } from './adherence';
import { VERDICT_COPY } from './verdict-copy';

const VERDICT_ICON_BG = {
  success: '$successMuted',
  warning: '$warningMuted',
  danger: '$dangerMuted',
  neutral: '$elevatedBg',
} as const;

const VERDICT_ICON_FG = {
  success: '$success',
  warning: '$warning',
  danger: '$danger',
  neutral: '$textMuted',
} as const;

const BAR_COLOR = {
  success: '$success',
  warning: '$warning',
  danger: '$danger',
  primary: '$primary',
} as const;

/** Weekly check-in: capture → deterministic verdict → one-tap apply. */
export const CheckInScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const complete = useCompleteCheckIn(clientId);
  const apply = useApplyAdjustment(clientId);
  const [weight, setWeight] = useState('');
  const [adherencePct, setAdherencePct] = useState('');
  const [notes, setNotes] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [result, setResult] = useState<{ checkInId: string; verdict: Verdict } | null>(null);

  const pctNum = Math.max(0, Math.min(100, Number(adherencePct) || 0));
  const barTone = adherenceBarTone(pctNum);

  const submit = useCallback(() => {
    if (weight !== '' && !(Number(weight) > 0)) {
      setWeightError('Enter a valid weight');
      return;
    }
    setWeightError(null);
    if (complete.isPending) return;
    const hasPct = adherencePct.trim() !== '' && Number.isFinite(Number(adherencePct));
    complete.mutate(
      {
        ...(weight !== '' ? { vitals: { weightKg: Number(weight) } } : {}),
        ...(hasPct ? { adherenceRating: adherencePctToRating(Number(adherencePct)) } : {}),
        ...(notes.trim() !== '' ? { coachNotes: notes.trim() } : {}),
      },
      { onSuccess: (data) => setResult({ checkInId: data.checkInId, verdict: data.verdict }) },
    );
  }, [adherencePct, complete, notes, weight]);

  const chain = useFocusChain(['weight', 'adherence', 'notes'], {
    onSubmit: submit,
    multiline: ['notes'],
  });

  if (result !== null) {
    const copy = VERDICT_COPY[result.verdict.type];
    const verdict = result.verdict;
    const narrative = verdict.narrative;
    const displayTitle = narrative?.title ?? copy.title;
    const iconBg = VERDICT_ICON_BG[copy.tone];
    const iconFg = VERDICT_ICON_FG[copy.tone];
    const VerdictIcon =
      copy.tone === 'success' ? Check : copy.tone === 'neutral' ? ClipboardList : AlertTriangle;

    return (
      <AppScreen>
        <PageHeader title="Check-in verdict" />
        <Card gap="$4" tone={copy.tone === 'danger' ? 'danger' : 'default'} alignItems="center">
          <YStack
            width={72}
            height={72}
            borderRadius={999}
            backgroundColor={iconBg}
            alignItems="center"
            justifyContent="center"
          >
            <VerdictIcon size={32} color={iconFg} />
          </YStack>
          <YStack gap="$3" width="100%" alignItems="stretch">
            <Row>
              <Body fontWeight="800" fontSize={17} flex={1}>
                {displayTitle}
              </Body>
              <Badge tone={copy.tone} label={verdict.type.replaceAll('_', ' ')} />
            </Row>
            {narrative !== undefined ? (
              <>
                <Body fontSize={14}>{narrative.coachSummary}</Body>
                <Muted>{narrative.clientSummary}</Muted>
              </>
            ) : null}
            {verdict.actualWeeklyDeltaKg !== undefined ? (
              <Muted>
                Actual {verdict.actualWeeklyDeltaKg} kg/wk vs expected{' '}
                {verdict.expectedWeeklyDeltaKg} kg/wk · confidence{' '}
                {(verdict.confidence * 100).toFixed(0)}%
              </Muted>
            ) : null}
            {narrative === undefined
              ? verdict.reasons.map((reason) => (
                  <Body key={reason} fontSize={14}>
                    • {reason}
                  </Body>
                ))
              : null}
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
                  {apply.isPending ? 'Re-solving plan…' : 'Apply and draft an adjusted plan'}
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
          </YStack>
        </Card>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <OutlineButton flex={1} onPress={() => router.back()}>
            Cancel
          </OutlineButton>
          <PrimaryButton flex={1} disabled={complete.isPending} onPress={submit}>
            {complete.isPending ? 'Analyzing…' : 'Submit'}
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <PageHeader title="Weekly check-in" subtitle="Capture → verdict → optional apply" />
      {chain.toolbar}
      <Card gap="$4">
        <FormField
          label="Today's weight"
          unit="kg"
          value={weight}
          onChangeText={(t) => {
            setWeight(t);
            setWeightError(null);
          }}
          placeholder="e.g. 84.2"
          inputMode="decimal"
          error={weightError}
          {...chain.bind('weight')}
        />

        <YStack gap="$2">
          <FormField
            label="Plan adherence"
            unit="%"
            value={adherencePct}
            onChangeText={setAdherencePct}
            placeholder="0–100"
            inputMode="numeric"
            hint="How closely the client followed the plan this week"
            {...chain.bind('adherence')}
          />
          <YStack
            height={8}
            width="100%"
            backgroundColor="$elevatedBg"
            borderRadius={999}
            overflow="hidden"
            role="progressbar"
            aria-valuenow={pctNum}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <YStack height={8} width={`${pctNum}%`} backgroundColor={BAR_COLOR[barTone]} />
          </YStack>
        </YStack>

        <FormField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Sleep, stress, travel, injuries…"
          multiline
          numberOfLines={3}
          {...chain.bind('notes')}
        />

        {complete.isError ? (
          <Body color="$danger" role="alert">
            {complete.error.message}
          </Body>
        ) : null}
      </Card>
    </AppScreen>
  );
};
