'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Food, type Restriction } from '@gymos/contracts';
import { formatRestrictionLabel } from '@gymos/core/nutrition';
import {
  AlertBanner,
  Badge,
  Body,
  Card,
  ErrorState,
  GhostButton,
  IconButton,
  Muted,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  Row,
  StickyFormFooter,
  Text,
  X,
  YStack,
} from '@gymos/ui';
import { useClientDetail, usePutDietary } from '../../api';
import { PlanFoodPicker } from '../plan/plan-food-picker';
import { AppScreen } from '../shell/app-screen';
import { DietaryChips } from './dietary-chips';
import { DietarySkeleton } from './dietary-skeleton';

type Selection = Map<string, Restriction>;

/** Dietary profile editor — every save immediately re-validates the live plan. */
export const DietaryScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const detail = useClientDetail(clientId);
  const put = usePutDietary(clientId);
  const [selection, setSelection] = useState<Selection>(new Map());
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);
  const [addPreferredOpen, setAddPreferredOpen] = useState(false);

  const profile = detail.data?.dietaryProfile;

  useEffect(() => {
    if (detail.data === undefined) return;
    const version = detail.data.dietaryProfile?.version ?? 0;
    if (loadedVersion === version) return;
    const next: Selection = new Map();
    for (const r of detail.data.dietaryProfile?.restrictions ?? []) {
      next.set(r.code, r);
    }
    setSelection(next);
    setLoadedVersion(version);
  }, [detail.data, loadedVersion]);

  if (detail.isPending) {
    return <DietarySkeleton />;
  }
  if (detail.isError) {
    return (
      <AppScreen>
        <ErrorState message="Could not load dietary profile." retry={() => void detail.refetch()} />
      </AppScreen>
    );
  }

  const toggle = (code: string, type: Restriction['type']) => {
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(code)) next.delete(code);
      else next.set(code, { type, code });
      return next;
    });
  };

  const preferredEntries = [...selection.values()].filter((r) => r.type === 'PREFERRED');

  // ADR-0015 D6 — boosts the food's odds of being picked by the solver;
  // never overrides an allergy or exclusion above. `note` caches the food's
  // display name at add time so the list never needs a separate lookup for
  // a code that is otherwise just an opaque `preferred:<uuid>`.
  const addPreferred = (food: Food) => {
    setSelection((current) => {
      const next = new Map(current);
      next.set(`preferred:${food.id}`, {
        type: 'PREFERRED',
        code: `preferred:${food.id}`,
        note: food.name,
      });
      return next;
    });
    setAddPreferredOpen(false);
  };

  const removePreferred = (code: string) => {
    setSelection((current) => {
      const next = new Map(current);
      next.delete(code);
      return next;
    });
  };

  const save = () => {
    if (put.isPending) return;
    put.mutate([...selection.values()], {
      onSuccess: (result) => {
        if (!result.planFlagged) router.back();
      },
    });
  };

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <OutlineButton flex={1} onPress={() => router.back()}>
            Cancel
          </OutlineButton>
          <PrimaryButton flex={1} disabled={put.isPending} onPress={save}>
            {put.isPending ? 'Saving & re-validating…' : 'Save profile'}
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <PageHeader
        title="Dietary profile"
        subtitle={`Version ${profile?.version ?? 0} · changes re-validate the live plan`}
      />

      <Card tone="danger" padding="$4">
        <Text
          fontFamily="$heading"
          fontSize={14}
          fontWeight="500"
          color="$danger"
          marginBottom="$2"
        >
          Severe allergies
        </Text>
        <DietaryChips kind="allergens" selection={selection} onToggle={toggle} />
        <Muted fontSize={12} marginTop="$3">
          Severe allergies are hard blocks in the meal engine.
        </Muted>
      </Card>

      <Card padding="$4">
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color" marginBottom="$2">
          Religious / lifestyle
        </Text>
        <DietaryChips kind="religious" selection={selection} onToggle={toggle} />
      </Card>

      <Card padding="$4" gap="$3">
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          Preferred foods
        </Text>
        <Muted fontSize={12}>
          Boosts these foods&apos; odds of being picked by the AI planner. Never overrides an
          allergy or exclusion above.
        </Muted>
        {preferredEntries.length > 0 ? (
          <YStack gap="$1">
            {preferredEntries.map((r) => (
              <Row key={r.code} minHeight={44}>
                <Body flex={1} minWidth={0}>
                  {r.note ?? formatRestrictionLabel(r.code)}
                </Body>
                <IconButton
                  aria-label={`Remove ${r.note ?? formatRestrictionLabel(r.code)} from preferred foods`}
                  icon={<X size={16} color="$color" />}
                  onPress={() => removePreferred(r.code)}
                />
              </Row>
            ))}
          </YStack>
        ) : null}
        <GhostButton onPress={() => setAddPreferredOpen((open) => !open)}>
          {addPreferredOpen ? 'Cancel' : '+ Add preferred food'}
        </GhostButton>
        {addPreferredOpen ? <PlanFoodPicker busy={put.isPending} onSelect={addPreferred} /> : null}
      </Card>

      {put.data?.planFlagged ? (
        <AlertBanner tone="danger" title="The published plan violates the new restrictions.">
          <Body fontSize={12.5}>
            It has been blocked (NEEDS_REVIEW) and flagged. Regenerate or edit it before the client
            follows it further.
          </Body>
          <Badge tone="danger" label="Plan blocked" />
        </AlertBanner>
      ) : null}

      {put.isError ? (
        <Body color="$danger" role="alert">
          {put.error.message}
        </Body>
      ) : null}
    </AppScreen>
  );
};
