import type { MealShareOverrides } from '@gymos/contracts';

export const SHARE_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type ShareSlot = (typeof SHARE_SLOTS)[number];

export type ShareDraft = Record<ShareSlot, string>;

export const emptyShareDraft = (): ShareDraft => ({
  breakfast: '',
  lunch: '',
  dinner: '',
  snack: '',
});

/** Convert stored 0–1 fractions into whole-percent strings for the editor. */
export const sharesToDraft = (shares: MealShareOverrides | null | undefined): ShareDraft => {
  const draft = emptyShareDraft();
  if (!shares) return draft;
  for (const slot of SHARE_SLOTS) {
    const value = shares[slot];
    if (value === undefined) continue;
    draft[slot] = String(Math.round(value * 100));
  }
  return draft;
};

/**
 * Parse the editor's percent strings back into 0–1 fractions. Empty fields
 * stay unset (template default). Invalid input returns an error and no shares
 * so we never persist a half-typed value.
 */
export const draftToShares = (
  draft: ShareDraft,
): { shares: MealShareOverrides | null; error: string | null } => {
  const shares: MealShareOverrides = {};
  for (const slot of SHARE_SLOTS) {
    const raw = draft[slot].trim();
    if (raw === '') continue;
    const pct = Number(raw);
    if (!Number.isFinite(pct)) {
      return { shares: null, error: 'Each meal share must be a number.' };
    }
    if (pct < 5 || pct > 80) {
      return { shares: null, error: 'Each meal share must be between 5% and 80%.' };
    }
    shares[slot] = pct / 100;
  }
  const sum = SHARE_SLOTS.reduce((total, slot) => total + (shares[slot] ?? 0), 0);
  if (sum > 1 + 1e-9) {
    return { shares: null, error: 'Meal shares cannot add up to more than 100%.' };
  }
  return {
    shares: SHARE_SLOTS.some((slot) => shares[slot] !== undefined) ? shares : null,
    error: null,
  };
};
