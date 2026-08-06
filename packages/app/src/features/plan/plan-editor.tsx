'use client';

import { type PlanItem } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  GhostButton,
  Muted,
  PageHeader,
  PrimaryButton,
  Row,
  SectionTitle,
  SegmentedControl,
  XStack,
  YStack,
} from '@gymos/ui';
import { usePatchPlan, usePublishPlan } from '../../api';
import { AppScreen } from '../shell/app-screen';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

export const PlanEditor = ({
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
    <AppScreen>
      <PageHeader
        title={`Plan v${version}`}
        action={
          <Badge
            tone={
              status === 'PUBLISHED' ? 'success' : status === 'NEEDS_REVIEW' ? 'danger' : 'warning'
            }
            label={status}
          />
        }
      />

      {status === 'NEEDS_REVIEW' ? (
        <Card tone="danger">
          <Body color="$danger" fontWeight="700">
            Dietary profile changed. Do not follow this plan — review and re-publish (or regenerate)
            first.
          </Body>
        </Card>
      ) : null}

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

      <SegmentedControl
        ariaLabel="Plan day"
        options={[...DAY_OPTIONS]}
        value={day}
        onChange={setDay}
      />

      {meals.map(([mealIndex, mealName]) => (
        <YStack key={mealIndex} gap="$2">
          <SectionTitle>{mealName}</SectionTitle>
          {dayItems
            .filter((i) => i.mealIndex === mealIndex)
            .map((item) => (
              <Card key={item.id} gap="$2">
                <Row>
                  <YStack flex={1} gap="$1">
                    <Body fontWeight="700">{item.foodName}</Body>
                    <Muted>
                      {item.portionGrams} g · {item.macros.kcal} kcal · P {item.macros.proteinG}g
                    </Muted>
                  </YStack>
                  {editable ? (
                    <XStack gap="$2">
                      <GhostButton
                        circular
                        minHeight={44}
                        minWidth={44}
                        onPress={() => step(item, -1)}
                        aria-label="Smaller portion"
                      >
                        −
                      </GhostButton>
                      <GhostButton
                        circular
                        minHeight={44}
                        minWidth={44}
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

      {patch.isError ? (
        <Body color="$danger" role="alert">
          {patch.error.message}
        </Body>
      ) : null}

      {editable ? (
        <PrimaryButton disabled={publish.isPending} onPress={() => publish.mutate()}>
          {publish.isPending ? 'Publishing…' : 'Publish plan'}
        </PrimaryButton>
      ) : null}
      {publish.isError ? (
        <Body color="$danger" role="alert">
          {publish.error.message}
        </Body>
      ) : null}
      <Muted fontSize={12} textAlign="center">
        General fitness nutrition guidance — not medical advice.
      </Muted>
    </AppScreen>
  );
};
