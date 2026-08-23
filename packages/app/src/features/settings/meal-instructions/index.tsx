'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import {
  Body,
  Card,
  ErrorState,
  FormField,
  GhostButton,
  Muted,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  SectionTitle,
  StickyFormFooter,
  XStack,
} from '@gymos/ui';
import { useMealInstructions, useSaveMealInstructions } from '../../../api';
import { AppScreen } from '../../shell/app-screen';
import { MarkdownSubsetPreview } from './markdown-preview';

/** Insert-shortcut toolbar: appends a markdown-subset template a coach can then edit in place. */
const TOOLBAR: { label: string; snippet: (draft: string) => string }[] = [
  { label: 'Bold', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}**bold text**` },
  { label: 'Italic', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}_italic text_` },
  { label: 'Heading', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}# Heading` },
  { label: 'Bullet', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}- List item` },
];

/**
 * Coach-scoped Layer-3 narration override editor (ADR-0015 D2). Shows only
 * this coach's own text — never the global prompt or tenant pack.
 */
export const MealInstructionsScreen = () => {
  const router = useRouter();
  const query = useMealInstructions();
  const save = useSaveMealInstructions();
  const [draft, setDraft] = useState('');
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (query.data === undefined) return;
    const version = query.data.instructions?.version ?? 0;
    if (loadedVersion === version) return;
    setDraft(query.data.instructions?.richText ?? '');
    setLoadedVersion(version);
  }, [query.data, loadedVersion]);

  if (query.isError) {
    return (
      <AppScreen>
        <ErrorState
          message="Could not load meal instructions."
          retry={() => void query.refetch()}
        />
      </AppScreen>
    );
  }

  const savedResult = save.data?.instructions;

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <OutlineButton flex={1} onPress={() => router.back()}>
            Cancel
          </OutlineButton>
          <PrimaryButton flex={1} disabled={save.isPending} onPress={() => save.mutate(draft)}>
            {save.isPending ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <PageHeader
        title="Meal AI Planner"
        subtitle="Your own instructions for how the AI names and describes meals — never portions or macros"
      />

      <Card gap="$3">
        <SectionTitle>Instructions</SectionTitle>
        <Muted fontSize={12}>
          Applies to your generated plans only, taking precedence over any workspace defaults. Never
          affects calories, macros, or which foods are picked — only how meals are named and
          described.
        </Muted>
        <XStack gap="$2" flexWrap="wrap">
          {TOOLBAR.map((tool) => (
            <GhostButton key={tool.label} onPress={() => setDraft(tool.snippet(draft))}>
              {tool.label}
            </GhostButton>
          ))}
        </XStack>
        <FormField
          label="Your instructions"
          value={draft}
          onChangeText={setDraft}
          multiline
          numberOfLines={8}
          maxLength={2000}
          placeholder="e.g. Prefer high-protein breakfasts. Keep prep notes under 10 minutes. Use a warm, encouraging tone."
        />
      </Card>

      <Card gap="$2">
        <SectionTitle>Preview</SectionTitle>
        {draft.trim().length > 0 ? (
          <MarkdownSubsetPreview text={draft} />
        ) : (
          <Muted fontSize={13}>Nothing to preview yet.</Muted>
        )}
      </Card>

      {save.isError ? (
        <Body color="$danger" role="alert">
          {save.error.message}
        </Body>
      ) : null}

      {savedResult ? (
        <Card tone={savedResult.numericClaimWarning ? 'danger' : 'accent'} gap="$2">
          <Body fontWeight="800">Saved</Body>
          {savedResult.numericClaimWarning ? (
            <Muted fontSize={12.5}>
              Your instructions mention numbers — GymOS never lets the AI state calories or macros,
              so this line may be ignored or cause the AI to fall back to plain meal names.
            </Muted>
          ) : null}
          {savedResult.changed ? (
            <Muted fontSize={12.5}>
              Applies starting with each client's next generated or regenerated plan. Existing
              draft/published plans keep their current narration until then — bulk-regenerating
              every client's plan at once isn't available yet; regenerate individual plans from each
              client's plan screen.
            </Muted>
          ) : (
            <Muted fontSize={12.5}>No change from your previous instructions.</Muted>
          )}
        </Card>
      ) : null}
    </AppScreen>
  );
};
