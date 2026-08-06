ALTER TABLE "foods" ADD COLUMN "allowed_slots" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint

-- Backfill existing curated foods with slot affinity.
UPDATE "foods" SET "allowed_slots" = ARRAY['lunch','dinner']::text[]
WHERE "name" IN (
  'Chicken breast (skinless, cooked)',
  'Beef qeema (lean, cooked)',
  'Daal masoor (cooked)',
  'Daal chana (cooked)',
  'Chapli kebab',
  'Tilapia fillet (cooked)',
  'Chicken karahi',
  'Paneer',
  'Aloo sabzi',
  'Bhindi masala',
  'Palak (cooked spinach)',
  'Kachumber salad'
);--> statement-breakpoint

UPDATE "foods" SET "allowed_slots" = ARRAY['lunch']::text[]
WHERE "name" IN (
  'Roti (whole wheat)',
  'White rice (cooked)',
  'Brown rice (cooked)',
  'Desi ghee'
);--> statement-breakpoint

UPDATE "foods" SET "allowed_slots" = ARRAY['breakfast']::text[]
WHERE "name" IN (
  'Egg (whole, boiled)',
  'Greek yogurt (plain)',
  'Oats (dry)'
);--> statement-breakpoint

UPDATE "foods" SET "allowed_slots" = ARRAY['snack']::text[]
WHERE "name" IN (
  'Milk (full fat)',
  'Banana',
  'Apple',
  'Peanut butter',
  'Dates (khajoor)'
);--> statement-breakpoint

UPDATE "foods" SET "allowed_slots" = ARRAY['lunch','snack']::text[]
WHERE "name" IN ('Almonds', 'Olive oil');--> statement-breakpoint

-- New breakfast foods (idempotent by name).
INSERT INTO "foods" (
  "id", "source", "name", "name_ur", "food_group", "cuisine_tags", "allergen_tags",
  "allowed_slots", "dietary_flags", "per_100g", "cost_tier", "prep_time_min", "verified",
  "created_at", "updated_at"
)
SELECT
  gen_random_uuid(), 'curated', v.name, v.name_ur, v.food_group, v.cuisine_tags, v.allergen_tags,
  v.allowed_slots, v.dietary_flags::jsonb, v.per_100g::jsonb, v.cost_tier, v.prep_time_min, false,
  now(), now()
FROM (VALUES
  (
    'Egg scrambled', 'انڈے کی بھجیا', 'protein', ARRAY['general']::text[], ARRAY['egg']::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true}',
    '{"kcal":166,"proteinG":11,"fatG":12,"carbsG":2,"fiberG":0}',
    1, 8
  ),
  (
    'Omelette', 'آملیٹ', 'protein', ARRAY['general']::text[], ARRAY['egg']::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true}',
    '{"kcal":154,"proteinG":11,"fatG":12,"carbsG":0.6,"fiberG":0}',
    1, 10
  ),
  (
    'Granola yogurt bowl', NULL, 'dairy', ARRAY['general']::text[], ARRAY['milk','wheat_gluten']::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true}',
    '{"kcal":120,"proteinG":8,"fatG":3.5,"carbsG":16,"fiberG":2}',
    2, 5
  ),
  (
    'Bran bread', NULL, 'staple', ARRAY['general']::text[], ARRAY['wheat_gluten']::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true,"vegan":true}',
    '{"kcal":247,"proteinG":13,"fatG":3.5,"carbsG":41,"fiberG":7}',
    1, 0
  ),
  (
    'Black coffee', NULL, 'beverage', ARRAY['general']::text[], ARRAY[]::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true,"vegan":true}',
    '{"kcal":2,"proteinG":0.1,"fatG":0,"carbsG":0,"fiberG":0}',
    1, 5
  ),
  (
    'Green tea', NULL, 'beverage', ARRAY['general']::text[], ARRAY[]::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true,"vegan":true}',
    '{"kcal":1,"proteinG":0,"fatG":0,"carbsG":0,"fiberG":0}',
    1, 5
  ),
  (
    'Chai with stevia', 'چائے (اسٹیویا)', 'beverage', ARRAY['pakistani']::text[], ARRAY['milk']::text[],
    ARRAY['breakfast']::text[],
    '{"halalStatus":"HALAL","vegetarian":true}',
    '{"kcal":18,"proteinG":1,"fatG":0.8,"carbsG":1.5,"fiberG":0}',
    1, 8
  )
) AS v(name, name_ur, food_group, cuisine_tags, allergen_tags, allowed_slots, dietary_flags, per_100g, cost_tier, prep_time_min)
WHERE NOT EXISTS (SELECT 1 FROM "foods" f WHERE f.name = v.name);--> statement-breakpoint

INSERT INTO "food_serving_units" ("id", "food_id", "name", "grams")
SELECT gen_random_uuid(), f.id, u.unit_name, u.grams
FROM "foods" f
JOIN (VALUES
  ('Egg scrambled', 'serving', 100.0),
  ('Omelette', 'omelette', 120.0),
  ('Granola yogurt bowl', 'bowl', 250.0),
  ('Bran bread', 'slice', 35.0),
  ('Black coffee', 'cup', 240.0),
  ('Green tea', 'cup', 240.0),
  ('Chai with stevia', 'cup', 200.0)
) AS u(food_name, unit_name, grams) ON f.name = u.food_name
WHERE NOT EXISTS (
  SELECT 1 FROM "food_serving_units" su WHERE su.food_id = f.id AND su.name = u.unit_name
);
