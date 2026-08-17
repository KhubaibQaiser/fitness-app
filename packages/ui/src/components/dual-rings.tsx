'use client';

import type { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { GradientRing } from './gradient-ring';

type DualRingsProps = {
  id: string;
  adherence: number;
  review: number;
  size?: number;
  children?: ReactNode;
};

export const DualRings = ({ id, adherence, review, size = 92, children }: DualRingsProps) => (
  <YStack width={size} height={size} alignItems="center" justifyContent="center" flexShrink={0}>
    <YStack position="absolute" inset={0} alignItems="center" justifyContent="center">
      <GradientRing id={`${id}-adherence`} value={adherence} size={size} stroke={8} role="client">
        {null}
      </GradientRing>
    </YStack>
    <YStack position="absolute" inset={0} alignItems="center" justifyContent="center">
      <GradientRing id={`${id}-review`} value={review} size={size - 26} stroke={7} role="coach">
        {null}
      </GradientRing>
    </YStack>
    {children ? (
      <YStack position="absolute" alignItems="center" justifyContent="center">
        {children}
      </YStack>
    ) : null}
  </YStack>
);
