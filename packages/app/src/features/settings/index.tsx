'use client';

import { useState } from 'react';
import type { HeightUnit, LengthUnit, WeightUnit } from '@gymos/contracts';
import { useThemeMode } from '@gymos/platform';
import {
  Body,
  Card,
  DangerButton,
  ErrorState,
  GhostButton,
  IosSwitch,
  Muted,
  PageHeader,
  Row,
  SegmentedControl,
  Skeleton,
  Text,
  YStack,
} from '@gymos/ui';
import { useMe, usePublicConfig, useUpdateMe } from '../../api';
import { useLogout } from '../auth/use-logout';
import { AppScreen } from '../shell/app-screen';

export const SettingsScreen = () => {
  const me = useMe();
  const config = usePublicConfig();
  const updateMe = useUpdateMe();
  const { logout, logoutAll, isPending: signingOut } = useLogout();
  const { mode, setMode } = useThemeMode();
  const [confirmAll, setConfirmAll] = useState(false);

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

  const saving = updateMe.isPending;
  const dark = mode === 'dark';
  const prefs = me.data?.unitPrefs;

  return (
    <AppScreen>
      <PageHeader title="Settings" subtitle="Workspace, appearance, units" />

      <Card gap="$3">
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          Appearance
        </Text>
        <Row minHeight={48}>
          <YStack flex={1} gap={2} minWidth={0}>
            <Body fontWeight="700">Dark mode</Body>
            <Muted fontSize={12}>Preference is saved on this device.</Muted>
          </YStack>
          <IosSwitch
            checked={dark}
            onCheckedChange={(v) => setMode(v ? 'dark' : 'light')}
            aria-label="Dark mode"
          />
        </Row>
      </Card>

      <Card gap="$4">
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          Units
        </Text>
        {prefs === undefined ? (
          <YStack gap="$4" width="100%">
            <YStack gap="$2" width="100%">
              <Body fontWeight="700">Weight</Body>
              <Skeleton width="100%" height={36} borderRadius="$radiusControl" />
            </YStack>
            <YStack gap="$2" width="100%">
              <Body fontWeight="700">Height</Body>
              <Skeleton width="100%" height={36} borderRadius="$radiusControl" />
            </YStack>
            <YStack gap="$2" width="100%">
              <Body fontWeight="700">Measurements</Body>
              <Skeleton width="100%" height={36} borderRadius="$radiusControl" />
            </YStack>
          </YStack>
        ) : (
          <>
            <YStack gap="$2" width="100%">
              <Body fontWeight="700">Weight</Body>
              <SegmentedControl
                ariaLabel="Weight unit"
                value={prefs.weight}
                onChange={(weight: WeightUnit) => {
                  if (weight === prefs.weight || saving) return;
                  updateMe.mutate({ unitPrefs: { ...prefs, weight } });
                }}
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
              />
            </YStack>
            <YStack gap="$2" width="100%">
              <Body fontWeight="700">Height</Body>
              <SegmentedControl
                ariaLabel="Height unit"
                value={prefs.height}
                onChange={(height: HeightUnit) => {
                  if (height === prefs.height || saving) return;
                  updateMe.mutate({ unitPrefs: { ...prefs, height } });
                }}
                options={[
                  { value: 'cm', label: 'cm' },
                  { value: 'ft_in', label: 'ft / in' },
                ]}
              />
            </YStack>
            <YStack gap="$2" width="100%">
              <Body fontWeight="700">Measurements</Body>
              <SegmentedControl
                ariaLabel="Length unit"
                value={prefs.length}
                onChange={(length: LengthUnit) => {
                  if (length === prefs.length || saving) return;
                  updateMe.mutate({ unitPrefs: { ...prefs, length } });
                }}
                options={[
                  { value: 'cm', label: 'cm' },
                  { value: 'in', label: 'in' },
                ]}
              />
            </YStack>
          </>
        )}
        {updateMe.isError ? (
          <Body color="$danger" role="alert" fontSize={13}>
            {updateMe.error.message}
          </Body>
        ) : (
          <Muted>Saved to your coach profile. Food and vitals stay metric in the database.</Muted>
        )}
      </Card>

      <Card>
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          Coach
        </Text>
        <Row>
          <Body>Name</Body>
          {me.data ? <Muted>{me.data.name}</Muted> : <Skeleton width={128} height={18} />}
        </Row>
        <Row>
          <Body>Email</Body>
          {me.data ? <Muted>{me.data.email}</Muted> : <Skeleton width={168} height={18} />}
        </Row>
      </Card>

      <Card gap="$3">
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          Account
        </Text>
        <GhostButton
          disabled={signingOut}
          onPress={() => {
            setConfirmAll(false);
            void logout();
          }}
          width="100%"
          aria-label="Sign out"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </GhostButton>
        <DangerButton
          disabled={signingOut}
          onPress={() => {
            if (!confirmAll) {
              setConfirmAll(true);
              return;
            }
            void logoutAll();
          }}
          width="100%"
          aria-label="Sign out of all devices"
        >
          {signingOut
            ? 'Signing out…'
            : confirmAll
              ? 'Tap again to confirm'
              : 'Sign out of all devices'}
        </DangerButton>
        <Muted fontSize={12}>
          Sign out ends this device. Sign out of all devices ends every session immediately.
        </Muted>
      </Card>

      <Card>
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          About
        </Text>
        <Row>
          <Body>Product</Body>
          <Muted>GymOS Coach</Muted>
        </Row>
        <Row>
          <Body>Version</Body>
          <Muted fontFamily="$mono">0.1.0-pilot</Muted>
        </Row>
      </Card>

      <Card gap="$2">
        <Text fontFamily="$heading" fontSize={14} fontWeight="500" color="$color">
          Privacy & safety
        </Text>
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
