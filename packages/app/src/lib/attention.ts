/** Reason codes that put a client on the coach's attention list (Home and the roster). */
const ATTENTION_CODES: ReadonlySet<string> = new Set(['CHECKIN_OVERDUE', 'OFF_TRACK', 'RED_FLAG']);

export const isAttentionCode = (code: string): boolean => ATTENTION_CODES.has(code);

export const needsAttention = (reasons: readonly { code: string }[]): boolean =>
  reasons.some((r) => isAttentionCode(r.code));
