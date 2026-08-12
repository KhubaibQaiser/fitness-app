'use client';

import { useEffect, useState } from 'react';
import { Link } from 'solito/link';
import { ApiError, type PlanItem, type PlanSummary } from '@gymos/contracts';
import { downloadBlob } from '@gymos/platform';
import {
  ArrowLeft,
  Badge,
  Body,
  Card,
  GhostButton,
  IconButton,
  Muted,
  PrimaryButton,
  Row,
  SectionTitle,
  SegmentedControl,
  XStack,
  YStack,
} from '@gymos/ui';
import { useDownloadDietPlanPdf, usePatchPlan, usePublishPlan } from '../../api';
import { AppScreen } from '../shell/app-screen';
import { OverridePrompt } from './override-prompt';
import { PlanFoodPicker } from './plan-food-picker';
import { PlanItemCard } from './plan-item-card';
import { PlanPublishConfirm } from './plan-publish-confirm';
import { PlanTitleHeader } from './plan-title-header';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
] as const;

const MEAL_COUNT_OPTIONS = [
  { value: 3, label: '3 meals' },
  { value: 4, label: '+1 snack' },
  { value: 5, label: '+2 snacks' },
] as const;

const SLOT_LABEL: Record<PlanItem['mealSlot'], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const dietPlanDownloadName = (clientName: string): string => {
  const first = clientName.trim().split(/\s+/)[0] ?? 'Client';
  const safe = first.replace(/[^\w\-]+/g, '').slice(0, 40);
  const titled = safe.length > 0 ? safe.charAt(0).toUpperCase() + safe.slice(1) : 'Client';
  return `${titled}-Diet-Plan.pdf`;
};

const daySignature = (items: readonly PlanItem[], day: number): string =>
  items
    .filter((i) => i.day === day)
    .map((i) => `${i.mealIndex}:${i.foodId}:${i.portionGrams}:${i.macros.kcal}:${i.macrosSource}`)
    .sort()
    .join('|');

const planSwitcherLabel = (title: string | null, version: number): string => {
  if (title !== null && title.trim() !== '') {
    const t = title.trim();
    return t.length > 18 ? `${t.slice(0, 16)}…` : t;
  }
  return `v${version}`;
};

