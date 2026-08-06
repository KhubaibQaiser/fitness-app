'use client';

import {
  FAT_G_PER_KG_DEFAULT,
  FAT_G_PER_KG_MIN,
  FIBER_G_PER_1000_KCAL,
  KCAL_PER_G,
  PROTEIN_G_PER_KG,
  PROTEIN_G_PER_KG_MIN,
  type GoalPreset,
} from '@gymos/core/nutrition';
import { Body, Card, Muted, Text, XStack, YStack } from '@gymos/ui';
import { CriteriaRow } from './criteria-row';
import { FormulaBlock } from './formula-block';
import { PanelHeading } from './panel-heading';

const PRESET_ORDER: readonly GoalPreset[] = ['LOSE', 'RECOMP', 'MAINTAIN', 'GAIN'];

const PRESET_TITLES: Record<GoalPreset, string> = {
  LOSE: 'Lose fat',
  RECOMP: 'Recomp',
  MAINTAIN: 'Maintain',
  GAIN: 'Gain',
};

/** Protein / fat / carbs / fiber split. */
export const MacrosPanel = () => (
  <YStack gap="$4">
    <PanelHeading
      title="How macros are split"
      subtitle="Protein and fat first; carbs fill leftover calories; fiber is a separate gram target."
    />

    <Card gap="$0" paddingBottom="$1">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16} marginBottom="$2">
        Protein by goal
      </Body>
      <Muted marginBottom="$2" lineHeight={18}>
        Higher in a deficit to help preserve lean mass.
      </Muted>
      {PRESET_ORDER.map((preset) => (
        <CriteriaRow
          key={preset}
          label={PRESET_TITLES[preset]}
          value={`${PROTEIN_G_PER_KG[preset]} g/kg`}
        />
      ))}
    </Card>

    <Card gap="$0" paddingBottom="$1">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16} marginBottom="$2">
        Fat & carbs
      </Body>
      <CriteriaRow label="Fat (default)" value={`${FAT_G_PER_KG_DEFAULT} g/kg`} />
      <CriteriaRow
        label="Fat (minimum)"
        value={`${FAT_G_PER_KG_MIN} g/kg`}
        hint="If calories are too low for the default"
      />
      <CriteriaRow
        label="Protein floor"
        value={`${PROTEIN_G_PER_KG_MIN} g/kg`}
        hint="Last resort before the engine refuses the split"
      />
      <CriteriaRow
        label="Carbs"
        value="What’s left"
        hint="After protein and fat take their calorie share"
      />
    </Card>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        Calorie math (Atwater)
      </Body>
      <XStack gap="$2" flexWrap="wrap">
        {(
          [
            ['Protein', `${KCAL_PER_G.protein} kcal/g`],
            ['Carbs', `${KCAL_PER_G.carbs} kcal/g`],
            ['Fat', `${KCAL_PER_G.fat} kcal/g`],
          ] as const
        ).map(([label, value]) => (
          <YStack
            key={label}
            flex={1}
            minWidth={90}
            backgroundColor="$elevatedBg"
            borderRadius={12}
            borderWidth={1}
            borderColor="$borderColor"
            padding="$3"
            gap={4}
          >
            <Muted fontSize={11} fontWeight="700" textTransform="uppercase" letterSpacing={0.5}>
              {label}
            </Muted>
            <Text fontFamily="$heading" fontWeight="800" fontSize={16}>
              {value}
            </Text>
          </YStack>
        ))}
      </XStack>
      <FormulaBlock
        lines={[
          `Carbs (g) = remaining kcal ÷ ${KCAL_PER_G.carbs}`,
          'Remaining = target − (protein × 4) − (fat × 9)',
        ]}
      />
    </Card>

    <Card gap="$3">
      <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
        Fiber target
      </Body>
      <Muted lineHeight={19}>
        {FIBER_G_PER_1000_KCAL} grams per 1,000 kcal of the calorie target (IOM Adequate Intake).
      </Muted>
      <FormulaBlock lines={[`fiber (g) = round(${FIBER_G_PER_1000_KCAL} × target kcal ÷ 1000)`]} />
      <YStack
        backgroundColor="$elevatedBg"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        padding="$3"
      >
        <Muted fontSize={12} lineHeight={18}>
          Fiber is set as a goal target. Plan item totals still show calories, protein, fat, and
          carbs only — food fiber is stored but not summed in tracking yet.
        </Muted>
      </YStack>
    </Card>
  </YStack>
);
