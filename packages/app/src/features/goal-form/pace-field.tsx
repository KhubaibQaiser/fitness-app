'use client';

import type { GoalRate } from '@gymos/core/nutrition';
import { AlertBanner, Body, PaceSlider, YStack } from '@gymos/ui';
import { rateFromSliderKcal, type PaceControlView } from '../../lib/pace-control';

export const PaceField = ({
  pace,
  onChange,
  emptyHint = 'Enter height, weight and activity to fine-tune target calories.',
}: {
  pace: PaceControlView | null;
  onChange: (next: { targetKcal: number; goalRate: GoalRate }) => void;
  emptyHint?: string;
}) => (
  <YStack gap="$2">
    <Body fontFamily="$heading" fontWeight="700" fontSize={13}>
      Pace
    </Body>
    {pace !== null ? (
      <PaceSlider
        ariaLabel="Target calories"
        min={pace.min}
        max={pace.max}
        value={pace.value}
        ticks={pace.ticks}
        suggestedValue={pace.suggestedValue}
        tone={pace.tone}
        hint={pace.hint}
        helper={pace.helper}
        warning={pace.warning}
        onChange={(targetKcal) =>
          onChange({ targetKcal, goalRate: rateFromSliderKcal(targetKcal, pace.ticks) })
        }
      />
    ) : (
      <Body color="$textMuted" fontSize={13}>
        {emptyHint}
      </Body>
    )}
  </YStack>
);

export const PaceOverrideBanner = ({
  pace,
  followUp = 'This is a preview — review with the client at check-in.',
}: {
  pace: PaceControlView;
  followUp?: string;
}) => {
  if (!pace.beyondRecommended && !pace.belowSexFloor) return null;
  return (
    <AlertBanner
      tone={pace.belowSexFloor ? 'danger' : 'warning'}
      title={
        pace.belowSexFloor
          ? 'Calorie target is below the sex floor'
          : 'Calorie target is beyond the recommended pace'
      }
    >
      {pace.helper} {followUp}
    </AlertBanner>
  );
};
