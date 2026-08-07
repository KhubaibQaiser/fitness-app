'use client';

import type { LocaleCode } from '@gymos/contracts';
import { useThemeMode } from '@gymos/platform';
import {
  Body,
  Card,
  ErrorState,
  LoadingState,
  Muted,
  PageHeader,
  Row,
  SectionTitle,
  SegmentedControl,
  Switch,
  YStack,
} from '@gymos/ui';
import { useMe, usePublicConfig, useUpdateMe } from '../../api';
import { AppScreen } from '../shell/app-screen';

const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  ur: 'Urdu',
};

export const SettingsScreen = () => {
  const me = useMe();
  const config = usePublicConfig();
  const updateMe = useUpdateMe();
  const { mode, setMode } = useThemeMode();

  if (me.isPending || config.isPending) {
    return (
      <AppScreen>
        <LoadingState />
      </AppScreen>
    );
  }
  if (me.isError || config.isError) {
    return (
      <AppScreen>
        <ErrorState
          message="Could not load settings."
          retry={() => {
            void me.refetch();
            void config.refetch();
          }}
        />
      </AppScreen>
    );
  }

  const locale: LocaleCode = me.data.locale === 'ur' ? 'ur' : 'en';
  const currency = me.data.currencyPref;
  const saving = updateMe.isPending;
  const dark = mode === 'dark';

  return (
    <AppScreen>
      <PageHeader title="Settings" subtitle="Workspace, appearance, safety" />

      <SectionTitle>Appearance</SectionTitle>
      <Card gap="$3">
        <Row minHeight={48}>
          <YStack flex={1} gap={2} minWidth={0}>
            <Body fontWeight="700">Dark mode</Body>
            <Muted fontSize={12}>Preference is saved on this device.</Muted>
          </YStack>
          <Switch
            checked={dark}
            onCheckedChange={(v) => setMode(v ? 'dark' : 'light')}
            size="$3"
            aria-label="Dark mode"
          >
            <Switch.Thumb />
          </Switch>
        </Row>
      </Card>

      <SectionTitle>Preferences</SectionTitle>
      <Card gap="$4">
        <YStack gap="$2" width="100%">
          <Body fontWeight="700">Language</Body>
          <SegmentedControl
            ariaLabel="Language"
            value={locale}
            onChange={(next) => {
              if (next === locale || saving) return;
              updateMe.mutate({ locale: next });
            }}
            options={config.data.locales.enabled.map((code) => ({
              value: code,
              label: LOCALE_LABELS[code],
            }))}
          />
        </YStack>
        <YStack gap="$2" width="100%">
          <Body fontWeight="700">Currency</Body>
          <SegmentedControl
            ariaLabel="Currency"
            value={currency}
            onChange={(next) => {
              if (next === currency || saving) return;
              updateMe.mutate({ currencyPref: next });
            }}
            options={config.data.currencies.map((code) => ({
              value: code,
              label: code,
            }))}
          />
        </YStack>
        {updateMe.isError ? (
          <Body color="$danger" role="alert" fontSize={13}>
            {updateMe.error.message}
          </Body>
        ) : (
          <Muted>Saved to your coach profile and applied on every device.</Muted>
        )}
      </Card>

      <SectionTitle>Coach</SectionTitle>
      <Card>
        <Row>
          <Body>Name</Body>
          <Muted>{me.data.name}</Muted>
        </Row>
        <Row>
          <Body>Email</Body>
          <Muted>{me.data.email}</Muted>
        </Row>
        <Row>
          <Body>Units</Body>
          <Muted>{me.data.unitPref}</Muted>
        </Row>
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <Row>
          <Body>Product</Body>
          <Muted>GymOS Coach</Muted>
        </Row>
        <Row>
          <Body>Version</Body>
          <Muted fontFamily="$mono">0.1.0-pilot</Muted>
        </Row>
      </Card>

      <SectionTitle>Privacy & safety</SectionTitle>
      <Card gap="$2">
        <Body fontSize={14}>
          Client health data never leaves this platform. Optional AI meal naming runs on our own
          infrastructure; every number is computed by verified formulas, and every AI generation is
          audit-logged.
        </Body>
        <Muted fontSize={12}>
          GymOS provides general fitness nutrition guidance — not medical advice.
        </Muted>
      </Card>
    </AppScreen>
  );
};
