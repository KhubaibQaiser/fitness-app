/**
 * Per-tenant prompt / cuisine packs — optional system-prompt addenda.
 * Default pack is empty; meal-narrative.v1 remains the base contract.
 */
export type PromptPack = {
  readonly id: string;
  /** Extra system lines appended after the base meal-narrative prompt. */
  readonly systemAddendum: string;
};

const DEFAULT_PACK: PromptPack = { id: 'default', systemAddendum: '' };

export const PROMPT_PACKS: Record<string, PromptPack> = {
  default: DEFAULT_PACK,
  pakistani: {
    id: 'pakistani',
    systemAddendum:
      'Prefer familiar Pakistani home-cooking phrasing (roti, dal, sabzi, grill/steam). Keep English unless locale is ur.',
  },
  mediterranean: {
    id: 'mediterranean',
    systemAddendum:
      'Prefer Mediterranean home-cooking phrasing (grill, olive oil, herbs, yogurt). Keep English unless locale is ur.',
  },
};

export const resolvePromptPack = (packId: string | undefined): PromptPack => {
  if (packId === undefined || packId === '') return DEFAULT_PACK;
  return PROMPT_PACKS[packId] ?? DEFAULT_PACK;
};
