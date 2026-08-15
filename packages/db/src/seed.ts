import { DateTime } from 'luxon';
import {
  computeTargets,
  resolveWeeklyDeltaKg,
  type GoalPreset,
  type GoalRate,
} from '@gymos/core/nutrition';
import { type Db } from './client';
import * as s from './schema';
import { FOOD_SEED } from './seed-data/foods';
import { iso, isoDate, nowIso } from './time';

export type SeedResult = {
  orgId: string;
  outletId: string;
  coachUserId: string;
  coachId: string;
  demoClientId: string;
};

export type SeedOptions = {
  /** Pre-hashed password for the pilot coach (from `@gymos/modules/identity` `hashPassword`). */
  coachPasswordHash?: string | undefined;
  /** Optional tenant manifest JSON to register for the seeded org. */
  tenantManifest?: Record<string, unknown> | undefined;
  tenantSlug?: string | undefined;
};

const seedWeeklyDeltaKg = (
  tenantManifest: Record<string, unknown> | undefined,
  preset: GoalPreset,
  rate: GoalRate,
): number | undefined => {
  if (tenantManifest === undefined) return undefined;
  const nutrition = tenantManifest.nutrition;
  if (nutrition === null || typeof nutrition !== 'object' || Array.isArray(nutrition)) {
    return undefined;
  }
  const weekly = (nutrition as { weeklyDeltaKg?: unknown }).weeklyDeltaKg;
  if (weekly === null || typeof weekly !== 'object' || Array.isArray(weekly)) {
    return undefined;
  }
  return resolveWeeklyDeltaKg(weekly, preset, rate);
};

/**
 * Idempotent pilot seed: org, outlet (Asia/Karachi), pilot coach
 * (COACH + ORG_ADMIN), starter food set, and a demo client with 8 weeks
 * of realistic history so the app never opens empty.
 */
