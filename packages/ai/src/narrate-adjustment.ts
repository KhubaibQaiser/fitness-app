import { z } from 'zod';
import { assertDeidentified } from './deidentify';
import { type AiConfig } from './types';

/** Minimal adaptive verdict shape Layer-3 narrates (never recomputes). */
export type AdjustmentVerdictInput = {
  readonly type: string;
  readonly reasons: readonly string[];
};

/**
 * Strict adaptive narrative — NO numeric fields; post-parse content lint
 * rejects digit runs so kcal/kg claims cannot sneak into copy.
 */
export const adjustmentNarrativeSchema = z
  .object({
    title: z.string().max(80),
    coachSummary: z.string().max(400),
    clientSummary: z.string().max(400),
  })
  .strict();

export type AdjustmentNarrative = z.infer<typeof adjustmentNarrativeSchema>;

const HAS_DIGIT = /\d/;

const stripDigits = (text: string): string =>
  text
    .replace(/\d+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const TITLE_BY_TYPE: Record<string, string> = {
  INSUFFICIENT_DATA: 'Need more data',
  REFER_REVIEW: 'Needs coach review',
  HOLD: 'On track',
  ADHERENCE_FOCUS: 'Focus on adherence',
  PLATEAU_PROTOCOL: 'Plateau protocol',
  ADJUST_TARGETS: 'Suggested target change',
};

const CLIENT_BY_TYPE: Record<string, string> = {
  INSUFFICIENT_DATA: 'Keep logging weigh-ins so we can read your trend.',
  REFER_REVIEW: 'Your coach will review this check-in with you.',
  HOLD: 'You are tracking well. Keep the current plan.',
  ADHERENCE_FOCUS: 'Prioritize consistency with the current plan before changing targets.',
  PLATEAU_PROTOCOL: 'Progress has stalled; your coach may suggest a short protocol change.',
  ADJUST_TARGETS: "Your coach may tweak targets based on this week's trend.",
};

/** Deterministic adaptive copy from verdict.reasons — $0 / safety net. */
export const fallbackAdjustmentNarrative = (
  verdict: AdjustmentVerdictInput,
  verbosity: AiConfig['verbosity'],
): AdjustmentNarrative => {
  const title = TITLE_BY_TYPE[verdict.type] ?? 'Check-in update';
  const cleanedReasons = verdict.reasons.map(stripDigits).filter((r) => r.length > 0);
  const reasonBlob =
    cleanedReasons.length > 0 ? cleanedReasons.join('; ') : 'No additional detail from the engine.';

  const coachSummary =
    verbosity === 'terse'
      ? `${title}. ${reasonBlob}`.slice(0, 400)
      : `${title}. Engine notes: ${reasonBlob}`.slice(0, 400);

  const clientSummary = (
    CLIENT_BY_TYPE[verdict.type] ?? 'Your coach will explain the next step.'
  ).slice(0, 400);

  return { title, coachSummary, clientSummary };
};

const containsForbiddenNumber = (n: AdjustmentNarrative): boolean =>
  HAS_DIGIT.test(n.title) || HAS_DIGIT.test(n.coachSummary) || HAS_DIGIT.test(n.clientSummary);

/**
 * Layer-3 adaptive narrate. Currently fallback-only (templates from verdict);
 * same de-ID + schema + no-numbers posture as meal narratives.
 */
export const narrateAdjustment = (
  verdict: AdjustmentVerdictInput,
  config: AiConfig,
): AdjustmentNarrative => {
  const deIdPayload = { type: verdict.type, reasons: verdict.reasons };
  const violation = assertDeidentified(deIdPayload);
  if (violation !== null) {
    throw new Error(`adjustment narrative input failed de-identification: ${violation.kind}`);
  }

  // Hosted/local paths can land later; pilot uses deterministic fallback.
  void config.mode;
  const draft = fallbackAdjustmentNarrative(verdict, config.verbosity);
  const parsed = adjustmentNarrativeSchema.safeParse(draft);
  if (!parsed.success || containsForbiddenNumber(parsed.data)) {
    return {
      title: TITLE_BY_TYPE[verdict.type] ?? 'Check-in update',
      coachSummary: 'See engine verdict type; details omitted by guardrail.',
      clientSummary: CLIENT_BY_TYPE[verdict.type] ?? 'Your coach will explain the next step.',
    };
  }
  return parsed.data;
};
