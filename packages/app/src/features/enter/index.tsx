'use client';

import { useState } from 'react';
import { useRouter } from 'solito/navigation';
import { api, ApiError } from '@gymos/contracts';
import { Body, Card, Input, Muted, PrimaryButton, Screen, Title, YStack } from '@gymos/ui';

/** Access-gate entry — one key, once per device. No accounts in the pilot. */
export const EnterScreen = () => {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (key.trim().length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.enter(key.trim());
      router.replace('/');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Too many attempts — wait a minute and try again.'
          : 'That access key is not valid.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen justifyContent="center" paddingBottom="$4">
      <YStack gap="$4" maxWidth={420} width="100%" alignSelf="center">
        <YStack gap="$1" alignItems="center">
          <Title>GymOS Coach</Title>
          <Muted>Enter your access key to open the app on this device</Muted>
        </YStack>
        <Card gap="$3">
          <Input
            value={key}
            onChangeText={setKey}
            placeholder="Access key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            size="$5"
            onSubmitEditing={() => void submit()}
            aria-label="Access key"
          />
          {error ? <Body color="$danger">{error}</Body> : null}
          <PrimaryButton disabled={busy || key.trim().length < 8} onPress={() => void submit()}>
            {busy ? 'Checking…' : 'Open the app'}
          </PrimaryButton>
          <Muted fontSize={12}>
            You only do this once per device. Ask the platform operator if you lost your key.
          </Muted>
        </Card>
      </YStack>
    </Screen>
  );
};
