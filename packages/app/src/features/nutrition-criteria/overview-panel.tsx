'use client';

import { Body, Card, Muted, YStack } from '@gymos/ui';
import { PanelHeading } from './panel-heading';
import { PipelineStep } from './pipeline-step';

const STEPS = [
  {
    title: 'Client vitals',
    detail: 'Sex, age, height, weight, activity, and optional body-fat %.',
  },
  {
    title: 'BMR (resting burn)',
    detail:
      'Calories the body uses at rest — Mifflin–St Jeor, or Katch–McArdle if body fat is known.',
  },
  {
    title: 'TDEE (daily burn)',
    detail: 'BMR multiplied by how active the client is each week.',
  },
  {
    title: 'Goal calories',
    detail: 'TDEE nudged up or down by goal + pace, then clamped to safety floors.',
  },
  {
    title: 'Macros & fiber',
    detail: 'Protein and fat from body weight; carbs fill the rest; fiber from the calorie target.',
  },
] as const;

/** High-level flow — start here. */
export const OverviewPanel = () => (
  <YStack gap="$4">
    <Card gap="$3" tone="accent">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        What this page is
      </Body>
      <Muted lineHeight={20}>
        GymOS sets calorie and macro targets with fixed formulas — not AI guesses. Use the tabs to
        inspect each step. Numbers on this screen come straight from the engine code.
      </Muted>
    </Card>

    <PanelHeading title="The path in five steps" subtitle="Every new goal follows this order." />
    <Card gap="$0" paddingVertical="$4">
      {STEPS.map((step, index) => (
        <PipelineStep
          key={step.title}
          step={index + 1}
          title={step.title}
          detail={step.detail}
          last={index === STEPS.length - 1}
        />
      ))}
    </Card>

    <Card gap="$2">
      <Muted fontSize={12} lineHeight={18}>
        GymOS provides general fitness nutrition guidance — not medical advice. Use clinical
        judgment for clients with medical conditions.
      </Muted>
    </Card>
  </YStack>
);
