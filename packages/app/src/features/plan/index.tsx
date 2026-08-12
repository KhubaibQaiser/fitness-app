'use client';

import { useState } from 'react';
import { Link } from 'solito/link';
import { ApiError, type PlanSummary } from '@gymos/contracts';
import {
  ArrowLeft,
  Body,
  Card,
  ErrorState,
  IconButton,
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

const MEAL_COUNT_OPTIONS = [
  { value: 3, label: '3 meals' },
  { value: 4, label: '+1 snack' },
  { value: 5, label: '+2 snacks' },
] as const;

const pickPreferredPlanId = (plans: PlanSummary[]): string | null => {
  const preferred =
    plans.find((p) => p.status === 'NEEDS_REVIEW') ??
    plans.find((p) => p.status === 'DRAFT') ??
    plans.find((p) => p.status === 'PUBLISHED') ??
    plans[0] ??
    null;
  return preferred?.id ?? null;
};

/** Plan view + editor: generate, tune portions, publish, download PDF. */
export const PlanScreen = ({ clientId }: { clientId: string }) => {
  const detail = useClientDetail(clientId);
  const generate = useGeneratePlan(clientId);
  const [day, setDay] = useState(1);
  const [mealCount, setMealCount] = useState<3 | 4 | 5>(3);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = detail.data?.plans ?? [];
  const preferredId = pickPreferredPlanId(plans);
  const activePlanId =
    selectedPlanId !== null && plans.some((p) => p.id === selectedPlanId)
      ? selectedPlanId
      : preferredId;

  const plan = usePlan(activePlanId);

  if (detail.isPending || (activePlanId !== null && plan.isPending)) {
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

  const runGenerate = (input?: { reason?: string; mealCount?: 3 | 4 | 5 }) => {
    generate.mutate(input, {
      onSuccess: (data) => {
        setSelectedPlanId(data.plan.id);
        setDay(1);
      },
    });
  };

  if (activePlanId === null || plan.data === undefined) {
    return (
      <AppScreen>
        <PageHeader
          title="Meal plan"
          subtitle="7-day generation from goal targets"
          leading={
            <Link href={`/clients/${clientId}`}>
              <IconButton
                aria-label="Back to client"
                icon={<ArrowLeft size={20} color="$color" />}
              />
            </Link>
          }
        />
        {detail.data.goal === null ? (
          <Card gap="$3">
            <Body>Set a goal first — the plan is generated from its targets.</Body>
            <Link href={`/clients/${clientId}/goal/new`}>
              <PrimaryButton>Set a goal</PrimaryButton>
            </Link>
          </Card>
        ) : (
          <YStack gap="$3">
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
                  onConfirm={(reason) => runGenerate({ reason, mealCount })}
                  busy={generate.isPending}
                  detail={generate.error instanceof ApiError ? (generate.error.detail ?? '') : ''}
                />
              ) : (
                <PrimaryButton
                  disabled={generate.isPending}
                  onPress={() => runGenerate({ mealCount })}
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
      clientName={detail.data.client.name}
      planId={plan.data.plan.id}
      status={plan.data.plan.status}
      title={plan.data.plan.title}
      targets={plan.data.plan.targets}
      items={plan.data.items}
      day={day}
      setDay={setDay}
      version={plan.data.plan.version}
      plans={plans}
      onSelectPlan={(id) => {
        setSelectedPlanId(id);
        setDay(1);
      }}
      mealCount={mealCount}
      setMealCount={setMealCount}
      onGenerate={runGenerate}
      generatePending={generate.isPending}
      generateError={generate.error}
      generateBlocked={blocked}
    />
  );
};
