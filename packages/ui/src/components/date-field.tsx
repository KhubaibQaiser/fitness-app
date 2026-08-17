'use client';

import { useState } from 'react';
import DateTimePicker, { useDefaultStyles, type DateType } from 'react-native-ui-datepicker';
import { Adapt, Label, Popover, Sheet, Text, useMedia, useTheme, YStack } from 'tamagui';
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

type DateFieldCalendarProps = {
  value: string;
  maxDate?: string | undefined;
  minDate?: string | undefined;
  onSelect: (isoDate: string) => void;
};

const DateFieldCalendar = ({ value, maxDate, minDate, onSelect }: DateFieldCalendarProps) => {
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
    <DateTimePicker
      mode="single"
      date={value || undefined}
      maxDate={maxDate}
      minDate={minDate}
      onChange={({ date }) => {
        const next = fromPickerDate(date);
        if (next === null) return;
        onSelect(next);
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
  );
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
  const media = useMedia();
  const isCompact = !media.sm;

  const selectDate = (isoDate: string) => {
    onChange(isoDate);
    setOpen(false);
  };

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
      <Popover open={open} onOpenChange={setOpen} placement="bottom-start" allowFlip>
        <Popover.Trigger>
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
            aria-haspopup="dialog"
          >
            <Text fontFamily="$body" fontSize={15} color={value ? '$color' : '$placeholderColor'}>
              {value ? formatDisplay(value) : 'Select date'}
            </Text>
          </YStack>
        </Popover.Trigger>

        <Adapt when={isCompact}>
          <Sheet modal snapPointsMode="fit" dismissOnSnapToBottom>
            <Sheet.Overlay backgroundColor="$shadowColor" />
            <Sheet.Handle />
            <Sheet.Frame
              padding="$3"
              paddingBottom="$5"
              backgroundColor="$cardBg"
              borderTopWidth={1}
              borderColor="$borderColor"
            >
              <Adapt.Contents />
            </Sheet.Frame>
          </Sheet>
        </Adapt>

        <Popover.Content
          role="dialog"
          aria-label={label}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$radiusControl"
          backgroundColor="$cardBg"
          padding="$2"
          minWidth={320}
          elevation="$2"
          shadowColor="rgba(0,0,0,0.18)"
          shadowOffset={{ width: 0, height: 8 }}
          shadowRadius={24}
          shadowOpacity={1}
          enterStyle={{ opacity: 0, scale: 0.96 }}
          exitStyle={{ opacity: 0, scale: 0.96 }}
        >
          <DateFieldCalendar
            value={value}
            maxDate={maxDate}
            minDate={minDate}
            onSelect={selectDate}
          />
        </Popover.Content>
      </Popover>
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
