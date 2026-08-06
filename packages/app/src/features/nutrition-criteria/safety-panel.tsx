'use client';

import { CALORIE_FLOOR_KCAL, KCAL_PER_KG, MAX_DEFICIT_FRACTION } from '@gymos/core/nutrition';
import { Body, Card, Muted, Stat, XStack, YStack } from '@gymos/ui';
import { FormulaBlock } from './formula-block';
import { PanelHeading } from './panel-heading';

/** Floors, weekly change estimate, adaptive note. */
export const SafetyPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Safety & progress"
      subtitle="Hard limits on how low calories can go, plus how weekly weight change is estimated."
    />

    <XStack gap="$3" flexWrap="wrap">
      <Stat label="Women floor" value={`${CALORIE_FLOOR_KCAL.F}`} hint="kcal / day minimum" />
      <Stat label="Men floor" value={`${CALORIE_FLOOR_KCAL.M}`} hint="kcal / day minimum" />
      <Stat
        label="Max deficit"
        value={`${Math.round(MAX_DEFICIT_FRACTION * 100)}%`}
        hint="of TDEE"
      />
    </XStack>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        What happens if a target is unsafe?
      </Body>
      <Muted lineHeight={19}>
        Creating a goal: the engine refuses — it never quietly lowers the target. Weekly check-ins:
        suggested adjustments are clamped into the safe band instead.
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
        needed, protein stays fixed; carbs move first, then fat toward its floor. Safety floors
        still apply.
      </Muted>
    </Card>
  </YStack>
);
