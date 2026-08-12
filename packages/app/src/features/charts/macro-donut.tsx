'use client';

import { XStack, YStack } from 'tamagui';
import { Muted } from '@gymos/ui';

export const MacroDonut = ({
  proteinG,
  carbsG,
  fatG,
  height = 200,
}: {
  proteinG: number;
  carbsG: number;
  fatG: number;
  height?: number;
}) => {
  const total = proteinG * 4 + carbsG * 4 + fatG * 9;
  const sum = Math.max(1, proteinG + carbsG + fatG);
  const pPct = Math.round((proteinG / sum) * 100);
  const cPct = Math.round((carbsG / sum) * 100);
  const fPct = Math.max(0, 100 - pPct - cPct);

  if (proteinG === 0 && carbsG === 0 && fatG === 0) {
    return (
      <YStack height={height} alignItems="center" justifyContent="center">
        <Muted>No macro data</Muted>
      </YStack>
    );
  }

  return (
    <YStack height={height} justifyContent="center" gap="$3">
      <XStack height={14} borderRadius={999} overflow="hidden" backgroundColor="$elevatedBg">
        <YStack width={`${pPct}%`} backgroundColor="$primary" />
        <YStack width={`${cPct}%`} backgroundColor="$accent" />
        <YStack width={`${fPct}%`} backgroundColor="$warning" />
      </XStack>
      <XStack justifyContent="space-between" flexWrap="wrap" gap="$2">
        <Muted fontSize={11}>P {proteinG}g</Muted>
        <Muted fontSize={11}>C {carbsG}g</Muted>
        <Muted fontSize={11}>F {fatG}g</Muted>
        <Muted fontSize={11}>{total} kcal</Muted>
      </XStack>
    </YStack>
  );
};
