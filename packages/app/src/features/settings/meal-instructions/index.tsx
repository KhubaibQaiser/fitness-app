'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'solito/navigation';
import { resolveMealTemplate } from '@gymos/core/nutrition';
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
  YStack,
} from '@gymos/ui';
import { useMealInstructions, useSaveMealInstructions } from '../../../api';
import { AppScreen } from '../../shell/app-screen';
import { MarkdownSubsetPreview } from './markdown-preview';
import {
  draftToShares,
  emptyShareDraft,
  SHARE_SLOTS,
  sharesToDraft,
  type ShareDraft,
  type ShareSlot,
} from './share-draft';

/** Insert-shortcut toolbar: appends a markdown-subset template a coach can then edit in place. */
const TOOLBAR: { label: string; snippet: (draft: string) => string }[] = [
  { label: 'Bold', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}**bold text**` },
  { label: 'Italic', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}_italic text_` },
  { label: 'Heading', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}# Heading` },
  { label: 'Bullet', snippet: (d) => `${d}${d.length > 0 ? '\n' : ''}- List item` },
];

const SHARE_LABEL: Record<ShareSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const formatResolvedShares = (draft: ShareDraft, mealCount: 3 | 4 | 5): string => {
  const parsed = draftToShares(draft);
  if (parsed.error) return parsed.error;
  return resolveMealTemplate(mealCount, parsed.shares ?? undefined)
    .map((meal) => `${SHARE_LABEL[meal.slot]} ${Math.round(meal.share * 100)}%`)
    .join(' · ');
};

/**
 * Coach-scoped Meal AI Planner (ADR-0015 D2 + D7). Shows only this coach's
 * own calorie split and narration text — never the global prompt or tenant pack.
 */
export const MealInstructionsScreen = () => {
  const router = useRouter();
  const query = useMealInstructions();
  const save = useSaveMealInstructions();
  const [draft, setDraft] = useState('');
  const [shareDraft, setShareDraft] = useState<ShareDraft>(emptyShareDraft);
  const [shareError, setShareError] = useState<string | null>(null);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (query.data === undefined) return;
    const version = query.data.instructions?.version ?? 0;
    if (loadedVersion === version) return;
    setDraft(query.data.instructions?.richText ?? '');
    setShareDraft(sharesToDraft(query.data.instructions?.mealShares));
    setShareError(null);
    setLoadedVersion(version);
  }, [query.data, loadedVersion]);

  if (query.isError) {
    return (
      <AppScreen>
        <ErrorState
          message="Could not load meal planner settings."
          retry={() => void query.refetch()}
        />
      </AppScreen>
    );
  }

  const savedResult = save.data?.instructions;

  const onSave = () => {
    const parsed = draftToShares(shareDraft);
    if (parsed.error) {
      setShareError(parsed.error);
      return;
    }
    setShareError(null);
    save.mutate({ text: draft, mealShares: parsed.shares });
  };

  return (
    <AppScreen
      footer={
        <StickyFormFooter>
          <OutlineButton flex={1} onPress={() => router.back()}>
            Cancel
          </OutlineButton>
          <PrimaryButton flex={1} disabled={save.isPending} onPress={onSave}>
            {save.isPending ? 'Saving…' : 'Save'}
          </PrimaryButton>
        </StickyFormFooter>
      }
    >
      <PageHeader
        title="Meal AI Planner"
        subtitle="Calorie split the solver uses, plus how meals are named and described"
      />

      <Card gap="$3">
        <SectionTitle>Calorie split</SectionTitle>
        <Muted fontSize={12}>
          This is what Layer 2 actually uses when it sizes each meal. Writing a percentage in the
          instructions box below will not change portions — only these fields will. Leave a meal
          blank to keep its default; unset meals share the remaining calories.
        </Muted>
        <XStack gap="$2" flexWrap="wrap">
          {SHARE_SLOTS.map((slot) => (
            <YStack key={slot} flex={1} minWidth={120}>
              <FormField
                label={SHARE_LABEL[slot]}
                value={shareDraft[slot]}
                onChangeText={(value) => {
                  setShareDraft((current) => ({ ...current, [slot]: value }));
                  setShareError(null);
                }}
                inputMode="numeric"
                placeholder={slot === 'snack' ? 'default' : slot === 'breakfast' ? '28' : ''}
                unit="%"
              />
            </YStack>
          ))}
        </XStack>
        {shareError ? (
          <Body color="$danger" role="alert">
            {shareError}
          </Body>
        ) : (
          <Muted fontSize={12}>
            3 meals: {formatResolvedShares(shareDraft, 3)}. Snack applies when you generate with 4
            or 5 meals.
          </Muted>
        )}
      </Card>

      <Card gap="$3">
        <SectionTitle>Instructions</SectionTitle>
        <Muted fontSize={12}>
          Applies to your generated plans only, taking precedence over any workspace defaults. Names
          and prep notes only — never calories, macros, or which foods are picked.
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
              draft/published plans keep their current split and narration until then — regenerate
              individual plans from each client's plan screen.
            </Muted>
          ) : (
            <Muted fontSize={12.5}>No change from your previous settings.</Muted>
          )}
        </Card>
      ) : null}
    </AppScreen>
  );
};
