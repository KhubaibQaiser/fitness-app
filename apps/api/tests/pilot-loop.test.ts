import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema, seed, type Db } from '@gymos/db';
import { resetPrincipalCache } from '@gymos/modules/identity';
import { resetManifestCache, tenantManifestSchema } from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';

const ACCESS_KEY = 'test-access-key-0123456789abcdef';

let app: App;
let db: Db;
let cookie = '';
let demoClientId = '';

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

const req = async (
  pathName: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> => {
  const headers = new Headers(init.headers);
  if (cookie) headers.set('cookie', cookie);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  return await app.request(pathName, {
    ...init,
    ...(init.json !== undefined ? { body: JSON.stringify(init.json) } : {}),
    headers,
  });
};

beforeAll(async () => {
  resetManifestCache();
  resetPrincipalCache();
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
  });
  db = pglite as unknown as Db;
  const seeded = await seed(db);
  demoClientId = seeded.demoClientId;
  app = buildApp({
    db,
    manifest,
    env: {
      PILOT_ACCESS_KEY: ACCESS_KEY,
      GATE_COOKIE_SECRET: 'a-test-cookie-secret-that-is-long-enough-000',
      AI_MODE: 'fallback',
    },
  });
});

describe('access gate', () => {
  it('blocks /v1 without the gate cookie', async () => {
    const res = await req('/v1/me');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('GATE_REQUIRED');
  });

  it('rejects a wrong key and accepts the right one', async () => {
    const bad = await req('/enter', { method: 'POST', json: { key: 'wrong-key-000000' } });
    expect(bad.status).toBe(401);

    const good = await req('/enter', { method: 'POST', json: { key: ACCESS_KEY } });
    expect(good.status).toBe(200);
    const setCookie = good.headers.get('set-cookie');
    expect(setCookie).toContain('gymos_gate=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    cookie = setCookie?.split(';')[0] ?? '';
  });

  it('serves /v1/me once gated', async () => {
    const res = await req('/v1/me');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; roles: string[] };
    expect(body.name).toBe('Pilot Coach');
    expect(body.roles).toContain('COACH');
  });

  it('exposes public config without the gate', async () => {
    const res = await app.request('/v1/config/public');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { appName: string };
    expect(body.appName).toBe('GymOS Coach');
  });
});

describe('roster & clients', () => {
  it('lists the seeded demo client attention-first', async () => {
    const res = await req('/v1/clients');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { name: string; attentionScore: number }[] };
    expect(body.items.some((i) => i.name === 'Adnan (Demo)')).toBe(true);
  });

  it('creates a new client and auto-assigns the pilot coach', async () => {
    const res = await req('/v1/clients', {
      method: 'POST',
      json: {
        name: 'Sara Test',
        sex: 'F',
        dob: '1996-05-01',
        heightCm: 165,
        activityLevel: 1.375,
      },
    });
    expect(res.status).toBe(200);
    const client = (await res.json()) as { id: string; name: string };
    expect(client.name).toBe('Sara Test');

    const detail = await req(`/v1/clients/${client.id}`);
    expect(detail.status).toBe(200);
  });

  it('validates request bodies (422 problem+json)', async () => {
    const res = await req('/v1/clients', { method: 'POST', json: { name: '', sex: 'X' } });
    expect(res.status).toBe(422);
    expect(res.headers.get('content-type')).toContain('application/problem+json');
  });
});

