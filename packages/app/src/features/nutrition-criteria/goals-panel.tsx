'use client';

import {
  GOAL_DELTA,
  PROTEIN_G_PER_KG,
  type GoalPreset,
  type GoalRate,
} from '@gymos/core/nutrition';
import { Card, Muted, YStack } from '@gymos/ui';
import { FormulaBlock } from './formula-block';
import { GoalDeltaCard } from './goal-delta-card';
import { PanelHeading } from './panel-heading';

const PRESET_ORDER: readonly GoalPreset[] = ['LOSE', 'RECOMP', 'MAINTAIN', 'GAIN'];
const RATE_ORDER: readonly GoalRate[] = ['CONSERVATIVE', 'STANDARD', 'AGGRESSIVE'];

const PRESET_COPY: Record<GoalPreset, { title: string; blurb: string }> = {
  LOSE: {
    title: 'Lose fat',
    blurb: 'Deficit with the highest protein to protect muscle.',
  },
  RECOMP: {
    title: 'Recomp',
    blurb: 'Mild deficit — lose fat while keeping or building muscle.',
  },
  MAINTAIN: {
    title: 'Maintain',
    blurb: 'Eat at TDEE to hold weight steady.',
  },
  GAIN: {
    title: 'Gain',
    blurb: 'Surplus to support muscle gain.',
  },
};

const RATE_LABELS: Record<GoalRate, string> = {
  CONSERVATIVE: 'Gentle',
  STANDARD: 'Standard',
  AGGRESSIVE: 'Aggressive',
};

const formatPct = (fraction: number): string => {
  if (fraction === 0) return '0%';
  const pct = Math.round(fraction * 100);
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
};

const pctColor = (fraction: number): string => {
  if (fraction < 0) return '$danger';
  if (fraction > 0) return '$success';
  return '$color';
};

/** Goal presets × pace — stacked cards so columns stay aligned on narrow screens. */
export const GoalsPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="Goal calories"
      subtitle="TDEE is nudged by the goal you pick and how fast you want to move."
    />

    <Card gap="$3">
      <Muted lineHeight={19}>
        Target calories = TDEE adjusted by a percentage. Negative = deficit, positive = surplus.
      </Muted>
      <FormulaBlock lines={['target kcal = round(TDEE × (1 + adjustment))']} />
    </Card>

    <YStack gap="$3">
      {PRESET_ORDER.map((preset) => (
        <GoalDeltaCard
          key={preset}
          title={PRESET_COPY[preset].title}
          blurb={PRESET_COPY[preset].blurb}
          proteinLabel={`${PROTEIN_G_PER_KG[preset]} g/kg protein`}
          paces={RATE_ORDER.map((rate) => {
            const delta = GOAL_DELTA[preset][rate];
            return {
              label: RATE_LABELS[rate],
              value: formatPct(delta),
              color: pctColor(delta),
            };
          })}
        />
      ))}
    </YStack>

    <Card gap="$2">
      <Muted fontSize={12} lineHeight={18}>
        Example: TDEE 2,500 kcal · Lose · Standard → 2,500 × 0.80 = 2,000 kcal/day.
      </Muted>
    </Card>
  </YStack>
);