export const PlanEditor = ({
  clientId,
  clientName,
  planId,
  status,
  title,
  targets,
  items,
  day,
  setDay,
  version,
  plans,
  onSelectPlan,
  mealCount,
  setMealCount,
  onGenerate,
  generatePending,
  generateError,
  generateBlocked,
}: {
  clientId: string;
  clientName: string;
  planId: string;
  status: string;
  title: string | null;
  targets: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  items: PlanItem[];
  day: number;
  setDay: (d: number) => void;
  version: number;
  plans: PlanSummary[];
  onSelectPlan: (planId: string) => void;
  mealCount: 3 | 4 | 5;
  setMealCount: (n: 3 | 4 | 5) => void;
  onGenerate: (input?: { reason?: string; mealCount?: 3 | 4 | 5 }) => void;
  generatePending: boolean;
  generateError: Error | null;
  generateBlocked: boolean;
}) => {
  const patch = usePatchPlan(planId, clientId);
  const publish = usePublishPlan(planId, clientId);
  const downloadPdf = useDownloadDietPlanPdf(planId);
  const [regenOpen, setRegenOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [addMealIndex, setAddMealIndex] = useState<number | null>(null);
  const editable = status === 'DRAFT' || status === 'NEEDS_REVIEW';
  const nextVersion = Math.max(...plans.map((p) => p.version), version) + 1;
  const hasPublished = plans.some((p) => p.status === 'PUBLISHED');

  useEffect(() => {
    setRegenOpen(false);
    setPdfError(null);
    setAddMealIndex(null);
  }, [planId]);

  const dayItems = items.filter((i) => i.day === day);
  const meals = [
    ...new Map(dayItems.map((i) => [i.mealIndex, i.mealSlot] as const)).entries(),
  ].sort((a, b) => a[0] - b[0]);
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
  const templateSig = daySignature(items, 1);
  const dayCustomized = day !== 1 && daySignature(items, day) !== templateSig;

  const onDownloadPdf = () => {
    setPdfError(null);
    downloadPdf.mutate(undefined, {
      onSuccess: (blob) => downloadBlob(blob, dietPlanDownloadName(clientName)),
      onError: (e) => setPdfError(e.message),
    });
  };

  return (
    <AppScreen>
      <XStack alignItems="flex-start" gap="$2" width="100%">
        <Link href={`/clients/${clientId}`}>
          <IconButton aria-label="Back to client" icon={<ArrowLeft size={20} color="$color" />} />
        </Link>
        <YStack flex={1} minWidth={0}>
          <PlanTitleHeader
            title={title}
            version={version}
            status={status}
            editable={editable}
            busy={patch.isPending}
            onSave={(nextTitle) => patch.mutate([{ op: 'set-title', title: nextTitle }])}
          />
        </YStack>
      </XStack>

      {plans.length > 1 ? (
        <YStack gap="$2">
          <Muted fontSize={13}>Versions</Muted>
          <SegmentedControl
            ariaLabel="Plan version"
            options={plans.map((p) => ({
              value: p.id,
              label: planSwitcherLabel(p.title, p.version),
            }))}
            value={planId}
            onChange={onSelectPlan}
          />
          <Muted fontSize={12}>
            {plans.find((p) => p.id === planId)?.status ?? status}
            {status === 'SUPERSEDED' ? ' — superseded by a newer published plan' : ''}
            {` · v${version}`}
          </Muted>
        </YStack>
      ) : null}

      {status === 'NEEDS_REVIEW' ? (
        <Card tone="danger">
          <Body color="$danger" fontWeight="700">
            Dietary profile changed. Do not follow this plan — review and re-publish (or regenerate)
            first.
          </Body>
        </Card>
      ) : null}

      {editable ? (
        <Card tone="accent" gap="$2">
          <Body fontWeight="800">AI suggestion — review before publish</Body>
          <Muted>
            Same meals every day by default. Edit any day, or apply one day to the whole week.
            Publish only after you have reviewed the plan.
          </Muted>
        </Card>
      ) : null}

      {status !== 'DRAFT' ? (
        <>
          <XStack gap="$2" flexWrap="wrap">
            <GhostButton
              flex={1}
              minWidth={140}
              disabled={downloadPdf.isPending}
              onPress={onDownloadPdf}
            >
              {downloadPdf.isPending ? 'Preparing…' : 'Download PDF'}
            </GhostButton>
            <GhostButton
              flex={1}
              minWidth={140}
              disabled={generatePending}
              onPress={() => setRegenOpen((open) => !open)}
            >
              {regenOpen ? 'Cancel regenerate' : 'Regenerate'}
            </GhostButton>
          </XStack>
          {pdfError ? (
            <Body color="$danger" role="alert">
              {pdfError}
            </Body>
          ) : null}

          {regenOpen ? (
            <Card gap="$3" tone="accent">
              <Body fontWeight="800">Create draft v{nextVersion}</Body>
              <Muted>
                {hasPublished
                  ? 'Creates a new draft. The current published plan stays live until you publish this one.'
                  : 'Creates a new draft version. Publish when you are ready for the client to follow it.'}
              </Muted>
              <YStack gap="$2">
                <Muted fontSize={13}>Meals per day</Muted>
                <SegmentedControl
                  ariaLabel="Meals per day"
                  options={[...MEAL_COUNT_OPTIONS]}
                  value={mealCount}
                  onChange={setMealCount}
                />
              </YStack>
              {generateBlocked && generateError instanceof ApiError ? (
                <OverridePrompt
                  onConfirm={(reason) => onGenerate({ reason, mealCount })}
                  busy={generatePending}
                  detail={generateError.detail ?? ''}
                />
              ) : (
                <PrimaryButton disabled={generatePending} onPress={() => onGenerate({ mealCount })}>
                  {generatePending ? 'Generating…' : `Generate draft v${nextVersion}`}
                </PrimaryButton>
              )}
              {generateError && !generateBlocked ? (
                <Body color="$danger" role="alert">
                  {generateError.message}
                </Body>
              ) : null}
            </Card>
          ) : null}
        </>
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

      <YStack gap="$2">
        <SegmentedControl
          ariaLabel="Plan day"
          options={[...DAY_OPTIONS]}
          value={day}
          onChange={setDay}
        />
        {dayCustomized ? (
          <Badge tone="warning" label="Customized day" />
        ) : (
          <Muted fontSize={12}>Matches daily template</Muted>
        )}
        {editable ? (
          <GhostButton
            disabled={patch.isPending}
            onPress={() => patch.mutate([{ op: 'apply-day-to-week', day }])}
          >
            Apply this day to all days
          </GhostButton>
        ) : null}
      </YStack>

      {meals.map(([mealIndex, mealSlot]) => (
        <YStack key={mealIndex} gap="$2">
          <SectionTitle>{SLOT_LABEL[mealSlot]}</SectionTitle>
          {dayItems
            .filter((i) => i.mealIndex === mealIndex)
            .map((item) => (
              <PlanItemCard
                key={item.id}
                item={item}
                editable={editable}
                busy={patch.isPending}
                onPatch={(ops) => patch.mutate(ops)}
              />
            ))}
          {editable ? (
            <YStack gap="$2">
              <GhostButton
                disabled={patch.isPending}
                onPress={() =>
                  setAddMealIndex((current) => (current === mealIndex ? null : mealIndex))
                }
              >
                {addMealIndex === mealIndex ? 'Cancel add' : 'Add food'}
              </GhostButton>
              {addMealIndex === mealIndex ? (
                <PlanFoodPicker
                  busy={patch.isPending}
                  onSelect={(food) => {
                    patch.mutate([
                      {
                        op: 'add',
                        day,
                        mealIndex,
                        mealSlot,
                        foodId: food.id,
                        portionGrams: 100,
                      },
                    ]);
                    setAddMealIndex(null);
                  }}
                />
              ) : null}
            </YStack>
          ) : null}
        </YStack>
      ))}

      {patch.isError ? (
        <Body color="$danger" role="alert">
          {patch.error.message}
        </Body>
      ) : null}

      {editable ? (
        <PlanPublishConfirm
          busy={publish.isPending}
          error={publish.error}
          onPublish={(body) => publish.mutate(body)}
        />
      ) : null}
      {publish.isError &&
      !(publish.error instanceof ApiError && publish.error.code === 'DRIFT_ACK_REQUIRED') ? (
        <Body color="$danger" role="alert">
          {publish.error.message}
        </Body>
      ) : null}
      <Muted fontSize={12} textAlign="center">
        General fitness nutrition guidance — not medical advice. PDF matches the locked diet-plan
        template (Breakfast/Lunch options, Dinner list).
      </Muted>
    </AppScreen>
  );
};
