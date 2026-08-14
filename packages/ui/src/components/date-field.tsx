'use client';

import { useState } from 'react';
import DateTimePicker, { useDefaultStyles, type DateType } from 'react-native-ui-datepicker';
import { Label, Text, useTheme, YStack } from 'tamagui';
import { ChevronLeft, ChevronRight } from '../icons';
import { Body, Muted } from './typography';

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Local calendar date — never UTC-shift a DOB or scheduled_for. */
export const toCalendarDate = (value: Date): string =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;

export const todayCalendarDate = (): string => toCalendarDate(new Date());

export const calendarDateYearsAgo = (years: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return toCalendarDate(date);
};

const fromPickerDate = (value: DateType): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    return match?.[1] ?? null;
  }
  if (typeof value === 'number') return toCalendarDate(new Date(value));
  if (value instanceof Date) return toCalendarDate(value);
  if (typeof value === 'object' && 'format' in value && typeof value.format === 'function') {
    const formatted: unknown = value.format('YYYY-MM-DD');
    return typeof formatted === 'string' ? formatted : null;
  }
  return null;
};

const formatDisplay = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const DateField = ({
  label,
  value,
  onChange,
  error = null,
  hint = null,
  required = false,
  maxDate,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  maxDate?: string;
  minDate?: string;
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const primary = String(theme.primary?.val ?? '#00A872');
  const color = String(theme.color?.val ?? '#111111');
  const muted = String(theme.textMuted?.val ?? '#666666');
  const cardBg = String(theme.cardBg?.val ?? '#F3F5F9');
  const border = String(theme.borderColor?.val ?? '#E0E0E0');
  // Tamagui theme, not OS color-scheme — in-app dark mode would otherwise keep light year labels.
  const defaultStyles = useDefaultStyles(
    color.replace('#', '').toLowerCase() === 'ffffff' ? 'dark' : 'light',
  );

  return (
    <YStack gap="$1.5" width="100%">
      <Label
        fontFamily="$heading"
        fontWeight="500"
        fontSize={12}
        color="$textMuted"
        textTransform="uppercase"
        letterSpacing={0.8}
      >
        {label}
        {required ? ' *' : ''}
      </Label>
      <YStack
        minHeight={48}
        height={48}
        borderWidth={1}
        borderColor={error ? '$danger' : '$borderColor'}
        backgroundColor="$cardBg"
        borderRadius="$radiusControl"
        paddingHorizontal="$3"
        justifyContent="center"
        cursor="pointer"
        role="button"
        aria-label={label}
        aria-expanded={open}
        onPress={() => setOpen((current) => !current)}
      >
        <Text fontFamily="$body" fontSize={15} color={value ? '$color' : '$placeholderColor'}>
          {value ? formatDisplay(value) : 'Select date'}
        </Text>
      </YStack>
      {open ? (
        <YStack
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$radiusControl"
          backgroundColor="$cardBg"
          padding="$2"
          overflow="hidden"
        >
          <DateTimePicker
            mode="single"
            date={value || undefined}
            maxDate={maxDate}
            minDate={minDate}
            onChange={({ date }) => {
              const next = fromPickerDate(date);
              if (next === null) return;
              onChange(next);
              setOpen(false);
            }}
            components={{
              IconPrev: <ChevronLeft size={18} color={color} />,
              IconNext: <ChevronRight size={18} color={color} />,
            }}
            styles={{
              ...defaultStyles,
              selected: { backgroundColor: primary, borderRadius: 8 },
              selected_label: { color: '#ffffff' },
              selected_year: { backgroundColor: primary, borderRadius: 8 },
              selected_year_label: { color: '#ffffff' },
              selected_month: { backgroundColor: primary, borderRadius: 8 },
              selected_month_label: { color: '#ffffff' },
              today: { borderColor: primary, borderWidth: 1, borderRadius: 8 },
              today_label: { color: primary },
              day_label: { color },
              month_label: { color },
              year_label: { color },
              active_year_label: { color },
              month: { borderColor: border, borderRadius: 8 },
              year: { borderColor: border, borderRadius: 8 },
              month_selector_label: { color, fontWeight: '700' },
              year_selector_label: { color, fontWeight: '700' },
              weekday_label: { color: muted },
              disabled_label: { color: muted, opacity: 0.4 },
            }}
            style={{ backgroundColor: cardBg }}
          />
        </YStack>
      ) : null}
      {error ? (
        <Body color="$danger" fontSize={12} fontWeight="600" role="alert">
          {error}
        </Body>
      ) : hint ? (
        <Muted fontSize={12}>{hint}</Muted>
      ) : null}
    </YStack>
  );
};
