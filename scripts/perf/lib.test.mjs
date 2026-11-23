import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertLocalUrl,
  assertSyntheticDatabaseUrl,
  coachCredentials,
  median,
  summaryTable,
} from './lib.mjs';

test('local database and app URLs pass unchanged', () => {
  for (const url of [
    'postgres://gymos:gymos@localhost:5432/gymos_perf_170',
    'postgresql://gymos:gymos@127.0.0.1/gymos_perf_500',
    'postgres://gymos@[::1]:5432/x',
    'http://127.0.0.1:3108',
    'http://localhost:8188',
  ]) {
    assert.equal(assertLocalUrl(url, 'url'), url);
  }
});

test('a remote host is refused without echoing the password', () => {
  const url =
    'postgres://user:s3cret@ep-cool-name.eu-central-1.aws.neon.tech/neondb?sslmode=require';
  assert.throws(
    () => assertLocalUrl(url, 'DATABASE_URL'),
    (error) => {
      assert.match(error.message, /DATABASE_URL must point at this machine/);
      assert.match(error.message, /neon\.tech/);
      assert.doesNotMatch(error.message, /s3cret/);
      return true;
    },
  );
  assert.throws(() => assertLocalUrl('http://192.168.1.20:8080', 'base URL'), /192\.168\.1\.20/);
  assert.throws(
    () => assertLocalUrl('https://gymos.example.com', 'base URL'),
    /gymos\.example\.com/,
  );
});

test('a ?host= or ?hostaddr= override to a remote host is refused', () => {
  assert.throws(
    () => assertLocalUrl('postgres://gymos:gymos@localhost/db?host=db.example.com', 'DATABASE_URL'),
    /db\.example\.com/,
  );
  assert.throws(
    () => assertLocalUrl('postgres://gymos:gymos@localhost/db?hostaddr=10.0.0.5', 'DATABASE_URL'),
    /10\.0\.0\.5/,
  );
});

test('a missing, hostless or malformed URL is refused', () => {
  assert.throws(() => assertLocalUrl(undefined, 'DATABASE_URL'), /DATABASE_URL is required/);
  assert.throws(() => assertLocalUrl('postgres:///gymos', 'DATABASE_URL'), /\(no host\)/);
  assert.throws(() => assertLocalUrl('localhost:5432/gymos', 'DATABASE_URL'), /\(no host\)/);
  assert.throws(() => assertLocalUrl('not a url', 'DATABASE_URL'), /not a URL/);
});

test('synthetic data never goes into the dev database or a remote one', () => {
  const ok = 'postgres://gymos:gymos@localhost:5432/gymos_perf_170';
  assert.equal(assertSyntheticDatabaseUrl(ok), ok);
  assert.throws(
    () => assertSyntheticDatabaseUrl('postgres://gymos:gymos@localhost:5432/gymos'),
    /not "gymos"/,
  );
  assert.throws(
    () => assertSyntheticDatabaseUrl('postgres://gymos:gymos@localhost:5432/'),
    /\(none\)/,
  );
  assert.throws(
    () => assertSyntheticDatabaseUrl('postgres://u:p@db.example.com:5432/gymos_perf_170'),
    /must point at this machine/,
  );
});

test('credentials come only from the seed variable', () => {
  assert.throws(() => coachCredentials({}), /PILOT_COACH_PASSWORD/);
  assert.deepEqual(coachCredentials({ PILOT_COACH_PASSWORD: 'x'.repeat(12) }), {
    email: 'coach@pilot.local',
    password: 'x'.repeat(12),
  });
});

test('median of odd and even counts', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([7]), 7);
});

test('summary table shows median (min–max) and flags runs missing a metric', () => {
  const run = (lcp, tbt) => ({ script: 'vitals-flow', scenarios: { roster: { lcp, tbt } } });
  const table = summaryTable([run(3000, 1400), run(2800, 1200), run(3400, undefined)]);
  assert.equal(
    table,
    [
      '| Scenario | lcp | tbt |',
      '| --- | --- | --- |',
      '| roster | 3,000 (2,800–3,400) | 1,300 (1,200–1,400) (n=2) |',
    ].join('\n'),
  );
  assert.throws(
    () => summaryTable([run(1, 1), { script: 'api-bench', scenarios: {} }]),
    /mixed scripts/,
  );
});
