import { and, arrayOverlaps, eq, ilike, inArray, lte, not, sql } from 'drizzle-orm';
import { type CandidateFood, type FoodGroup } from '@gymos/core/nutrition';
import { schema as s, type Db, type DbOrTx } from '@gymos/db';
import { type TenantManifest } from '../tenancy';
import { restrictedAllergenCodes, type RestrictionInput } from './dietary';

export type ServingUnit = { name: string; grams: number };

const unitsForFoods = async (
  db: DbOrTx,
  foodIds: readonly string[],
): Promise<Map<string, ServingUnit[]>> => {
  if (foodIds.length === 0) return new Map();
  const rows = await db
    .select({
      foodId: s.foodServingUnits.foodId,
      name: s.foodServingUnits.name,
      grams: s.foodServingUnits.grams,
    })
    .from(s.foodServingUnits)
    .where(inArray(s.foodServingUnits.foodId, [...foodIds]));
  const map = new Map<string, ServingUnit[]>();
  for (const row of rows) {
    const list = map.get(row.foodId) ?? [];
    list.push({ name: row.name, grams: row.grams });
    map.set(row.foodId, list);
  }
  return map;
};

export type FoodListItem = {
  id: string;
  name: string;
  nameUr: string | null;
  foodGroup: string;
  per100g: s.Per100g;
  allergenTags: string[];
  servingUnits: ServingUnit[];
};

export const listFoods = async (
  db: Db,
  opts: { q?: string; group?: string; limit?: number },
): Promise<FoodListItem[]> => {
  const rows = await db
    .select({
      id: s.foods.id,
      name: s.foods.name,
      nameUr: s.foods.nameUr,
      foodGroup: s.foods.foodGroup,
      per100g: s.foods.per100g,
      allergenTags: s.foods.allergenTags,
    })
    .from(s.foods)
    .where(
      and(
        ...(opts.q ? [ilike(s.foods.name, `%${opts.q}%`)] : []),
        ...(opts.group ? [eq(s.foods.foodGroup, opts.group)] : []),
      ),
    )
    .orderBy(s.foods.name)
    .limit(opts.limit ?? 100);
  const units = await unitsForFoods(
    db,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({ ...r, servingUnits: units.get(r.id) ?? [] }));
};

/**
 * Layer 2 hard filter — runs in SQL BEFORE anything else touches the pool
 * (the first of the two allergen checks). Religious/ethical rules apply via
 * dietary flags; budget and prep ceilings come from the tenant manifest.
 */
export const candidatesForRestrictions = async (
  db: Db,
  restrictions: readonly RestrictionInput[],
  manifest: TenantManifest,
): Promise<CandidateFood[]> => {
  const allergens = restrictedAllergenCodes(restrictions);
  const codes = new Set(restrictions.map((r) => r.code));

  const conditions = [
    lte(s.foods.costTier, manifest.aiConfig.budgetTier),
    lte(s.foods.prepTimeMin, manifest.aiConfig.prepTimeCeilingMin),
  ];
  if (allergens.length > 0) {
    conditions.push(not(arrayOverlaps(s.foods.allergenTags, allergens)));
  }
  if (codes.has('religious:halal')) {
    conditions.push(sql`${s.foods.dietaryFlags}->>'halalStatus' = 'HALAL'`);
  }
  if (codes.has('religious:vegetarian')) {
    conditions.push(sql`(${s.foods.dietaryFlags}->>'vegetarian')::boolean = true`);
  }
  if (codes.has('religious:vegan')) {
    conditions.push(sql`(${s.foods.dietaryFlags}->>'vegan')::boolean = true`);
  }
  if (codes.has('religious:no_beef')) {
    conditions.push(
      sql`coalesce((${s.foods.dietaryFlags}->>'containsBeef')::boolean, false) = false`,
    );
  }
  if (codes.has('religious:no_pork')) {
    conditions.push(
      sql`coalesce((${s.foods.dietaryFlags}->>'containsPork')::boolean, false) = false`,
    );
  }
  if (codes.has('religious:no_alcohol')) {
    conditions.push(
      sql`coalesce((${s.foods.dietaryFlags}->>'containsAlcohol')::boolean, false) = false`,
    );
  }

  const rows = await db
    .select({
      id: s.foods.id,
      name: s.foods.name,
      foodGroup: s.foods.foodGroup,
      per100g: s.foods.per100g,
      allergenTags: s.foods.allergenTags,
    })
    .from(s.foods)
    .where(and(...conditions));

  const units = await unitsForFoods(
    db,
    rows.map((r) => r.id),
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    foodGroup: r.foodGroup as FoodGroup,
    per100g: r.per100g,
    allergenTags: r.allergenTags,
    servingUnits: units.get(r.id) ?? [],
  }));
};

export const foodsById = async (db: DbOrTx, ids: readonly string[]) => {
  if (ids.length === 0) {
    return new Map<string, { allergenTags: string[]; per100g: s.Per100g; name: string }>();
  }
  const rows = await db
    .select({
      id: s.foods.id,
      name: s.foods.name,
      allergenTags: s.foods.allergenTags,
      per100g: s.foods.per100g,
    })
    .from(s.foods)
    .where(inArray(s.foods.id, [...ids]));
  return new Map(
    rows.map((r) => [r.id, { allergenTags: r.allergenTags, per100g: r.per100g, name: r.name }]),
  );
};
