'use client';

import { Card, MetricHero, Muted, Stat, Text, XStack, YStack } from '@gymos/ui';
import type { GoalPreview } from '../../lib/goal-preview';
import { formatGoalEta, formatPreviewDate } from '../../lib/goal-preview';

export const GoalEnergySummary = ({ preview }: { preview: GoalPreview }) => {
  const isDeficit = preview.dailyEnergyDeltaKcal < 0;
  const isSurplus = preview.dailyEnergyDeltaKcal > 0;
  const energyLabel = isDeficit ? 'Daily deficit' : isSurplus ? 'Daily surplus' : 'Energy balance';

  return (
    <Card backgroundColor="$elevatedBg" padding="$4" gap="$4">
      <XStack flexWrap="wrap" gap="$5" alignItems="flex-start">
        <YStack flexGrow={1} minWidth={180} gap="$2">
          <MetricHero
            label="Daily calorie target"
            value={preview.targetKcal.toLocaleString()}
            unit="kcal"
            tone={
              preview.safetyIssue !== null || preview.paceAdjustment !== null
                ? 'warning'
                : 'primary'
            }
            delta={
              <Muted>
                Based on a {preview.tdeeKcal.toLocaleString()} kcal maintenance estimate
              </Muted>
            }
          />
        </YStack>

        <YStack flexGrow={1} minWidth={180} gap="$2">
          <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={1}>
            Expected timeline
          </Muted>
          <Text fontFamily="$heading" fontSize={24} fontWeight="800" color="$color">
            {formatGoalEta(preview.etaWeeks)}
          </Text>
          <Muted>{formatPreviewDate(preview.estimatedTargetDate)}</Muted>
        </YStack>
      </XStack>

      <XStack
        borderTopWidth={1}
        borderColor="$borderColor"
        paddingTop="$3"
        gap="$4"
        flexWrap="wrap"
      >
        <YStack flexGrow={1} minWidth={120}>
          <Stat label="BMR" value={preview.bmrKcal.toLocaleString()} unit="kcal" hint="At rest" />
        </YStack>
        <YStack flexGrow={1} minWidth={120}>
          <Stat
            label="TDEE"
            value={preview.tdeeKcal.toLocaleString()}
            unit="kcal"
            hint="Estimated maintenance"
          />
        </YStack>
        <YStack flexGrow={1} minWidth={130}>
          <Stat
            label={energyLabel}
            value={Math.abs(preview.dailyEnergyDeltaKcal).toLocaleString()}
            unit="kcal"
            hint={
              isDeficit
                ? `${Math.round(preview.deficitPct * 100)}% below maintenance`
                : isSurplus
                  ? 'Above maintenance'
                  : 'Maintenance'
            }
          />
        </YStack>
      </XStack>
    </Card>
  );
};
