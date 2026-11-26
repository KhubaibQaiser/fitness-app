import { type Verdict } from '@gymos/contracts';
import { VERDICT_COPY } from './verdict-copy';

// Hand-written rather than zod: zod is declared in this package but not in the app bundles yet,
// and Metro would ship all of it (locales included) to native for these few checks.
type Check = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber: Check = (value) => Number.isFinite(value);
const isString: Check = (value) => typeof value === 'string';
const isStringArray: Check = (value) => Array.isArray(value) && value.every(isString);
const hasFields =
  (fields: Record<string, Check>): Check =>
  (value) =>
    isRecord(value) && Object.entries(fields).every(([key, check]) => check(value[key]));

/** The keys `Verdict` marks optional. */
type OptionalKey = {
  [K in keyof Verdict]-?: undefined extends Verdict[K] ? K : never;
}[keyof Verdict];

// Typed against the contract, so adding or removing a `Verdict` field fails the typecheck here.
const REQUIRED: Record<Exclude<keyof Verdict, OptionalKey>, Check> = {
  // Not Object.hasOwn, which older Hermes builds lack.
  type: (value) =>
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(VERDICT_COPY, value),
  confidence: isNumber,
  reasons: isStringArray,
};

const OPTIONAL: Record<OptionalKey, Check> = {
  actualWeeklyDeltaKg: isNumber,
  expectedWeeklyDeltaKg: isNumber,
  observedTdeeEstimate: isNumber,
  deltaKcalPerDay: isNumber,
  newTargets: hasFields({
    kcal: isNumber,
    proteinG: isNumber,
    fatG: isNumber,
    carbsG: isNumber,
    fiberG: isNumber,
  }),
  clampedBySafety: (value) => typeof value === 'boolean',
  meanAdherence: isNumber,
  flags: isStringArray,
  narrative: hasFields({ title: isString, coachSummary: isString, clientSummary: isString }),
};

export type StoredVerdict = { ok: true; verdict: Verdict | null } | { ok: false; issues: string[] };

/**
 * Check a check-in's stored `engineOutput` against the whole `Verdict` contract.
 * `null` means no verdict yet. Anything else that doesn't match is rejected, with issues
 * naming the fields only (never the stored values), so they can be logged.
 */
export const parseStoredVerdict = (value: unknown): StoredVerdict => {
  if (value === null) return { ok: true, verdict: null };
  if (!isRecord(value)) return { ok: false, issues: ['verdict: not an object'] };
  const issues = [
    ...Object.entries(REQUIRED)
      .filter(([key, check]) => !check(value[key]))
      .map(([key]) => `${key}: missing or invalid`),
    ...Object.entries(OPTIONAL)
      .filter(([key, check]) => key in value && !check(value[key]))
      .map(([key]) => `${key}: invalid`),
  ];
  // Every field was checked above, so the cast is safe.
  return issues.length === 0 ? { ok: true, verdict: value as Verdict } : { ok: false, issues };
};

/**
 * The verdict the detail screen shows: the re-run's once there is one (`undefined` until then),
 * else the stored one. Both come from the API, so both are checked.
 */
export const shownVerdict = (stored: unknown, rerun: unknown): StoredVerdict => {
  if (rerun === undefined) return parseStoredVerdict(stored);
  // A re-run always returns a verdict, so null is malformed here.
  if (rerun === null) return { ok: false, issues: ['verdict: missing'] };
  return parseStoredVerdict(rerun);
};
