import { and, eq, inArray } from 'drizzle-orm';
import { assertNoRestrictedFoods } from '@gymos/core/nutrition';
import { schema as s, type Db } from '@gymos/db';
import { notify } from '../notifications';
import { writeAudit } from '../shared/audit';

export type RestrictionInput = {
  type:
    | 'ALLERGY_SEVERE'
    | 'ALLERGY_MILD'
    | 'INTOLERANCE'
    | 'DISLIKE'
    | 'RELIGIOUS'
    | 'ETHICAL'
    | 'MEDICAL';
  code: string;
  note?: string | null | undefined;
};

export type DietaryProfile = {
  id: string;
  version: number;
  restrictions: { type: RestrictionInput['type']; code: string; note: string | null }[];
};

export const getActiveProfile = async (
  db: Db,
  clientId: string,
): Promise<DietaryProfile | null> => {
  const [profile] = await db
    .select()
    .from(s.clientDietaryProfiles)
    .where(
      and(
        eq(s.clientDietaryProfiles.clientId, clientId),
        eq(s.clientDietaryProfiles.isActive, true),
      ),
    )
    .limit(1);
  if (!profile) return null;
  const restrictions = await db
    .select({
      type: s.dietaryRestrictions.type,
      code: s.dietaryRestrictions.code,
      note: s.dietaryRestrictions.note,
    })
    .from(s.dietaryRestrictions)
    .where(eq(s.dietaryRestrictions.profileId, profile.id));
  return { id: profile.id, version: profile.version, restrictions };
};

/** Allergen codes (stripped of the `allergen:` prefix) that must hard-filter foods. */
export const restrictedAllergenCodes = (
  restrictions: readonly { type: string; code: string }[],
): string[] =>
  restrictions
    .filter(
      (r) =>
        (r.type === 'ALLERGY_SEVERE' || r.type === 'ALLERGY_MILD' || r.type === 'INTOLERANCE') &&
        r.code.startsWith('allergen:'),
    )
    .map((r) => r.code.slice('allergen:'.length));

export type PutProfileResult = {
  profile: DietaryProfile;
  planFlagged: boolean;
};

/**
 * Safety-critical write path (spec FR-M4, coach-authored in the pilot):
 * new version → immediate re-validation of the PUBLISHED plan → violation
 * blocks the plan (NEEDS_REVIEW) and raises a HIGH-priority notification.
 */
export const putProfile = async (
  db: Db,
  principal: { userId: string; outletId: string },
  clientId: string,
  restrictions: RestrictionInput[],
): Promise<PutProfileResult> => {
  const previous = await getActiveProfile(db, clientId);

  const profile = await db.transaction(async (tx) => {
    if (previous) {
      await tx
        .update(s.clientDietaryProfiles)
        .set({ isActive: false })
        .where(eq(s.clientDietaryProfiles.id, previous.id));
    }
    const [created] = await tx
      .insert(s.clientDietaryProfiles)
      .values({
        clientId,
        outletId: principal.outletId,
        version: (previous?.version ?? 0) + 1,
        isActive: true,
        createdBy: principal.userId,
      })
      .returning();
    if (!created) throw new Error('profile insert failed');
    if (restrictions.length > 0) {
      await tx.insert(s.dietaryRestrictions).values(
        restrictions.map((r) => ({
          profileId: created.id,
          type: r.type,
          code: r.code,
          note: r.note ?? null,
        })),
      );
    }
    await writeAudit(tx, {
      actorUserId: principal.userId,
      actorRole: 'COACH',
      action: 'dietary.update',
      resourceType: 'client_dietary_profile',
      resourceId: created.id,
      before: { codes: previous?.restrictions.map((r) => r.code) ?? [] },
      after: { codes: restrictions.map((r) => r.code) },
    });
    return created;
  });

  // Immediate re-validation of the published plan against the NEW restrictions.
  let planFlagged = false;
  const [published] = await db
    .select({ id: s.mealPlans.id })
    .from(s.mealPlans)
    .where(and(eq(s.mealPlans.clientId, clientId), eq(s.mealPlans.status, 'PUBLISHED')))
    .limit(1);

  if (published) {
    const items = await db
      .select({ foodId: s.mealPlanItems.foodId })
      .from(s.mealPlanItems)
      .where(eq(s.mealPlanItems.planId, published.id));
    const foodIds = [...new Set(items.map((i) => i.foodId))];
    const foodRows =
      foodIds.length > 0
        ? await db
            .select({ id: s.foods.id, allergenTags: s.foods.allergenTags })
            .from(s.foods)
            .where(inArray(s.foods.id, foodIds))
        : [];
    const check = assertNoRestrictedFoods(
      items,
      new Map(foodRows.map((f) => [f.id, { allergenTags: f.allergenTags }])),
      restrictedAllergenCodes(restrictions),
    );
    if (!check.ok) {
      planFlagged = true;
      await db
        .update(s.mealPlans)
        .set({ status: 'NEEDS_REVIEW' })
        .where(eq(s.mealPlans.id, published.id));
      await notify(db, {
        recipientUserId: principal.userId,
        type: 'PLAN_NEEDS_REVIEW',
        priority: 'HIGH',
        payload: { clientId, planId: published.id, violation: check.error },
        deepLink: `/clients/${clientId}/plan`,
      });
    }
  }

  return {
    profile: {
      id: profile.id,
      version: profile.version,
      restrictions: restrictions.map((r) => ({ type: r.type, code: r.code, note: r.note ?? null })),
    },
    planFlagged,
  };
};
