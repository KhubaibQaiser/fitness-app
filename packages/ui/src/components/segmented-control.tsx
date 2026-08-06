'use client';

import { startTransition, useId } from 'react';
import { Text, XStack, YStack } from 'tamagui';

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
};

export const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) => {
  const groupId = useId();
  return (
    <XStack
      role="tablist"
      aria-label={ariaLabel}
      gap="$1.5"
      flexWrap="wrap"
      backgroundColor="$elevatedBg"
      borderRadius={14}
      padding="$1.5"
      borderWidth={1}
      borderColor="$borderColor"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <YStack
            key={String(option.value)}
            role="tab"
            aria-selected={selected}
            id={`${groupId}-${option.value}`}
            flex={1}
            minWidth={44}
            minHeight={44}
            alignItems="center"
            justifyContent="center"
            borderRadius={10}
            paddingHorizontal="$2"
            backgroundColor={selected ? '$primary' : 'transparent'}
            cursor="pointer"
            hoverStyle={{ backgroundColor: selected ? '$primary' : '$cardBg' }}
            pressStyle={{ opacity: 0.9 }}
            focusVisibleStyle={{
              outlineWidth: 2,
              outlineColor: '$focusRing',
              outlineStyle: 'solid',
            }}
            onPress={() => {
              startTransition(() => onChange(option.value));
            }}
            tabIndex={0}
          >
            <Text
              fontFamily="$heading"
              fontWeight="700"
              fontSize={13}
              color={selected ? '$primaryFg' : '$color'}
            >
              {option.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
};

export type TabItem = {
  id: string;
  label: string;
};

export const Tabs = ({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) => (
  <XStack
    role="tablist"
    aria-label={ariaLabel}
    gap="$1"
    borderBottomWidth={1}
    borderBottomColor="$borderColor"
    width="100%"
  >
    {items.map((item) => {
      const selected = item.id === value;
      return (
        <YStack
          key={item.id}
          role="tab"
          aria-selected={selected}
          flex={1}
          minHeight={48}
          alignItems="center"
          justifyContent="center"
          borderBottomWidth={3}
          borderBottomColor={selected ? '$primary' : 'transparent'}
          marginBottom={-1}
          cursor="pointer"
          hoverStyle={{ opacity: 0.85 }}
          pressStyle={{ opacity: 0.75 }}
          focusVisibleStyle={{
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
          }}
          onPress={() => {
            startTransition(() => onChange(item.id));
          }}
          tabIndex={0}
        >
          <Text
            fontFamily="$heading"
            fontWeight={selected ? '800' : '600'}
            fontSize={14}
            color={selected ? '$primary' : '$textMuted'}
          >
            {item.label}
          </Text>
        </YStack>
      );
    })}
  </XStack>
);
