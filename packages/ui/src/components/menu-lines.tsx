'use client';

import { YStack } from 'tamagui';

type MenuLinesProps = {
  size?: number | string;
  color?: string;
  opacity?: number;
};

/** Claude-style menu glyph: three left-aligned bars, longest to shortest. */
export const MenuLines = ({ size = 20, color = '$color', opacity }: MenuLinesProps) => {
  const px = typeof size === 'number' ? size : 20;
  return (
    <YStack width={px} height={px} justifyContent="center" gap={3} opacity={opacity}>
      <YStack height={2} width="100%" borderRadius={999} backgroundColor={color} />
      <YStack height={2} width="70%" borderRadius={999} backgroundColor={color} />
      <YStack height={2} width="40%" borderRadius={999} backgroundColor={color} />
    </YStack>
  );
};
