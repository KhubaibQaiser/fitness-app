/**
 * Reason codes that put a client on the coach's attention list, most urgent first.
 * The server copy of B1's client rule (`packages/app/src/lib/attention.ts`); the writers are
 * `upsertAttention` (check-in verdicts) and `refreshAttention` (the nightly job).
 */
export const ATTENTION_CODES: readonly string[] = ['RED_FLAG', 'CHECKIN_OVERDUE', 'OFF_TRACK'];

const rank = (code: string): number => {
  const index = ATTENTION_CODES.indexOf(code);
  return index === -1 ? ATTENTION_CODES.length : index;
};

/**
 * The one status rule for Today (F7.1) and the roster (F7.2): whether a client needs attention,
 * and the one reason a row shows. That is the most urgent attention reason, else the heaviest
 * other reason (CHECKIN_DUE, NEW_CLIENT), else none ("On track").
 */
export const attentionStatus = <R extends { code: string; weight: number }>(
  reasons: readonly R[],
): { needsAttention: boolean; reason: R | null } => {
  const [top] = [...reasons].sort((a, b) => rank(a.code) - rank(b.code) || b.weight - a.weight);
  if (top === undefined) return { needsAttention: false, reason: null };
  return { needsAttention: rank(top.code) < ATTENTION_CODES.length, reason: top };
};
