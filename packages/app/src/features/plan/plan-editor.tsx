'use client';

import { useEffect, useState } from 'react';
import { ApiError, type PlanItem, type PlanSummary } from '@gymos/contracts';
import { downloadBlob } from '@gymos/platform';
import {
  Badge,
  Body,
  Card,
  GhostButton,
  IconButton,
  Muted,
  PageHeader,
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
import { PrepPreferencesBanner } from './prep-preferences-banner';

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

const dietPlanDownloadName = (clientName: string): string => {
  const first = clientName.trim().split(/\s+/)[0] ?? 'Client';
  const safe = first.replace(/[^\w\-]+/g, '').slice(0, 40);
  const titled = safe.length > 0 ? safe.charAt(0).toUpperCase() + safe.slice(1) : 'Client';
  return `${titled}-Diet-Plan.pdf`;
};

export const PlanEditor = ({
  clientId,
  clientName,
  planId,
  status,
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
  const editable = status === 'DRAFT' || status === 'NEEDS_REVIEW';
  const nextVersion = Math.max(...plans.map((p) => p.version), version) + 1;
  const hasPublished = plans.some((p) => p.status === 'PUBLISHED');

  useEffect(() => {
    setRegenOpen(false);
    setPdfError(null);
  }, [planId]);

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

  const onDownloadPdf = () => {
    setPdfError(null);
    downloadPdf.mutate(undefined, {
      onSuccess: (blob) => downloadBlob(blob, dietPlanDownloadName(clientName)),
      onError: (e) => setPdfError(e.message),
    });
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

      {plans.length > 1 ? (
        <YStack gap="$2">
          <Muted fontSize={13}>Versions</Muted>
          <SegmentedControl
            ariaLabel="Plan version"
            options={plans.map((p) => ({
              value: p.id,
              label: `v${p.version}`,
            }))}
            value={planId}
            onChange={onSelectPlan}
          />
          <Muted fontSize={12}>
            {plans.find((p) => p.id === planId)?.status ?? status}
            {status === 'SUPERSEDED' ? ' — superseded by a newer published plan' : ''}
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

      <PrepPreferencesBanner />

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
                    <XStack gap="$1.5">
                      <IconButton
                        tone="ghost"
                        onPress={() => step(item, -1)}
                        aria-label="Smaller portion"
                      >
                        −
                      </IconButton>
                      <IconButton
                        tone="ghost"
                        onPress={() => step(item, 1)}
                        aria-label="Bigger portion"
                      >
                        +
                      </IconButton>
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
        General fitness nutrition guidance — not medical advice. PDF matches the locked diet-plan
        template (Breakfast/Lunch options, Dinner list).
      </Muted>
    </AppScreen>
  );
};
