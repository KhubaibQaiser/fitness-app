'use client';

import { useState } from 'react';
import type { Food } from '@gymos/contracts';
import { FormField, GhostButton, Muted, YStack } from '@gymos/ui';
import { useFoods } from '../../api';

/** Shared food search list for swap / add on the plan editor. */
export const PlanFoodPicker = ({
  busy,
  excludeFoodId,
  onSelect,
}: {
  busy: boolean;
  excludeFoodId?: string | undefined;
  onSelect: (food: Food) => void;
}) => {
  const [query, setQuery] = useState('');
  const foods = useFoods(query.length >= 2 ? query : undefined);

  return (
    <YStack gap="$2">
      <FormField
        label="Search foods"
        value={query}
        onChangeText={setQuery}
        placeholder="Type at least 2 characters"
        autoCapitalize="none"
        returnKeyType="search"
        enterKeyHint="search"
      />
      {foods.isFetching ? <Muted fontSize={12}>Searching…</Muted> : null}
      {(foods.data?.items ?? [])
        .filter((f) => f.id !== excludeFoodId)
        .slice(0, 8)
        .map((food) => (
          <GhostButton key={food.id} disabled={busy} onPress={() => onSelect(food)}>
            {food.name} · {Math.round(food.per100g.kcal)} kcal/100g
          </GhostButton>
        ))}
    </YStack>
  );
};
