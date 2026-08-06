'use client';

import type { ComponentProps } from 'react';
import { YStack } from 'tamagui';

type HitTargetProps = ComponentProps<typeof YStack> & {
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

/** Absolute hit overlay — mouse enter/leave for web hover, onPress for native. */
export const HitTarget = (props: HitTargetProps) => <YStack {...props} />;
