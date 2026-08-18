'use client';

import {
  CALORIE_FLOOR_KCAL,
  COACH_OVERRIDE_KCAL_MIN,
  KCAL_PER_KG,
  MAX_DEFICIT_FRACTION,
  MAX_SURPLUS_FRACTION,
} from '@gymos/core/nutrition';
import { Body, Card, Muted, Stat, XStack, YStack } from '@gymos/ui';
import { FormulaBlock } from './formula-block';
import { PanelHeading } from './panel-heading';

/** Floors, weekly change estimate, adaptive note. */
export const SafetyPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Safety & progress"
      subtitle="Named ticks stay inside the safety band. A coach override warns instead of blocking."
    />

    <XStack gap="$3" flexWrap="wrap">
      <Stat label="Women floor" value={`${CALORIE_FLOOR_KCAL.F}`} hint="kcal / day warning" />
      <Stat label="Men floor" value={`${CALORIE_FLOOR_KCAL.M}`} hint="kcal / day warning" />
      <Stat
        label="Max deficit"
        value={`${Math.round(MAX_DEFICIT_FRACTION * 100)}%`}
        hint="of TDEE · named clamp / override warn"
      />
      <Stat
        label="Max surplus"
        value={`${Math.round(MAX_SURPLUS_FRACTION * 100)}%`}
        hint="of TDEE · named clamp / override warn"
      />
      <Stat
        label="Override floor"
        value={`${COACH_OVERRIDE_KCAL_MIN}`}
        hint="kcal / day hard minimum"
      />
    </XStack>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        What happens if a target is unsafe?
      </Body>
      <Muted lineHeight={19}>
        Named ticks (Gentle / Standard / Aggressive) are clamped into the safe band — sex floors,
        25% deficit cap, 15% surplus cap, 1% body-weight/week. Only infeasible macros are refused.
        Dragging Pace past those ticks warns instead of clamping. Create and save stay enabled. The
        only hard bound on an override is 800 kcal, so a 70 kcal target cannot be stored. Weekly
        check-in suggestions still clamp; a stored override is the current target until the coach
        changes it.
      </Muted>
    </Card>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        Expected weekly weight change
      </Body>
      <Muted lineHeight={19}>
        From the gap between target calories and TDEE, using ~{KCAL_PER_KG.toLocaleString()} kcal
        per kg.
      </Muted>
      <FormulaBlock
        lines={[
          `Δ kg/week = (target − TDEE) × 7 ÷ ${KCAL_PER_KG}`,
          'Negative = loss · Positive = gain',
        ]}
      />
    </Card>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        After the first target
      </Body>
      <Muted lineHeight={19}>
        Weekly check-ins compare smoothed weight trend to the expected rate. If an adjustment is
        needed, protein stays fixed; carbs move first, then fat toward its floor. Suggested
        adjustments still clamp into the safety band; a stored coach override remains until the
        coach changes it.
      </Muted>
    </Card>
  </YStack>
);
