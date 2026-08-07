'use client';

import { useState } from 'react';
import type { Food, PlanItem, PlanOp } from '@gymos/contracts';
import {
  Badge,
  Body,
  Card,
  FormField,
  GhostButton,
  IconButton,
  Muted,
  Row,
  XStack,
  YStack,
} from '@gymos/ui';
import { useFoods } from '../../api';

/** Single plan line — portion, swap, optional macro override. */
export const PlanItemCard = ({
  item,
  editable,
  busy,
  onPatch,
}: {
  item: PlanItem;
  editable: boolean;
  busy: boolean;
  onPatch: (ops: PlanOp[]) => void;
}) => {
  const [swapOpen, setSwapOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [kcal, setKcal] = useState(String(item.macros.kcal));
  const [proteinG, setProteinG] = useState(String(item.macros.proteinG));
  const [fatG, setFatG] = useState(String(item.macros.fatG));
  const [carbsG, setCarbsG] = useState(String(item.macros.carbsG));
  const foods = useFoods(query.length >= 2 ? query : undefined);

  const step = (direction: 1 | -1) => {
    const next = Math.max(
      10,
      item.portionGrams + direction * Math.max(10, item.portionGrams * 0.25),
    );
    onPatch([{ op: 'set-portion', itemId: item.id, portionGrams: Math.round(next) }]);
  };

  const swapTo = (food: Food) => {
    onPatch([{ op: 'swap', itemId: item.id, foodId: food.id }]);
    setSwapOpen(false);
    setQuery('');
  };

  const applyOverride = () => {
    onPatch([
      {
        op: 'override-macros',
        itemId: item.id,
        macros: {
          kcal: Number(kcal),
          proteinG: Number(proteinG),
          fatG: Number(fatG),
          carbsG: Number(carbsG),
        },
        reason: 'Coach override',
      },
    ]);
    setOverrideOpen(false);
  };

  return (
    <Card gap="$2">
      <Row>
        <YStack flex={1} gap="$1">
          <XStack gap="$2" alignItems="center" flexWrap="wrap">
            <Body fontWeight="700">{item.foodName}</Body>
            {item.macrosSource === 'coach_override' ? (
              <Badge tone="warning" label="Override" />
            ) : null}
          </XStack>
          <Muted>
            {item.portionGrams} g · {item.macros.kcal} kcal · P {item.macros.proteinG}g · F{' '}
            {item.macros.fatG}g · C {item.macros.carbsG}g
          </Muted>
        </YStack>
        {editable ? (
          <XStack gap="$1.5">
            <IconButton tone="ghost" onPress={() => step(-1)} aria-label="Smaller portion">
              −
            </IconButton>
            <IconButton tone="ghost" onPress={() => step(1)} aria-label="Bigger portion">
              +
            </IconButton>
          </XStack>
        ) : null}
      </Row>
      {item.prepNotes ? <Muted fontSize={12}>{item.prepNotes}</Muted> : null}
      {editable ? (
        <XStack gap="$2" flexWrap="wrap">
          <GhostButton
            disabled={busy}
            onPress={() => {
              setSwapOpen((o) => !o);
              setOverrideOpen(false);
            }}
          >
            {swapOpen ? 'Cancel swap' : 'Swap food'}
          </GhostButton>
          <GhostButton
            disabled={busy}
            onPress={() => {
              setOverrideOpen((o) => !o);
              setSwapOpen(false);
              setKcal(String(item.macros.kcal));
              setProteinG(String(item.macros.proteinG));
              setFatG(String(item.macros.fatG));
              setCarbsG(String(item.macros.carbsG));
            }}
          >
            {overrideOpen ? 'Cancel macros' : 'Override macros'}
          </GhostButton>
        </XStack>
      ) : null}
      {swapOpen ? (
        <YStack gap="$2">
          <FormField
            label="Search foods"
            value={query}
            onChangeText={setQuery}
            placeholder="Type at least 2 characters"
            autoCapitalize="none"
          />
          {foods.isFetching ? <Muted fontSize={12}>Searching…</Muted> : null}
          {(foods.data?.items ?? [])
            .filter((f) => f.id !== item.foodId)
            .slice(0, 8)
            .map((food) => (
              <GhostButton key={food.id} disabled={busy} onPress={() => swapTo(food)}>
                {food.name} · {Math.round(food.per100g.kcal)} kcal/100g
              </GhostButton>
            ))}
        </YStack>
      ) : null}
      {overrideOpen ? (
        <YStack gap="$2">
          <Muted fontSize={12}>Coach-entered macros (audited). Food stays the same.</Muted>
          <FormField label="kcal" value={kcal} onChangeText={setKcal} inputMode="numeric" />
          <FormField
            label="Protein g"
            value={proteinG}
            onChangeText={setProteinG}
            inputMode="decimal"
          />
          <FormField label="Fat g" value={fatG} onChangeText={setFatG} inputMode="decimal" />
          <FormField label="Carbs g" value={carbsG} onChangeText={setCarbsG} inputMode="decimal" />
          <GhostButton disabled={busy} onPress={applyOverride}>
            Save override
          </GhostButton>
        </YStack>
      ) : null}
    </Card>
  );
};
