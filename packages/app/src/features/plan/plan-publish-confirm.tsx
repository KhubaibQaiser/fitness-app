'use client';

import { useState } from 'react';
import { ApiError } from '@gymos/contracts';
import { Body, Card, GhostButton, Muted, PrimaryButton } from '@gymos/ui';

/** Publish gate — review confirm + optional off-target drift ack. */
export const PlanPublishConfirm = ({
  busy,
  error,
  onPublish,
}: {
  busy: boolean;
  error: Error | null;
  onPublish: (input: { reviewed: true; acknowledgeDrift?: boolean }) => void;
}) => {
  const [open, setOpen] = useState(false);
  const needsDrift = error instanceof ApiError && error.code === 'DRIFT_ACK_REQUIRED';

  if (!open) {
    return (
      <PrimaryButton disabled={busy} onPress={() => setOpen(true)}>
        Publish plan
      </PrimaryButton>
    );
  }

  return (
    <Card gap="$3" tone="accent">
      <Body fontWeight="800">Review before publish</Body>
      <Muted>
        Confirm you reviewed this AI suggestion. Same meals apply every day unless you customized a
        day. Clients only see published plans.
      </Muted>
      {needsDrift ? (
        <Card tone="danger" gap="$2">
          <Body color="$danger" fontWeight="700">
            Day totals are outside the usual tolerance
          </Body>
          <Muted>{error instanceof ApiError ? error.detail : null}</Muted>
          <PrimaryButton
            disabled={busy}
            onPress={() => onPublish({ reviewed: true, acknowledgeDrift: true })}
          >
            {busy ? 'Publishing…' : 'Publish with off-target totals'}
          </PrimaryButton>
        </Card>
      ) : (
        <PrimaryButton disabled={busy} onPress={() => onPublish({ reviewed: true })}>
          {busy ? 'Publishing…' : 'I reviewed this plan — publish'}
        </PrimaryButton>
      )}
      <GhostButton disabled={busy} onPress={() => setOpen(false)}>
        Cancel
      </GhostButton>
    </Card>
  );
};
