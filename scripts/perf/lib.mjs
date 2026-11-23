// Shared helpers for scripts/perf and scripts/visual. Every target must be on this machine.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/** Returns `value` when every host it names is this machine; throws otherwise. */
export const assertLocalUrl = (value, what) => {
  if (!value) throw new Error(`${what} is required`);
  let url;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new Error(`${what} is not a URL`, { cause });
  }
  // libpq and postgres.js let ?host= / ?hostaddr= override the host part, so check those too.
  const hosts = [
    url.hostname,
    ...url.searchParams.getAll('host'),
    ...url.searchParams.getAll('hostaddr'),
  ];
  const remote = hosts.find((host) => !LOCAL_HOSTS.has(host));
  if (remote !== undefined) {
    // Name only the host: the URL itself may carry a password.
    throw new Error(
      `${what} must point at this machine (localhost, 127.0.0.1 or ::1), not "${remote || '(no host)'}"`,
    );
  }
  return value;
};

/** The synthetic seeder's database: local, named, and never the everyday `gymos` dev database. */
export const assertSyntheticDatabaseUrl = (value) => {
  assertLocalUrl(value, 'DATABASE_URL');
  const name = decodeURIComponent(new URL(value).pathname.slice(1));
  if (name === '' || name === 'gymos') {
    throw new Error(
      `synthetic data needs its own database (for example gymos_perf_170), not "${name || '(none)'}"`,
    );
  }
  return value;
};

/** The seeded pilot coach. The password comes from the variable the seed read, never a file. */
export const coachCredentials = (env = process.env) => {
  if (!env.PILOT_COACH_PASSWORD) {
    throw new Error('set PILOT_COACH_PASSWORD to the password the database was seeded with');
  }
  return { email: 'coach@pilot.local', password: env.PILOT_COACH_PASSWORD };
};

/** A timed JSON client for the API, directly or through the web app's /v1 proxy. */
export const apiClient = (base) => {
  assertLocalUrl(base, 'base URL');
  let token = '';
  const call = async (method, path, body) => {
    const t0 = performance.now();
    const res = await fetch(base + path, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const buf = await res.arrayBuffer();
    const ms = performance.now() - t0;
    const text = new TextDecoder().decode(buf);
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    const json = (res.headers.get('content-type') ?? '').includes('json') ? JSON.parse(text) : null;
    return { ms, bytes: buf.byteLength, json, headers: res.headers };
  };
  const signIn = async () => {
    const login = () => call('POST', '/v1/auth/login', coachCredentials());
    const res = await login().catch((error) => {
      // A keep-alive socket the server closed while we idled resets on reuse; signing in again is safe.
      if (error.cause?.code !== 'ECONNRESET') throw error;
      return login();
    });
    token = res.json.accessToken;
    return res;
  };
  return { call, signIn };
};

/**
 * Finds the clients the scripts visit in whatever data the database holds, so nothing hard-codes ids:
 * `plan` has a meal plan (synthetic data), `checkIn` is a completed check-in (the seed's demo
 * client), `empty` has no weigh-ins. Any of them is undefined when the data has none.
 */
export const findFixtures = async (api) => {
  const roster = (await api.call('GET', '/v1/clients')).json.items;
  if (roster.length === 0) throw new Error('the roster is empty: seed the database first');
  const fx = { first: roster[0].id, empty: roster.find((c) => c.latestWeightKg == null)?.id };
  for (const { id } of roster) {
    if (!fx.plan && (await api.call('GET', `/v1/clients/${id}/meal-plans`)).json.items.length > 0) {
      fx.plan = id;
    }
    if (!fx.checkIn) {
      const items = (await api.call('GET', `/v1/clients/${id}/check-ins`)).json.items;
      const done = items.find((k) => k.completedAt);
      if (done) fx.checkIn = { client: id, id: done.id };
    }
    if (fx.plan && fx.checkIn) break;
  }
  return fx;
};

export const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Every perf script writes results.json in this shape; summarize.mjs reads repeated runs of it. */
export const writeResults = (dir, script, scenarios) =>
  writeFileSync(
    join(dir, 'results.json'),
    JSON.stringify({ script, at: new Date().toISOString(), scenarios }, null, 2),
  );

const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs > 0 && abs < 1) return n.toFixed(3);
  return abs < 100 ? String(+n.toFixed(1)) : Math.round(n).toLocaleString('en-US');
};

/** Markdown table of median (min–max) per scenario and metric across runs of one script. */
export const summaryTable = (runs) => {
  const scripts = new Set(runs.map((r) => r.script));
  if (scripts.size !== 1)
    throw new Error(`mixed scripts in one summary: ${[...scripts].join(', ')}`);
  const names = Object.keys(runs[0].scenarios);
  const metrics = [...new Set(names.flatMap((n) => Object.keys(runs[0].scenarios[n])))];
  const rows = names.map((name) => {
    const cells = metrics.map((m) => {
      const xs = runs.map((r) => r.scenarios[name]?.[m]).filter((x) => typeof x === 'number');
      if (xs.length === 0) return '—';
      const note = xs.length < runs.length ? ` (n=${xs.length})` : '';
      return `${fmt(median(xs))} (${fmt(Math.min(...xs))}–${fmt(Math.max(...xs))})${note}`;
    });
    return `| ${name} | ${cells.join(' | ')} |`;
  });
  return [
    `| Scenario | ${metrics.join(' | ')} |`,
    `| --- | ${metrics.map(() => '---').join(' | ')} |`,
    ...rows,
  ].join('\n');
};
