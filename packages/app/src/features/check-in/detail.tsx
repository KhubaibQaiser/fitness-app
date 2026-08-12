'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Verdict } from '@gymos/contracts';
import {
  AlertTriangle,
  Badge,
  Body,
  Card,
  Check,
  ClipboardList,
  ErrorState,
  FormField,
  GhostButton,
  LoadingState,
  Muted,
  PageHeader,
  PrimaryButton,
  Row,
  SectionTitle,
  StickyFormFooter,
  XStack,
  YStack,
} from '@gymos/ui';
import { useApplyAdjustment, useCheckIn, useUpdateCheckIn } from '../../api';
import { MacroDonut, ProgressRing } from '../charts';
import { AppScreen } from '../shell/app-screen';
import { useAppChrome } from '../shell/use-app-chrome';
import { adherenceBarTone, adherencePctToRating, adherenceRatingToPct } from './adherence';
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

/** View / edit a completed check-in and re-run the adaptive engine. */
export const CheckInDetailScreen = ({
  clientId,
  checkInId,
}: {
  clientId: string;
  checkInId: string;
}) => {
  const router = useRouter();
  const { showMobileTabBar } = useAppChrome();
  const detail = useCheckIn(checkInId);
  const update = useUpdateCheckIn(clientId);
  const apply = useApplyAdjustment(clientId);

  const [weight, setWeight] = useState('');
  const [adherencePct, setAdherencePct] = useState('');
  const [notes, setNotes] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const bottomInset = showMobileTabBar ? 72 : 12;
  const pctNum = Math.max(0, Math.min(100, Number(adherencePct) || 0));
  const barTone = adherenceBarTone(pctNum);

  useEffect(() => {
    if (!detail.data || hydrated) return;
    const row = detail.data;
    setWeight(row.weightKg != null ? String(row.weightKg) : '');
    const rating = asAdherence(row.adherenceRating);
    setAdherencePct(rating !== null ? String(adherenceRatingToPct(rating)) : '');
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
  const narrative = verdict?.narrative;
  const displayTitle = narrative?.title ?? copy?.title ?? null;

  const submit = () => {
    if (!editable || update.isPending) return;
    if (weight !== '' && !(Number(weight) > 0)) {
      setWeightError('Enter a valid weight');
      return;
    }
    setWeightError(null);
    const hasPct = adherencePct.trim() !== '' && Number.isFinite(Number(adherencePct));
    update.mutate(
      {
        checkInId,
        input: {
          ...(weight !== '' ? { vitals: { weightKg: Number(weight) } } : {}),
          ...(hasPct ? { adherenceRating: adherencePctToRating(Number(adherencePct)) } : {}),
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

      {copy !== null && verdict !== null && displayTitle !== null ? (
        <Card
          gap="$4"
          tone={copy.tone === 'danger' ? 'danger' : 'default'}
          marginBottom="$4"
          alignItems="center"
        >
          <YStack
            width={72}
            height={72}
            borderRadius={999}
            backgroundColor={VERDICT_ICON_BG[copy.tone]}
            alignItems="center"
            justifyContent="center"
          >
            {copy.tone === 'success' ? (
              <Check size={32} color={VERDICT_ICON_FG[copy.tone]} />
            ) : copy.tone === 'neutral' ? (
              <ClipboardList size={32} color={VERDICT_ICON_FG[copy.tone]} />
            ) : (
              <AlertTriangle size={32} color={VERDICT_ICON_FG[copy.tone]} />
            )}
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
                Automatic adjustments are paused. Review the client before changing anything. This
                is not medical advice.
              </Body>
            ) : null}
          </YStack>
        </Card>
      ) : null}

      <Card gap="$4">
        <FormField
          label="Weight"
          unit="kg"
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

        <YStack gap="$3">
          <FormField
            label="Plan adherence"
            unit="%"
            value={adherencePct}
            onChangeText={(t) => {
              if (!editable) return;
              setAdherencePct(t);
            }}
            placeholder="0–100"
            inputMode="numeric"
            disabled={!editable}
          />
          <XStack alignItems="center" gap="$3" justifyContent="space-between">
            <ProgressRing
              value={pctNum}
              size={88}
              label="adherence"
              tone={
                barTone === 'success'
                  ? 'success'
                  : barTone === 'warning'
                    ? 'warning'
                    : barTone === 'danger'
                      ? 'danger'
                      : 'primary'
              }
            />
            {verdict?.newTargets ? (
              <YStack flex={1} minWidth={0} maxWidth={220}>
                <MacroDonut
                  proteinG={verdict.newTargets.proteinG}
                  carbsG={verdict.newTargets.carbsG}
                  fatG={verdict.newTargets.fatG}
                  height={140}
                />
              </YStack>
            ) : (
              <YStack flex={1} minWidth={0}>
                <YStack
                  height={8}
                  width="100%"
                  backgroundColor="$elevatedBg"
                  borderRadius={999}
                  overflow="hidden"
                >
                  <YStack height={8} width={`${pctNum}%`} backgroundColor={BAR_COLOR[barTone]} />
                </YStack>
                <Muted fontSize={11} marginTop="$2">
                  {pctNum}% adherence
                </Muted>
              </YStack>
            )}
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
      </Card>

      <StickyFormFooter bottomInset={bottomInset}>
        <GhostButton flex={1} onPress={() => router.replace(`/clients/${clientId}`)}>
          {editable ? 'Cancel' : 'Back'}
        </GhostButton>
        {editable ? (
          <PrimaryButton flex={1} disabled={update.isPending} onPress={submit}>
            {update.isPending ? 'Re-running…' : 'Save & re-run'}
          </PrimaryButton>
        ) : null}
      </StickyFormFooter>
    </AppScreen>
  );
};
