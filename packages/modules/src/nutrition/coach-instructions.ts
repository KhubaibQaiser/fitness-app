import { and, eq } from 'drizzle-orm';
import { NUMERIC_CLAIM_PATTERN } from '@gymos/ai';
import {
  normalizeMealShareOverrides,
  type MealShareOverrideInput,
  type MealShareOverrides,
} from '@gymos/core/nutrition';
import { schema as s, type Db, type DbOrTx } from '@gymos/db';
import { writeAudit } from '../shared/audit';

const MAX_INSTRUCTIONS_LENGTH = 2000;

/**
 * Server-side sanitizer for coach-authored narration instructions
 * (ADR-0015 D2). Not optional, not the client's responsibility — this is
 * the only path anything is persisted through, and the derived value is
 * concatenated directly into an LLM system-prompt string, not merely
 * displayed back. Runs once, at the single write path (`saveInstructions`);
 * `getActiveInstructions` and `narrate.ts` read already-clean data.
 */
export const sanitizeInstructionsText = (raw: string): string => {
  let text = raw;
  // 1. Strip HTML tags and event-handler-style attributes. Defense in depth:
  // no renderer here uses dangerouslySetInnerHTML/innerHTML today, but a
  // value concatenated into an LLM prompt should not carry markup either way.
  text = text.replace(/<[^>]*>/g, ' ');
  text = text.replace(/[<>]/g, '');
  text = text.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|\S+)/gi, '');
  // 2. Strip non-printable and zero-width/control Unicode used to hide or
  // obfuscate injected text from a casual read of what was saved.
  text = text.replace(/[\u0000-\u0008\u000B-\u001F]/g, ''); // control chars except \t (09) and \n (0A)
  text = text.replace(/[\u200B-\u200F\uFEFF]/g, ''); // zero-width chars + BOM
  // 3. Collapse runs of blank lines / excess whitespace.
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  // 4. Hard-cap length — bounds prompt-token cost and the blast radius of
  // any single bad input, on top of the form's own maxLength validation.
  return text.slice(0, MAX_INSTRUCTIONS_LENGTH);
};

const stripMarkdownLine = (line: string): string =>
  line
    .replace(/^#{1,6}\s*/, '') // heading marker
    .replace(/^[-*]\s+/, '') // bullet marker
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic (asterisk form)
    .replace(/_(.+?)_/g, '$1') // italic (underscore form)
    .trim();

/**
 * Derives the plain, agent-readable string actually threaded into
 * `narrate.ts` — runs on already-sanitized input, strips the markdown-subset
 * syntax coaches type in the editor (bold/italic/heading/bullet), never a
 * general markdown parser.
 */
export const deriveInstructionsPlainText = (sanitizedRichText: string): string =>
  sanitizedRichText
    .split('\n')
    .map(stripMarkdownLine)
    .filter((line) => line.length > 0)
    .join('\n');

export type CoachInstructions = {
  id: string;
  version: number;
  richText: string;
  plainText: string;
  mealShares: MealShareOverrides | null;
};

export const getActiveInstructions = async (
  db: DbOrTx,
  coachId: string,
): Promise<CoachInstructions | null> => {
  const [row] = await db
    .select()
    .from(s.coachMealInstructions)
    .where(
      and(eq(s.coachMealInstructions.coachId, coachId), eq(s.coachMealInstructions.isActive, true)),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    version: row.version,
    richText: row.richText,
    plainText: row.plainText,
    mealShares: normalizeMealShareOverrides(row.mealShareOverrides) ?? null,
  };
};

export type SaveInstructionsResult = CoachInstructions & {
  /** The previously active plain_text, if any — lets the client show the
   * regenerate-confirm dialog only when the saved text actually changed,
   * without a second round-trip. */
  previousPlainText: string | null;
  changed: boolean;
  /** Non-blocking — see sanitizeInstructionsText's doc comment. Never blocks the save. */
  numericClaimWarning: boolean;
};

/**
 * Sanitizes both the stored markdown-subset string and the derived
 * `plain_text` before anything is persisted, writes a new version, flips
 * `is_active`, and audit-logs the change — same pattern
 * `writeDietaryProfileTx` (dietary.ts) already uses for versioned profiles.
 */
export const saveInstructions = async (
  db: Db,
  principal: { userId: string; coachId: string },
  rawText: string,
  mealShares?: MealShareOverrideInput | null,
): Promise<SaveInstructionsResult> => {
  const richText = sanitizeInstructionsText(rawText);
  const plainText = deriveInstructionsPlainText(richText);
  const previous = await getActiveInstructions(db, principal.coachId);
  // Omit → keep the previously saved split. `null` or `{}` → clear back to
  // template defaults. A populated object → replace.
  const nextShares =
    mealShares === undefined
      ? (previous?.mealShares ?? null)
      : (normalizeMealShareOverrides(mealShares) ?? null);

  const created = await db.transaction(async (tx) => {
    if (previous) {
      await tx
        .update(s.coachMealInstructions)
        .set({ isActive: false })
        .where(eq(s.coachMealInstructions.id, previous.id));
    }
    const [row] = await tx
      .insert(s.coachMealInstructions)
      .values({
        coachId: principal.coachId,
        version: (previous?.version ?? 0) + 1,
        isActive: true,
        richText,
        plainText,
        mealShareOverrides: nextShares,
        createdBy: principal.userId,
      })
      .returning();
    if (!row) throw new Error('coach meal instructions insert failed');
    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'coach_meal_instructions.update',
      resourceType: 'coach_meal_instructions',
      resourceId: row.id,
      before: { plainText: previous?.plainText ?? null, mealShares: previous?.mealShares ?? null },
      after: { plainText: row.plainText, mealShares: nextShares },
    });
    return row;
  });

  const sharesEqual = JSON.stringify(previous?.mealShares ?? null) === JSON.stringify(nextShares);

  return {
    id: created.id,
    version: created.version,
    richText: created.richText,
    plainText: created.plainText,
    mealShares: nextShares,
    previousPlainText: previous?.plainText ?? null,
    changed: (previous?.plainText ?? '') !== plainText || !sharesEqual,
    numericClaimWarning: NUMERIC_CLAIM_PATTERN.test(plainText),
  };
};
