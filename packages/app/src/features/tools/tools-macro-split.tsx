'use client';

import { useState } from 'react';
import { Body, Card, FormField, Muted, Stat, XStack, YStack } from '@gymos/ui';

type MacroPreset = {
  id: string;
  label: string;
  proteinPct: number;
  fatPct: number;
  carbPct: number;
};

const PRESETS = [
  { id: 'balanced', label: 'Balanced', proteinPct: 30, fatPct: 30, carbPct: 40 },
  { id: 'high-protein', label: 'High protein', proteinPct: 40, fatPct: 30, carbPct: 30 },
  { id: 'low-carb', label: 'Low carb', proteinPct: 40, fatPct: 40, carbPct: 20 },
] as const satisfies readonly MacroPreset[];

const DEFAULT_PRESET = PRESETS[0];

const KCAL_PER_G = { protein: 4, fat: 9, carb: 4 } as const;

const parsePositive = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Macro split presets with optional kcal → grams. */
export const ToolsMacroSplit = () => {
  const [presetId, setPresetId] = useState<string>(DEFAULT_PRESET.id);
  const [kcal, setKcal] = useState('2200');

  const preset = PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PRESET;
  const calories = parsePositive(kcal);

  const proteinG =
    calories !== null
      ? Math.round((calories * (preset.proteinPct / 100)) / KCAL_PER_G.protein)
      : null;
  const fatG =
    calories !== null ? Math.round((calories * (preset.fatPct / 100)) / KCAL_PER_G.fat) : null;
  const carbG =
    calories !== null ? Math.round((calories * (preset.carbPct / 100)) / KCAL_PER_G.carb) : null;

  return (
    <YStack gap="$4">
      <YStack gap="$2">
        {PRESETS.map((p) => {
          const selected = p.id === preset.id;
          return (
            <Card
              key={p.id}
              interactive
              tone={selected ? 'accent' : 'default'}
              onPress={() => setPresetId(p.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <XStack alignItems="center" justifyContent="space-between" gap="$3">
                <Body fontFamily="$heading" fontWeight="700">
                  {p.label}
                </Body>
                <Muted fontFamily="$mono" fontSize={13}>
                  P {p.proteinPct}% · F {p.fatPct}% · C {p.carbPct}%
                </Muted>
              </XStack>
            </Card>
          );
        })}
      </YStack>

      <FormField
        label="Daily calories"
        value={kcal}
        onChangeText={setKcal}
        inputMode="numeric"
        unit="kcal"
        hint="Grams use 4 / 9 / 4 kcal per gram for P / F / C"
      />

      <Card>
        <XStack gap="$4" flexWrap="wrap">
          <Stat
            label="Protein"
            value={proteinG !== null ? String(proteinG) : '—'}
            hint={`${preset.proteinPct}% · g`}
          />
          <Stat
            label="Fat"
            value={fatG !== null ? String(fatG) : '—'}
            hint={`${preset.fatPct}% · g`}
          />
          <Stat
            label="Carbs"
            value={carbG !== null ? String(carbG) : '—'}
            hint={`${preset.carbPct}% · g`}
          />
        </XStack>
      </Card>
    </YStack>
  );
};
