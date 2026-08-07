'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Body,
  Check,
  IconButton,
  Input,
  Pencil,
  X,
  XStack,
  YStack,
  type BadgeTone,
} from '@gymos/ui';

const TITLE_MAX = 50;

/** Inline plan title in the page header — pencil to the right, 50-char cap. */
export const PlanTitleHeader = ({
  title,
  version,
  status,
  editable,
  busy,
  onSave,
}: {
  title: string | null;
  version: number;
  status: string;
  editable: boolean;
  busy: boolean;
  onSave: (nextTitle: string) => void;
}) => {
  const display = title !== null && title.trim() !== '' ? title.trim() : `Plan v${version}`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    setEditing(false);
    setDraft(title !== null && title.trim() !== '' ? title.trim() : `Plan v${version}`);
  }, [title, version]);

  const badgeTone: BadgeTone =
    status === 'PUBLISHED' ? 'success' : status === 'NEEDS_REVIEW' ? 'danger' : 'warning';

  const commit = () => {
    if (busy) return;
    const next = draft.trim();
    const current = title?.trim() ?? '';
    const fallback = `Plan v${version}`;
    if (next === '' || next === fallback) {
      if (current !== '') onSave('');
    } else if (next !== current) {
      onSave(next);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(display);
    setEditing(false);
  };

  return (
    <XStack alignItems="flex-start" justifyContent="space-between" gap="$3" width="100%">
      <YStack flex={1} gap={2} minWidth={0}>
        {editing ? (
          <XStack gap="$2.5" alignItems="center" width="100%">
            <Input
              flex={1}
              value={draft}
              onChangeText={(t) => setDraft(t.slice(0, TITLE_MAX))}
              placeholder={`Plan v${version}`}
              autoFocus
              maxLength={TITLE_MAX}
              fontFamily="$heading"
              fontWeight="700"
              fontSize={20}
              borderWidth={1}
              borderColor="$focusRing"
              backgroundColor="$cardBg"
              color="$color"
              borderRadius="$radiusControl"
              paddingHorizontal="$3"
              height={36}
              onSubmitEditing={commit}
            />
            <IconButton
              density="xs"
              tone="ghost"
              disabled={busy}
              onPress={commit}
              aria-label="Save plan name"
            >
              <Check size={11} color="$success" />
            </IconButton>
            <IconButton
              density="xs"
              tone="ghost"
              disabled={busy}
              onPress={cancel}
              aria-label="Cancel rename"
            >
              <X size={11} color="$textMuted" />
            </IconButton>
          </XStack>
        ) : (
          <XStack gap="$2.5" alignItems="center" minWidth={0} flexWrap="wrap">
            <Body
              fontFamily="$heading"
              fontWeight="700"
              fontSize={20}
              letterSpacing={-0.3}
              flexShrink={1}
            >
              {display}
            </Body>
            {editable ? (
              <IconButton
                density="xs"
                tone="ghost"
                disabled={busy}
                onPress={() => {
                  setDraft(display);
                  setEditing(true);
                }}
                aria-label="Rename plan"
              >
                <Pencil size={11} color="$textMuted" />
              </IconButton>
            ) : null}
          </XStack>
        )}
        {editing ? (
          <Body fontSize={12} color="$textMuted">
            {draft.length}/{TITLE_MAX}
          </Body>
        ) : null}
      </YStack>
      <Badge tone={badgeTone} label={status} />
    </XStack>
  );
};
