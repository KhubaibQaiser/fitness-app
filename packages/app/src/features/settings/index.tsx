'use client';

import { Link } from 'solito/link';
import { useThemeMode } from '@gymos/platform';
import {
  Body,
  Card,
  ChevronRight,
  ErrorState,
  GhostButton,
  LoadingState,
  Moon,
  Muted,
  PageHeader,
  Row,
  SectionTitle,
  Sun,
  XStack,
  YStack,
} from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';
import { AppScreen } from '../shell/app-screen';

export const SettingsScreen = () => {
  const me = useMe();
  const config = usePublicConfig();
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

  return (
    <AppScreen>
      <PageHeader title="Settings" subtitle="Workspace, appearance, safety" />

      <SectionTitle>Appearance</SectionTitle>
      <Card gap="$3">
        <Row>
          <Body fontWeight="700">Theme</Body>
          <Row gap="$2">
            <GhostButton
              minHeight={44}
              icon={<Sun size={16} />}
              backgroundColor={mode === 'light' ? '$primary' : 'transparent'}
              color={mode === 'light' ? '$primaryFg' : '$color'}
              borderColor={mode === 'light' ? '$primary' : '$borderColor'}
              onPress={() => setMode('light')}
              aria-pressed={mode === 'light'}
            >
              Light
            </GhostButton>
            <GhostButton
              minHeight={44}
              icon={<Moon size={16} />}
              backgroundColor={mode === 'dark' ? '$primary' : 'transparent'}
              color={mode === 'dark' ? '$primaryFg' : '$color'}
              borderColor={mode === 'dark' ? '$primary' : '$borderColor'}
              onPress={() => setMode('dark')}
              aria-pressed={mode === 'dark'}
            >
              Dark
            </GhostButton>
          </Row>
        </Row>
        <Muted>Preference is saved on this device.</Muted>
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

      <SectionTitle>Workspace</SectionTitle>
      <Card>
        <Row>
          <Body>App</Body>
          <Muted>{config.data.appName}</Muted>
        </Row>
        <Row>
          <Body>Currency</Body>
          <Muted>{config.data.currency}</Muted>
        </Row>
        <Row>
          <Body>Language</Body>
          <Muted>{config.data.locales.default}</Muted>
        </Row>
      </Card>

      <SectionTitle>Nutrition engine</SectionTitle>
      <Link href="/settings/nutrition">
        <Card interactive gap="$2" minHeight={56} justifyContent="center">
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <YStack flex={1} gap={2} minWidth={0}>
              <Body fontFamily="$heading" fontWeight="700">
                How targets are calculated
              </Body>
              <Muted fontSize={13}>
                BMR, TDEE, goals, macros, fiber, and safety floors — live from the engine.
              </Muted>
            </YStack>
            <ChevronRight size={20} color="$textMuted" />
          </XStack>
        </Card>
      </Link>

      <SectionTitle>Privacy & safety</SectionTitle>
      <Card gap="$2">
        <Body fontSize={14}>
          Client health data never leaves this platform. AI meal naming runs on our own
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
