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
      gap="0-5"
      flexWrap="wrap"
      backgroundColor="elevatedBg"
      borderRadius={999}
      padding="1"
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
            borderRadius={999}
            paddingHorizontal="2"
            backgroundColor={`${selected ? 'surface' : 'transparent'} hover:surface`}
            cursor="pointer"
            opacity="press:0.9"
            outlineWidth="focus-visible:2px"
            outlineColor="focus-visible:focusRing"
            outlineStyle="focus-visible:solid"
            onPress={() => {
              startTransition(() => onChange(option.value));
            }}
            tabIndex={0}
          >
            <Text
              fontFamily="heading"
              fontWeight="500"
              fontSize={12}
              lineHeight="16px"
              color={selected ? 'color' : 'textMuted'}
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
    gap="1"
    borderBottomWidth={1}
    borderBottomColor="border-color"
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
          borderBottomWidth={2}
          borderBottomColor={selected ? 'primary' : 'transparent'}
          marginBottom={-1}
          cursor="pointer"
          opacity="hover:0.88 press:0.88"
          outlineWidth="focus-visible:2px"
          outlineColor="focus-visible:focusRing"
          outlineStyle="focus-visible:solid"
          onPress={() => {
            startTransition(() => onChange(item.id));
          }}
          tabIndex={0}
        >
          <Text
            fontFamily="heading"
            fontWeight={selected ? '800' : '500'}
            fontSize={14}
            color={selected ? 'color' : 'textMuted'}
          >
            {item.label}
          </Text>
        </YStack>
      );
    })}
  </XStack>
);