export const seed = async (db: Db, options: SeedOptions = {}): Promise<SeedResult> => {
  const existing = await db.select({ id: s.organizations.id }).from(s.organizations).limit(1);
  if (existing.length > 0) {
    throw new Error('database already seeded — refusing to double-seed');
  }

  const [org] = await db
    .insert(s.organizations)
    .values({ name: 'GymOS Pilot', joinCode: 'PILOT001' })
    .returning();
  if (!org) throw new Error('org insert failed');

  if (options.tenantManifest !== undefined) {
    await db.insert(s.tenantConfigs).values({
      orgId: org.id,
      slug: options.tenantSlug ?? 'pilot',
      manifest: options.tenantManifest,
    });
  }

  const [outlet] = await db
    .insert(s.outlets)
    .values({ orgId: org.id, name: 'Main Branch', timezone: 'Asia/Karachi' })
    .returning();
  if (!outlet) throw new Error('outlet insert failed');

  const [coachUser] = await db
    .insert(s.users)
    .values({
      email: 'coach@pilot.local',
      name: 'Pilot Coach',
      locale: 'en',
      emailVerifiedAt: nowIso(),
      ...(options.coachPasswordHash !== undefined
        ? { passwordHash: options.coachPasswordHash }
        : {}),
    })
    .returning();
  if (!coachUser) throw new Error('coach user insert failed');

  await db.insert(s.memberships).values([
    { userId: coachUser.id, role: 'COACH', orgId: org.id, outletId: outlet.id },
    { userId: coachUser.id, role: 'ORG_ADMIN', orgId: org.id },
  ]);

  const [coach] = await db.insert(s.coaches).values({ userId: coachUser.id }).returning();
  if (!coach) throw new Error('coach insert failed');

  // Foods + serving units
  for (const food of FOOD_SEED) {
    const [row] = await db
      .insert(s.foods)
      .values({
        source: 'curated',
        name: food.name,
        nameUr: food.nameUr ?? null,
        foodGroup: food.foodGroup,
        cuisineTags: food.cuisineTags,
        allergenTags: food.allergenTags,
        allowedSlots: food.allowedSlots,
        dietaryFlags: food.dietaryFlags,
        per100g: food.per100g,
        costTier: food.costTier,
        prepTimeMin: food.prepTimeMin,
        verified: false,
      })
      .returning();
    if (!row) throw new Error(`food insert failed: ${food.name}`);
    for (const unit of food.servingUnits) {
      await db.insert(s.foodServingUnits).values({ foodId: row.id, ...unit });
    }
  }

  // Demo client with 8 weeks of history
  const [demo] = await db
    .insert(s.clients)
    .values({
      outletId: outlet.id,
      name: 'Adnan (Demo)',
      sex: 'M',
      dob: '1994-03-14',
      heightCm: 175,
      activityLevel: 1.55,
      status: 'active',
      intake: null,
    })
    .returning();
  if (!demo) throw new Error('demo client insert failed');

  await db.insert(s.coachAssignments).values({
    coachId: coach.id,
    clientId: demo.id,
    outletId: outlet.id,
    assignedBy: coachUser.id,
  });

  // Dietary profile v1: severe peanut allergy + halal.
  const [profile] = await db
    .insert(s.clientDietaryProfiles)
    .values({
      clientId: demo.id,
      outletId: outlet.id,
      version: 1,
      isActive: true,
      createdBy: coachUser.id,
    })
    .returning();
  if (!profile) throw new Error('dietary profile insert failed');
  await db.insert(s.dietaryRestrictions).values([
    { profileId: profile.id, type: 'ALLERGY_SEVERE', code: 'allergen:peanut' },
    { profileId: profile.id, type: 'RELIGIOUS', code: 'religious:halal' },
  ]);

  // Goal + Layer-1 targets snapshot.
  // Pilot LOSE STANDARD is −1 kg/wk and exceeds the 25% deficit cap for typical
  // TDEE — use CONSERVATIVE (−0.5) so the demo seed stays feasible.
  const startWeight = 88;
  const weeklyDeltaKg = seedWeeklyDeltaKg(options.tenantManifest, 'LOSE', 'CONSERVATIVE');
  const computation = computeTargets(
    { sex: 'M', ageYears: 31, heightCm: 175, weightKg: startWeight, activity: 1.55 },
    'LOSE',
    'CONSERVATIVE',
    weeklyDeltaKg !== undefined ? { weeklyDeltaKg } : undefined,
  );
  if (!computation.ok) throw new Error('seed target computation failed');
  const eightWeeksAgo = DateTime.utc().minus({ weeks: 8 });
  const [goal] = await db
    .insert(s.clientGoals)
    .values({
      clientId: demo.id,
      outletId: outlet.id,
      preset: 'LOSE',
      rate: 'CONSERVATIVE',
      startDate: isoDate(eightWeeksAgo),
      startWeightKg: startWeight,
      targetWeightKg: 80,
      expectedWeeklyDeltaKg: computation.value.expectedWeeklyDeltaKg,
      initialTargets: computation.value.targets,
      tdeeEstimate: computation.value.tdee,
      checkinWeekday: 1,
      status: 'ACTIVE',
    })
    .returning();
  if (!goal) throw new Error('goal insert failed');

  // Twice-weekly weigh-ins trending ≈ −0.45 kg/week with deterministic jitter.
  const weighDays = Array.from({ length: 16 }, (_, i) => i * 3.5);
  for (const [i, dayOffset] of weighDays.entries()) {
    const jitter = ((i * 7919) % 5) * 0.05 - 0.1; // deterministic, ±0.1..0.15 kg
    const weight = Number((startWeight - (dayOffset / 7) * 0.45 + jitter).toFixed(2));
    const at = eightWeeksAgo.plus({ days: dayOffset });
    await db.insert(s.vitals).values({
      clientId: demo.id,
      outletId: outlet.id,
      recordedAt: iso(at),
      recordedBy: coachUser.id,
      source: 'coach',
      weightKg: weight,
      ...(i % 4 === 0 ? { waistCm: Number((98 - dayOffset * 0.05).toFixed(1)) } : {}),
      ...(i % 8 === 0 ? { restingHr: 66, bpSystolic: 122, bpDiastolic: 80 } : {}),
    });
  }

  // Weekly check-ins: 7 completed, 1 due today.
  for (let week = 1; week <= 7; week += 1) {
    const scheduled = eightWeeksAgo.plus({ weeks: week });
    await db.insert(s.checkIns).values({
      clientId: demo.id,
      outletId: outlet.id,
      goalId: goal.id,
      scheduledFor: isoDate(scheduled),
      completedAt: iso(scheduled.plus({ hours: 10 })),
      adherenceRating: 3 + ((week * 7919) % 3),
      status: 'COMPLETED',
      engineOutput: { type: week < 3 ? 'INSUFFICIENT_DATA' : 'HOLD', seeded: true },
    });
  }
  const today = isoDate(DateTime.utc());
  await db.insert(s.checkIns).values({
    clientId: demo.id,
    outletId: outlet.id,
    goalId: goal.id,
    scheduledFor: today,
    status: 'DUE',
  });

  await db.insert(s.clientAttention).values({
    clientId: demo.id,
    score: 60,
    reasons: [{ code: 'CHECKIN_DUE', weight: 60, since: nowIso() }],
    computedAt: nowIso(),
  });

  return {
    orgId: org.id,
    outletId: outlet.id,
    coachUserId: coachUser.id,
    coachId: coach.id,
    demoClientId: demo.id,
  };
};
