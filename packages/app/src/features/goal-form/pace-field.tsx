'use client';

import type { GoalRate } from '@gymos/core/nutrition';
import { Body, PaceSlider, useMedia, YStack } from '@gymos/ui';
import { rateFromSliderKcal, type PaceControlView } from '../../lib/pace-control';

export const PaceField = ({
  pace,
  onChange,
  emptyHint = 'Enter height, weight and activity to fine-tune target calories.',
}: {
  pace: PaceControlView | null;
  onChange: (next: { targetKcal: number; goalRate: GoalRate }) => void;
  emptyHint?: string;
}) => {
  const media = useMedia();
  return (
    <YStack gap="$2" width="100%">
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
          warning={pace.warning}
          floor={pace.sexFloorKcal}
          compact={!media.md}
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
};
