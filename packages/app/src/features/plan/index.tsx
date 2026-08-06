'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { ApiError } from '@gymos/contracts';
import {
  Body,
  Card,
  ErrorState,
  LoadingState,
  Muted,
  PageHeader,
  PrimaryButton,
  SegmentedControl,
  YStack,
} from '@gymos/ui';
import { useClientDetail, useGeneratePlan, usePlan } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { OverridePrompt } from './override-prompt';
import { PlanEditor } from './plan-editor';
import { PrepPreferencesBanner } from './prep-preferences-banner';

const MEAL_COUNT_OPTIONS = [
  { value: 3, label: '3 meals' },
  { value: 4, label: '+1 snack' },
  { value: 5, label: '+2 snacks' },
] as const;

/** Plan view + editor: generate, tune portions, publish. Numbers are server truth. */
export const PlanScreen = ({ clientId }: { clientId: string }) => {
  const detail = useClientDetail(clientId);
  const generate = useGeneratePlan(clientId);
  const [day, setDay] = useState(1);
  const [mealCount, setMealCount] = useState<3 | 4 | 5>(3);

  const plans = detail.data?.plans ?? [];
  const planSummary =
    plans.find((p) => p.status === 'NEEDS_REVIEW') ??
    plans.find((p) => p.status === 'DRAFT') ??
    plans.find((p) => p.status === 'PUBLISHED') ??
    null;

  const plan = usePlan(planSummary?.id ?? null);

  if (detail.isPending || (planSummary !== null && plan.isPending)) {
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
  }
  if (detail.isError) {
    return (
      <AppScreen>
        <ErrorState message="Could not load." retry={() => void detail.refetch()} />
      </AppScreen>
    );
  }

  const blocked =
    generate.error instanceof ApiError && generate.error.code === 'BLOCKED_REQUIRES_OVERRIDE';

  if (planSummary === null || plan.data === undefined) {
    return (
      <AppScreen>
        <PageHeader title="Meal plan" subtitle="7-day generation from goal targets" />
        {detail.data.goal === null ? (
          <Card gap="$3">
            <Body>Set a goal first — the plan is generated from its targets.</Body>
            <Link href={`/clients/${clientId}/goal/new`}>
              <PrimaryButton>Set a goal</PrimaryButton>
            </Link>
          </Card>
        ) : (
          <YStack gap="$3">
            <PrepPreferencesBanner />
            <Card gap="$3">
              <Body>
                Generate a 7-day plan for {detail.data.goal.initialTargets?.kcal ?? '—'} kcal
                honoring every dietary restriction.
              </Body>
              <YStack gap="$2">
                <Muted fontSize={13}>Meals per day</Muted>
                <SegmentedControl
                  ariaLabel="Meals per day"
                  options={[...MEAL_COUNT_OPTIONS]}
                  value={mealCount}
                  onChange={setMealCount}
                />
              </YStack>
              {blocked ? (
                <OverridePrompt
                  onConfirm={(reason) => generate.mutate({ reason, mealCount })}
                  busy={generate.isPending}
                  detail={generate.error instanceof ApiError ? (generate.error.detail ?? '') : ''}
                />
              ) : (
                <PrimaryButton
                  disabled={generate.isPending}
                  onPress={() => generate.mutate({ mealCount })}
                >
                  {generate.isPending ? 'Generating…' : 'Generate 7-day plan'}
                </PrimaryButton>
              )}
              {generate.isError && !blocked ? (
                <Body color="$danger" role="alert">
                  {generate.error.message}
                </Body>
              ) : null}
            </Card>
          </YStack>
        )}
      </AppScreen>
    );
  }

  return (
    <PlanEditor
      clientId={clientId}
      planId={plan.data.plan.id}
      status={plan.data.plan.status}
      targets={plan.data.plan.targets}
      items={plan.data.items}
      day={day}
      setDay={setDay}
      version={plan.data.plan.version}
    />
  );
};
