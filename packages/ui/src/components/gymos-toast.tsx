'use client';

import { Text, XStack } from 'tamagui';
import { Check } from '../icons';

type GymosToastProps = {
  show: boolean;
  children: string;
};

export const GymosToast = ({ show, children }: GymosToastProps) => {
  if (!show) return null;

  return (
    <XStack
      position="absolute"
      top={16}
      alignSelf="center"
      zIndex={40}
      alignItems="center"
      gap="$2"
      borderRadius={999}
      paddingHorizontal="$4"
      paddingVertical="$2"
      backgroundColor="$coachAccentWash"
      borderWidth={1}
      borderColor="$borderColor"
      shadowColor="rgba(0,0,0,0.06)"
      shadowOffset={{ width: 0, height: 1 }}
      shadowRadius={3}
      shadowOpacity={1}
      role="status"
      aria-live="polite"
      accessibilityLiveRegion="polite"
    >
      <Check size={14} color="$coachAccentText" />
      <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$coachAccentText">
        {children}
      </Text>
    </XStack>
  );
};
