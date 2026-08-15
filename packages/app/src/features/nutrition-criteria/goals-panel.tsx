'use client';

import {
  GOAL_DELTA,
  PROTEIN_G_PER_KG,
  type GoalPreset,
  type GoalRate,
} from '@gymos/core/nutrition';
import { Card, Muted, YStack } from '@gymos/ui';
import { usePublicConfig } from '../../api';
import {
  formatPaceKgPerWeek,
  formatPacePct,
  weeklyDeltaKgFromPublicConfig,
} from '../../lib/goal-pace';
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

const paceColor = (delta: number): string => {
  if (delta < 0) return '$danger';
  if (delta > 0) return '$success';
  return '$color';
};

/** Goal presets × pace — stacked cards so columns stay aligned on narrow screens. */
export const GoalsPanel = () => {
  const config = usePublicConfig();
  const hasTenantOverrides = config.data?.nutrition?.weeklyDeltaKg !== undefined;

  return (
    <YStack gap="$4">
      <PanelHeading
        title="Goal calories"
        subtitle="TDEE is nudged by the goal you pick and how fast you want to move."
      />

      <Card gap="$3">
        <Muted lineHeight={19}>
          {hasTenantOverrides
            ? 'This tenant sets Lose/Gain pace as fixed kg/week. Other goals still use a % of TDEE. Unsafe targets are refused.'
            : 'Target calories = TDEE adjusted by a percentage. Negative = deficit, positive = surplus.'}
        </Muted>
        <FormulaBlock
          lines={
            hasTenantOverrides
              ? [
                  'override: target kcal = round(TDEE + weekly kg × 7700 ÷ 7)',
                  'default: target kcal = round(TDEE × (1 + adjustment))',
                ]
              : ['target kcal = round(TDEE × (1 + adjustment))']
          }
        />
      </Card>

      <YStack gap="$3">
        {PRESET_ORDER.map((preset) => (
          <GoalDeltaCard
            key={preset}
            title={PRESET_COPY[preset].title}
            blurb={PRESET_COPY[preset].blurb}
            proteinLabel={`${PROTEIN_G_PER_KG[preset]} g/kg protein`}
            paces={RATE_ORDER.map((rate) => {
              const weeklyOverride = weeklyDeltaKgFromPublicConfig(config.data, preset, rate);
              if (weeklyOverride !== undefined) {
                return {
                  label: RATE_LABELS[rate],
                  value: formatPaceKgPerWeek(weeklyOverride),
                  color: paceColor(weeklyOverride),
                };
              }
              const delta = GOAL_DELTA[preset][rate];
              return {
                label: RATE_LABELS[rate],
                value: formatPacePct(delta),
                color: paceColor(delta),
              };
            })}
          />
        ))}
      </YStack>

      <Card gap="$2">
        <Muted fontSize={12} lineHeight={18}>
          {hasTenantOverrides
            ? 'Example: TDEE 2,800 kcal · Lose · Gentle (−0.5 kg/wk) → round(2,800 − 550) = 2,250 kcal/day.'
            : 'Example: TDEE 2,500 kcal · Lose · Standard → 2,500 × 0.80 = 2,000 kcal/day.'}
        </Muted>
      </Card>
    </YStack>
  );
};
