'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { type Restriction } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  ErrorState,
  GhostButton,
  LoadingState,
  Muted,
  PageHeader,
  PrimaryButton,
  SectionTitle,
  XStack,
} from '@gymos/ui';
import { useClientDetail, usePutDietary } from '../../api';
import { AppScreen } from '../shell/app-screen';

const ALLERGENS = [
  'peanut',
  'tree_nut',
  'milk',
  'egg',
  'fish',
  'shellfish',
  'soy',
  'wheat_gluten',
  'sesame',
] as const;

const RELIGIOUS = ['halal', 'vegetarian', 'vegan', 'no_beef'] as const;

type Selection = Map<string, Restriction>;

/** Dietary profile editor — every save immediately re-validates the live plan. */
export const DietaryScreen = ({ clientId }: { clientId: string }) => {
  const router = useRouter();
  const detail = useClientDetail(clientId);
  const put = usePutDietary(clientId);
  const [selection, setSelection] = useState<Selection>(new Map());
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);

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
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
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

  const save = () => {
    if (put.isPending) return;
    put.mutate([...selection.values()], {
      onSuccess: (result) => {
        if (!result.planFlagged) router.back();
      },
    });
  };

  const chip = (
    code: string,
    label: string,
    type: Restriction['type'],
    tone: 'danger' | 'neutral',
  ) => {
    const active = selection.has(code);
    return (
      <GhostButton
        key={code}
        onPress={() => toggle(code, type)}
        backgroundColor={active ? (tone === 'danger' ? '$danger' : '$primary') : 'transparent'}
        color={active ? (tone === 'danger' ? '$dangerFg' : '$primaryFg') : '$color'}
        borderColor={active ? (tone === 'danger' ? '$danger' : '$primary') : '$borderColor'}
        aria-pressed={active}
      >
        {label}
      </GhostButton>
    );
  };

  return (
    <AppScreen>
      <PageHeader
        title="Dietary profile"
        subtitle={`Version ${profile?.version ?? 0} · changes re-validate the live plan`}
      />

      <SectionTitle>Severe allergies</SectionTitle>
      <Card>
        <XStack gap="$2" flexWrap="wrap">
          {ALLERGENS.map((a) =>
            chip(`allergen:${a}`, a.replaceAll('_', ' '), 'ALLERGY_SEVERE', 'danger'),
          )}
        </XStack>
      </Card>

      <SectionTitle>Religious / lifestyle</SectionTitle>
      <Card>
        <XStack gap="$2" flexWrap="wrap">
          {RELIGIOUS.map((r) =>
            chip(`religious:${r}`, r.replaceAll('_', ' '), 'RELIGIOUS', 'neutral'),
          )}
        </XStack>
      </Card>

      {put.data?.planFlagged ? (
        <Card tone="danger" gap="$2">
          <Body color="$danger" fontWeight="800">
            The published plan violates the new restrictions.
          </Body>
          <Body>
            It has been blocked (NEEDS_REVIEW) and flagged — regenerate or edit it before the client
            follows it further.
          </Body>
          <Badge tone="danger" label="Plan blocked" />
        </Card>
      ) : null}

      {put.isError ? (
        <Body color="$danger" role="alert">
          {put.error.message}
        </Body>
      ) : null}
      <PrimaryButton disabled={put.isPending} onPress={save}>
        {put.isPending ? 'Saving & re-validating…' : 'Save profile'}
      </PrimaryButton>
      <Muted fontSize={12}>Severe allergies are hard blocks in the meal engine.</Muted>
    </AppScreen>
  );
};