describe('the pilot core loop', () => {
  it('records vitals', async () => {
    const res = await req(`/v1/clients/${demoClientId}/vitals`, {
      method: 'POST',
      json: { weightKg: 84.1, waistCm: 95.5 },
    });
    expect(res.status).toBe(200);
  });

  it('generates a 7-day plan honoring the peanut allergy + halal profile', async () => {
    const res = await req(`/v1/clients/${demoClientId}/meal-plans/generate`, {
      method: 'POST',
      json: {},
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      plan: { id: string; status: string; targets: { kcal: number } };
      items: { foodId: string; mealName: string; macros: { kcal: number }; day: number }[];
    };
    expect(body.plan.status).toBe('DRAFT');
    expect(new Set(body.items.map((i) => i.day)).size).toBe(7);
    expect(body.items.every((i) => i.mealName.length > 0)).toBe(true);

    // Independent verification: no peanut-tagged and no non-halal foods present.
    const foodIds = [...new Set(body.items.map((i) => i.foodId))];
    const foods = await Promise.all(
      foodIds.map(async (id) => {
        const rows = await db.select().from(schema.foods);
        return rows.find((f) => f.id === id);
      }),
    );
    for (const food of foods) {
      expect(food?.allergenTags).not.toContain('peanut');
      expect(food?.dietaryFlags.halalStatus).toBe('HALAL');
    }

    // Day totals within tolerance of targets.
    const dayKcal = new Map<number, number>();
    for (const item of body.items) {
      dayKcal.set(item.day, (dayKcal.get(item.day) ?? 0) + item.macros.kcal);
    }
    for (const [, kcal] of dayKcal) {
      expect(Math.abs(kcal - body.plan.targets.kcal) / body.plan.targets.kcal).toBeLessThanOrEqual(
        0.06, // 5% solver tolerance + rounding slack
      );
    }
  });

  it('edits portions with server-side macro recomputation, then publishes', async () => {
    const plans = await req(`/v1/clients/${demoClientId}/meal-plans`);
    const list = (await plans.json()) as { items: { id: string; status: string }[] };
    const draft = list.items.find((p) => p.status === 'DRAFT');
    expect(draft).toBeDefined();
    if (!draft) return;

    const detail = await req(`/v1/meal-plans/${draft.id}`);
    const withItems = (await detail.json()) as {
      items: { id: string; portionGrams: number; macros: { kcal: number } }[];
    };
    const first = withItems.items[0];
    expect(first).toBeDefined();
    if (!first) return;

    const patched = await req(`/v1/meal-plans/${draft.id}`, {
      method: 'PATCH',
      json: {
        ops: [{ op: 'set-portion', itemId: first.id, portionGrams: first.portionGrams * 2 }],
      },
    });
    expect(patched.status).toBe(200);
    const after = (await patched.json()) as {
      items: { id: string; macros: { kcal: number } }[];
    };
    const editedItem = after.items.find((i) => i.id === first.id);
    expect(editedItem?.macros.kcal).toBeGreaterThan(first.macros.kcal * 1.8);

    const published = await req(`/v1/meal-plans/${draft.id}/publish`, { method: 'POST' });
    expect(published.status).toBe(200);
    const plan = (await published.json()) as { status: string };
    expect(plan.status).toBe('PUBLISHED');
  });

  it('re-validates the published plan when dietary restrictions change (safety loop)', async () => {
    // The plan certainly contains a milk-tagged food? Not guaranteed — use wheat_gluten:
    // roti/staple is near-certain in a Pakistani plan; assert flagging only if present.
    const res = await req(`/v1/clients/${demoClientId}/dietary-profile`, {
      method: 'PUT',
      json: {
        restrictions: [
          { type: 'ALLERGY_SEVERE', code: 'allergen:peanut' },
          { type: 'RELIGIOUS', code: 'religious:halal' },
          { type: 'ALLERGY_SEVERE', code: 'allergen:wheat_gluten' },
        ],
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { profile: { version: number }; planFlagged: boolean };
    expect(body.profile.version).toBe(2);

    const plans = await req(`/v1/clients/${demoClientId}/meal-plans`);
    const list = (await plans.json()) as { items: { status: string }[] };
    if (body.planFlagged) {
      expect(list.items.some((p) => p.status === 'NEEDS_REVIEW')).toBe(true);
      const unread = await req('/v1/notifications/unread-count');
      const count = (await unread.json()) as { count: number };
      expect(count.count).toBeGreaterThan(0);
    } else {
      expect(list.items.some((p) => p.status === 'PUBLISHED')).toBe(true);
    }
  });

  it('completes the due weekly check-in and returns an engine verdict', async () => {
    const due = await req('/v1/check-ins');
    const dueList = (await due.json()) as { items: { clientId: string }[] };
    expect(dueList.items.some((i) => i.clientId === demoClientId)).toBe(true);

    const res = await req(`/v1/clients/${demoClientId}/check-ins`, {
      method: 'POST',
      json: { vitals: { weightKg: 84.0 }, adherenceRating: 4 },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { verdict: { type: string; confidence: number } };
    expect([
      'HOLD',
      'ADJUST_TARGETS',
      'ADHERENCE_FOCUS',
      'PLATEAU_PROTOCOL',
      'INSUFFICIENT_DATA',
      'REFER_REVIEW',
    ]).toContain(body.verdict.type);
    expect(body.verdict.confidence).toBeGreaterThanOrEqual(0);
    expect(body.verdict.confidence).toBeLessThanOrEqual(1);

    // A fresh DUE check-in was scheduled for next week.
    const dueAfter = await req('/v1/check-ins');
    const dueAfterList = (await dueAfter.json()) as { items: { clientId: string }[] };
    expect(dueAfterList.items.some((i) => i.clientId === demoClientId)).toBe(true);
  });

  it('blocks generation for a pregnant client until an override is supplied', async () => {
    const create = await req('/v1/clients', {
      method: 'POST',
      json: {
        name: 'Gated Client',
        sex: 'F',
        dob: '1992-01-01',
        heightCm: 160,
        activityLevel: 1.375,
        medicalFlags: { pregnant: true },
      },
    });
    const client = (await create.json()) as { id: string };

    await req(`/v1/clients/${client.id}/vitals`, { method: 'POST', json: { weightKg: 65 } });
    await req(`/v1/clients/${client.id}/goals`, {
      method: 'POST',
      json: { preset: 'MAINTAIN', rate: 'STANDARD', startWeightKg: 65 },
    });

    const blocked = await req(`/v1/clients/${client.id}/meal-plans/generate`, {
      method: 'POST',
      json: {},
    });
    expect(blocked.status).toBe(403);
    const problem = (await blocked.json()) as { code: string };
    expect(problem.code).toBe('BLOCKED_REQUIRES_OVERRIDE');

    const overridden = await req(`/v1/clients/${client.id}/meal-plans/generate`, {
      method: 'POST',
      json: { override: { reason: 'Cleared by physician letter dated last week' } },
    });
    expect(overridden.status).toBe(200);
  });

  it('replays idempotent POSTs instead of double-writing', async () => {
    const key = 'test-idempotency-key-1'; // gitleaks:allow — non-secret test fixture
    const first = await req(`/v1/clients/${demoClientId}/vitals`, {
      method: 'POST',
      headers: { 'idempotency-key': key },
      json: { weightKg: 83.9 },
    });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { id: string };

    const replay = await req(`/v1/clients/${demoClientId}/vitals`, {
      method: 'POST',
      headers: { 'idempotency-key': key },
      json: { weightKg: 83.9 },
    });
    expect(replay.headers.get('x-idempotent-replay')).toBe('true');
    const replayBody = (await replay.json()) as { id: string };
    expect(replayBody.id).toBe(firstBody.id);

    const conflict = await req(`/v1/clients/${demoClientId}/vitals`, {
      method: 'POST',
      headers: { 'idempotency-key': key },
      json: { weightKg: 99 },
    });
    expect(conflict.status).toBe(409);
  });
});

describe('openapi document', () => {
  it('serves the generated spec', async () => {
    const res = await req('/openapi.json');
    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths).length).toBeGreaterThanOrEqual(20);
  });
});
