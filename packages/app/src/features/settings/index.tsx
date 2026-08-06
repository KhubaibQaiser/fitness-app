'use client';

import { Body, Card, LoadingState, Muted, Row, Screen, SectionTitle, Title } from '@gymos/ui';
import { useMe, usePublicConfig } from '../../api';

export const SettingsScreen = () => {
  const me = useMe();
  const config = usePublicConfig();

  if (me.isPending || config.isPending) return <LoadingState />;

  return (
    <Screen>
      <Title>Settings</Title>

      <SectionTitle>Coach</SectionTitle>
      <Card>
        <Row>
          <Body>Name</Body>
          <Muted>{me.data?.name ?? '—'}</Muted>
        </Row>
        <Row>
          <Body>Email</Body>
          <Muted>{me.data?.email ?? '—'}</Muted>
        </Row>
        <Row>
          <Body>Units</Body>
          <Muted>{me.data?.unitPref ?? 'metric'}</Muted>
        </Row>
      </Card>

      <SectionTitle>Workspace</SectionTitle>
      <Card>
        <Row>
          <Body>App</Body>
          <Muted>{config.data?.appName ?? 'GymOS'}</Muted>
        </Row>
        <Row>
          <Body>Currency</Body>
          <Muted>{config.data?.currency ?? '—'}</Muted>
        </Row>
        <Row>
          <Body>Language</Body>
          <Muted>{config.data?.locales.default ?? 'en'}</Muted>
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
    </Screen>
  );
};
