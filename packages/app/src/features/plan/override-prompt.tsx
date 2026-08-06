'use client';

import { useState } from 'react';
import { Body, FormField, Muted, PrimaryButton, YStack } from '@gymos/ui';

export const OverridePrompt = ({
  onConfirm,
  busy,
  detail,
}: {
  onConfirm: (reason: string) => void;
  busy: boolean;
  detail: string;
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <YStack
      gap="$3"
      borderWidth={2}
      borderColor="$danger"
      borderRadius={14}
      padding="$4"
      backgroundColor="$cardBg"
    >
      <Body fontWeight="800" color="$danger">
        Safety gate: {detail || 'this client requires a coach override'}
      </Body>
      <Muted>
        Auto-generation is blocked (under-16 / pregnancy / medical restriction). Provide a reason —
        it is permanently logged and a physician disclaimer attaches to the plan.
      </Muted>
      <FormField
        label="Override reason"
        value={reason}
        onChangeText={(t) => {
          setReason(t);
          setError(null);
        }}
        multiline
        numberOfLines={3}
        placeholder="e.g. Cleared by physician letter dated…"
        required
        error={error}
      />
      <PrimaryButton
        disabled={busy}
        onPress={() => {
          if (reason.trim().length < 5) {
            setError('Give at least 5 characters so the audit log is useful');
            return;
          }
          onConfirm(reason.trim());
        }}
        backgroundColor="$danger"
        color="$dangerFg"
      >
        {busy ? 'Generating…' : 'Override and generate'}
      </PrimaryButton>
    </YStack>
  );
};
