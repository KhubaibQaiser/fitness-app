'use client';

import { useThemeMode } from '@gymos/platform';
import {
  Body,
  Card,
  ErrorState,
  GhostButton,
  LoadingState,
  Moon,
  Muted,
  PageHeader,
  Row,
  SectionTitle,
  Sun,
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
