'use client';

import { type Restriction } from '@gymos/contracts';
import { formatRestrictionLabel } from '@gymos/core/nutrition';
import { GhostButton, XStack } from '@gymos/ui';
import { DIETARY_ALLERGENS, DIETARY_RELIGIOUS } from './dietary-catalog';

type Selection = Map<string, Restriction>;

export const DietaryChips = ({
  kind,
  selection,
  onToggle,
}: {
  kind: 'allergens' | 'religious';
  selection: Selection;
  onToggle: (code: string, type: Restriction['type']) => void;
}) => {
  const items =
    kind === 'allergens'
      ? DIETARY_ALLERGENS.map((a) => ({
          code: `allergen:${a}`,
          type: 'ALLERGY_SEVERE' as const,
          tone: 'danger' as const,
        }))
      : DIETARY_RELIGIOUS.map((r) => ({
          code: `religious:${r}`,
          type: 'RELIGIOUS' as const,
          tone: 'neutral' as const,
        }));

  return (
    <XStack gap="$2" flexWrap="wrap">
      {items.map(({ code, type, tone }) => {
        const active = selection.has(code);
        const selectedDanger = tone === 'danger' && active;
        const selectedNeutral = tone === 'neutral' && active;
        return (
          <GhostButton
            key={code}
            onPress={() => onToggle(code, type)}
            backgroundColor={selectedDanger ? '$dangerMuted' : '$elevatedBg'}
            color={selectedDanger ? '$danger' : selectedNeutral ? '$primary' : '$color'}
            borderColor={selectedDanger ? '$danger' : selectedNeutral ? '$primary' : '$borderColor'}
            opacity={active ? 1 : 0.85}
            aria-pressed={active}
          >
            {formatRestrictionLabel(code)}
          </GhostButton>
        );
      })}
    </XStack>
  );
};
