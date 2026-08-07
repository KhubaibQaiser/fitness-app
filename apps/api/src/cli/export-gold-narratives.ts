/**
 * Export de-identified gold labels for offline LoRA:
 * `{ input: NarrativeInput, labels: { meals: [{ name, prepNotes }] } }`
 * from published day-1 coach-final names/notes.
 *
 * Usage (from repo root):
 *   DATABASE_URL=... pnpm --filter @gymos/api exec tsx src/cli/export-gold-narratives.ts [out.jsonl]
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { assertDeidentified, type NarrativeInput } from '@gymos/ai';
import { createDb, schema as s } from '@gymos/db';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const outPath = process.argv[2] ?? path.resolve(process.cwd(), 'gold-narratives.jsonl');
const locale = process.env.GOLD_LOCALE ?? 'en';
const cuisineContext = process.env.GOLD_CUISINE ?? 'pakistani';
const verbosity: 'terse' | 'standard' =
  process.env.GOLD_VERBOSITY === 'terse' ? 'terse' : 'standard';

const { db, close } = createDb(databaseUrl, 2);

type GoldRow = {
  readonly input: NarrativeInput;
  readonly labels: {
    readonly meals: readonly { readonly name: string; readonly prepNotes: string }[];
  };
};

try {
  const plans = await db
    .select({ id: s.mealPlans.id })
    .from(s.mealPlans)
    .where(eq(s.mealPlans.status, 'PUBLISHED'));

  if (plans.length === 0) {
    writeFileSync(outPath, '');
    console.log(`wrote 0 rows → ${outPath}`);
    process.exit(0);
  }

  const planIds = plans.map((p) => p.id);
  const items = await db
    .select({
      planId: s.mealPlanItems.planId,
      day: s.mealPlanItems.day,
      mealIndex: s.mealPlanItems.mealIndex,
      mealSlot: s.mealPlanItems.mealSlot,
      mealName: s.mealPlanItems.mealName,
      prepNotes: s.mealPlanItems.prepNotes,
      foodId: s.mealPlanItems.foodId,
      portionGrams: s.mealPlanItems.portionGrams,
    })
    .from(s.mealPlanItems)
    .where(and(inArray(s.mealPlanItems.planId, planIds), eq(s.mealPlanItems.day, 1)));

  const foodIds = [...new Set(items.map((i) => i.foodId))];
  const foods =
    foodIds.length === 0
      ? []
      : await db
          .select({ id: s.foods.id, name: s.foods.name })
          .from(s.foods)
          .where(inArray(s.foods.id, foodIds));
  const foodName = new Map(foods.map((f) => [f.id, f.name]));

  const lines: string[] = [];
  for (const plan of plans) {
    const dayItems = items.filter((i) => i.planId === plan.id);
    if (dayItems.length === 0) continue;

    const byMeal = new Map<number, typeof dayItems>();
    for (const item of dayItems) {
      const list = byMeal.get(item.mealIndex) ?? [];
      list.push(item);
      byMeal.set(item.mealIndex, list);
    }

    const mealEntries = [...byMeal.entries()].sort(([a], [b]) => a - b);

    const input: NarrativeInput = {
      locale,
      cuisineContext,
      verbosity,
      days: [
        {
          day: 1,
          meals: mealEntries.map(([, mealItems]) => {
            const head = mealItems[0];
            const slot = head?.mealSlot ?? 'lunch';
            return {
              slot,
              items: mealItems.map((i) => ({
                foodName: foodName.get(i.foodId) ?? 'unknown',
                grams: i.portionGrams,
              })),
            };
          }),
        },
      ],
    };

    const labels = {
      meals: mealEntries.map(([, mealItems]) => {
        const head = mealItems[0];
        return {
          name: head?.mealName ?? 'Meal',
          prepNotes: head?.prepNotes ?? '',
        };
      }),
    };

    const row: GoldRow = { input, labels };
    if (assertDeidentified(row) !== null) {
      console.warn(`skip plan ${plan.id}: de-ID violation`);
      continue;
    }
    lines.push(JSON.stringify(row));
  }

  writeFileSync(outPath, lines.length > 0 ? `${lines.join('\n')}\n` : '');
  console.log(`wrote ${lines.length} rows → ${outPath}`);
} finally {
  await close();
}
