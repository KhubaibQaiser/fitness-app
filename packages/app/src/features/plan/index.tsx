'use client';

import { useMemo, useState } from 'react';
import { ApiError, type PlanItem } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  ErrorState,
  GhostButton,
  LoadingState,
  Muted,
  PrimaryButton,
  Row,
  Screen,
  SectionTitle,
  Title,
  XStack,
  YStack,
} from '@gymos/ui';
import { useClientDetail, useGeneratePlan, usePatchPlan, usePlan, usePublishPlan } from '../../api';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Plan view + editor: generate, tune portions, publish. Numbers are server truth. */
export const PlanScreen = ({ clientId }: { clientId: string }) => {
  const detail = useClientDetail(clientId);
  const generate = useGeneratePlan(clientId);
  const [day, setDay] = useState(1);

  const planSummary = useMemo(() => {
    const plans = detail.data?.plans ?? [];
    return (
      plans.find((p) => p.status === 'NEEDS_REVIEW') ??
      plans.find((p) => p.status === 'DRAFT') ??
      plans.find((p) => p.status === 'PUBLISHED') ??
      null
    );
  }, [detail.data]);

  const plan = usePlan(planSummary?.id ?? null);

  if (detail.isPending || (planSummary !== null && plan.isPending)) return <LoadingState />;
  if (detail.isError) {
    return (
      <Screen>
        <ErrorState message="Could not load." retry={() => void detail.refetch()} />
      </Screen>
    );
  }

  const blocked =
    generate.error instanceof ApiError && generate.error.code === 'BLOCKED_REQUIRES_OVERRIDE';

  if (planSummary === null || plan.data === undefined) {
    return (
      <Screen>
        <Title>Meal plan</Title>
        {detail.data.goal === null ? (
          <Card>
            <Body>Set a goal first — the plan is generated from its targets.</Body>
          </Card>
        ) : (
          <Card gap="$3">
            <Body>
              Generate a 7-day plan for{' '}
              <Body fontWeight="800">{detail.data.goal.initialTargets?.kcal ?? '—'} kcal</Body>{' '}
              honoring every dietary restriction.
            </Body>
            {blocked ? (
              <OverridePrompt
                onConfirm={(reason) => generate.mutate({ reason })}
                busy={generate.isPending}
                detail={generate.error instanceof ApiError ? (generate.error.detail ?? '') : ''}
              />
            ) : (
              <PrimaryButton
                disabled={generate.isPending}
                onPress={() => generate.mutate(undefined)}
              >
                {generate.isPending ? 'Generating…' : 'Generate 7-day plan'}
              </PrimaryButton>
            )}
            {generate.isError && !blocked ? (
              <Body color="$danger">{generate.error.message}</Body>
            ) : null}
          </Card>
        )}
      </Screen>
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

const OverridePrompt = ({
  onConfirm,
  busy,
  detail,
}: {
  onConfirm: (reason: string) => void;
  busy: boolean;
  detail: string;
}) => {
  const [reason, setReason] = useState('');
  return (
    <YStack gap="$2" borderWidth={2} borderColor="$danger" borderRadius="$4" padding="$3">
      <Body fontWeight="800" color="$danger">
        Safety gate: {detail || 'this client requires a coach override'}
      </Body>
      <Muted>
        Auto-generation is blocked (under-16 / pregnancy / medical restriction). Provide a reason —
        it is permanently logged and a physician disclaimer attaches to the plan.
      </Muted>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        style={{ width: '100%', padding: 8, borderRadius: 8 }}
        placeholder="e.g. Cleared by physician letter dated…"
      />
      <PrimaryButton
        disabled={busy || reason.trim().length < 5}
        onPress={() => onConfirm(reason.trim())}
        backgroundColor="$danger"
      >
        {busy ? 'Generating…' : 'Override and generate'}
      </PrimaryButton>
    </YStack>
  );
};

const PlanEditor = ({
  clientId,
  planId,
  status,
  targets,
  items,
  day,
  setDay,
  version,
}: {
  clientId: string;
  planId: string;
  status: string;
  targets: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  items: PlanItem[];
  day: number;
  setDay: (d: number) => void;
  version: number;
}) => {
  const patch = usePatchPlan(planId, clientId);
  const publish = usePublishPlan(planId, clientId);
  const editable = status === 'DRAFT' || status === 'NEEDS_REVIEW';

  const dayItems = items.filter((i) => i.day === day);
  const meals = [...new Map(dayItems.map((i) => [i.mealIndex, i.mealName])).entries()].sort(
    (a, b) => a[0] - b[0],
  );
  const dayTotals = dayItems.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.macros.kcal,
      proteinG: acc.proteinG + i.macros.proteinG,
      fatG: acc.fatG + i.macros.fatG,
      carbsG: acc.carbsG + i.macros.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
  const kcalDeltaPct = ((dayTotals.kcal - targets.kcal) / targets.kcal) * 100;

  const step = (item: PlanItem, direction: 1 | -1) => {
    const next = Math.max(
      10,
      item.portionGrams + direction * Math.max(10, item.portionGrams * 0.25),
    );
    patch.mutate([{ op: 'set-portion', itemId: item.id, portionGrams: Math.round(next) }]);
  };

  return (
    <Screen>
      <Row>
        <Title>Plan v{version}</Title>
        <Badge
          tone={
            status === 'PUBLISHED' ? 'success' : status === 'NEEDS_REVIEW' ? 'danger' : 'warning'
          }
          label={status}
        />
      </Row>

      {status === 'NEEDS_REVIEW' ? (
        <Card borderColor="$danger" borderWidth={2}>
          <Body color="$danger" fontWeight="700">
            Dietary profile changed. Do not follow this plan — review and re-publish (or regenerate)
            first.
          </Body>
        </Card>
      ) : null}

      {/* Live totals vs targets — recomputed from server macros on every edit. */}
      <Card>
        <Row>
          <Body fontWeight="800">
            {Math.round(dayTotals.kcal)} / {targets.kcal} kcal
          </Body>
          <Badge
            tone={Math.abs(kcalDeltaPct) <= 5 ? 'success' : 'warning'}
            label={`${kcalDeltaPct > 0 ? '+' : ''}${kcalDeltaPct.toFixed(1)}%`}
          />
        </Row>
        <Muted>
          P {Math.round(dayTotals.proteinG)}/{targets.proteinG}g · F {Math.round(dayTotals.fatG)}/
          {targets.fatG}g · C {Math.round(dayTotals.carbsG)}/{targets.carbsG}g
        </Muted>
      </Card>

      <XStack gap="$1.5" flexWrap="wrap">
        {DAY_LABELS.map((label, index) => (
          <GhostButton
            key={label}
            size="$2"
            flex={1}
            minWidth={40}
            onPress={() => setDay(index + 1)}
            backgroundColor={day === index + 1 ? '$primary' : 'transparent'}
            color={day === index + 1 ? '$primaryFg' : '$color'}
          >
            {label}
          </GhostButton>
        ))}
      </XStack>

      {meals.map(([mealIndex, mealName]) => (
        <YStack key={mealIndex} gap="$2">
          <SectionTitle>{mealName}</SectionTitle>
          {dayItems
            .filter((i) => i.mealIndex === mealIndex)
            .map((item) => (
              <Card key={item.id} gap="$1.5">
                <Row>
                  <YStack flex={1}>
                    <Body fontWeight="600">{item.mealName.split(' — ')[0]}</Body>
                    <Muted>
                      {item.portionGrams} g · {item.macros.kcal} kcal · P {item.macros.proteinG}g
                    </Muted>
                  </YStack>
                  {editable ? (
                    <XStack gap="$2">
                      <GhostButton
                        size="$3"
                        circular
                        onPress={() => step(item, -1)}
                        aria-label="Smaller portion"
                      >
                        −
                      </GhostButton>
                      <GhostButton
                        size="$3"
                        circular
                        onPress={() => step(item, 1)}
                        aria-label="Bigger portion"
                      >
                        +
                      </GhostButton>
                    </XStack>
                  ) : null}
                </Row>
                {item.prepNotes ? <Muted fontSize={12}>{item.prepNotes}</Muted> : null}
              </Card>
            ))}
        </YStack>
      ))}

      {patch.isError ? <Body color="$danger">{patch.error.message}</Body> : null}

      {editable ? (
        <PrimaryButton disabled={publish.isPending} onPress={() => publish.mutate()} marginTop="$2">
          {publish.isPending ? 'Publishing…' : 'Publish plan'}
        </PrimaryButton>
      ) : null}
      {publish.isError ? <Body color="$danger">{publish.error.message}</Body> : null}
      <Muted fontSize={11} textAlign="center">
        General fitness nutrition guidance — not medical advice.
      </Muted>
    </Screen>
  );
};
