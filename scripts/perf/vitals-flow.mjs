// Signed-in page loads under phone-like throttling (390x844 @2x, 4x CPU, 150 ms RTT, 1.6 Mbps down:
// the Lighthouse mobile profile), with a filmstrip and a CPU profile per route, then one client-side
// navigation from the roster to a client hub. Run it against the production web build.
// Usage: PILOT_COACH_PASSWORD=... node scripts/perf/vitals-flow.mjs <webBase> <outDir>
//        ONLY=roster,hub limits the routes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { apiClient, coachCredentials, findFixtures, writeResults } from './lib.mjs';

const { chromium } = createRequire(new URL('../../apps/web/package.json', import.meta.url))(
  '@playwright/test',
);
const [base, out] = process.argv.slice(2);
if (!base || !out) throw new Error('usage: vitals-flow.mjs <webBase> <outDir>');
const api = apiClient(base);
await api.signIn();
const C = (await findFixtures(api)).plan;
if (!C)
  throw new Error('no client with a meal plan: run seed-synthetic.mjs on this database first');
mkdirSync(join(out, 'film'), { recursive: true });
mkdirSync(join(out, 'cpu'), { recursive: true });

const ROUTES = [
  ['home', '/'],
  ['roster', '/clients'],
  ['hub', `/clients/${C}`],
  ['journey', `/clients/${C}/journey`],
  ['history', `/clients/${C}/history`],
  ['plan-tab', `/clients/${C}/meal-plan`],
  ['plan-editor', `/clients/${C}/plan`],
  ['check-in', `/clients/${C}/check-in`],
  ['vitals', `/clients/${C}/vitals/new`],
  ['intake', '/clients/new'],
  ['tools', '/tools'],
];
const ONLY = process.env.ONLY?.split(',');

const OBSERVER = `
  window.__v = { lcp: 0, cls: 0, longTasks: [], fcp: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.longTasks.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__v.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
`;

const settle = (page, ms) =>
  page.waitForLoadState('networkidle', { timeout: ms }).catch((error) => {
    // Polling queries can keep the network busy; carry on after the timeout, logged.
    console.warn('networkidle timeout', page.url(), error.message.split('\n')[0]);
  });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(OBSERVER);
  const page = await ctx.newPage();
  const { email, password } = coachCredentials();
  await page.goto(base + '/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(email);
  await page.getByPlaceholder('Your password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  await page.waitForTimeout(1500);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Profiler.enable');

  const routes = [];
  for (const [key, path] of ROUTES.filter(([k]) => !ONLY || ONLY.includes(k))) {
    // A full page load per route: what a coach gets from a link, a refresh or a PWA launch.
    await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    await cdp.send('Profiler.start');
    const t0 = Date.now();
    await page.goto(base + path, { waitUntil: 'commit' });
    for (const at of [250, 500, 1000, 1500, 2000, 3000, 4000, 6000]) {
      const wait = at - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
      await page
        .screenshot({
          path: join(out, 'film', `${key}-${at}.jpg`),
          type: 'jpeg',
          quality: 55,
          scale: 'css',
        })
        .catch((error) =>
          console.warn('filmstrip frame skipped', key, at, error.message.split('\n')[0]),
        );
    }
    await settle(page, 20_000);
    await page.waitForTimeout(800);
    const { profile } = await cdp.send('Profiler.stop');
    writeFileSync(join(out, 'cpu', `${key}.cpuprofile`), JSON.stringify(profile));
    const v = await page.evaluate(() => ({
      ...window.__v,
      dom: document.getElementsByTagName('*').length,
      api: performance
        .getEntriesByType('resource')
        .filter((r) => r.name.includes('/v1/'))
        .map((r) => ({
          url: r.name.split('/v1/')[1].slice(0, 40),
          start: Math.round(r.startTime),
          ms: Math.round(r.duration),
        })),
      text: document.body.innerText.slice(0, 80).replace(/\s+/g, ' '),
    }));
    const tbt = v.longTasks.reduce((a, d) => a + Math.max(0, d - 50), 0);
    routes.push({
      key,
      path,
      fcp: Math.round(v.fcp),
      lcp: Math.round(v.lcp),
      cls: +v.cls.toFixed(3),
      tbt,
      longTasks: v.longTasks,
      dom: v.dom,
      api: v.api,
      text: v.text,
    });
    console.log(
      key,
      'FCP',
      Math.round(v.fcp),
      'LCP',
      Math.round(v.lcp),
      'TBT',
      tbt,
      'DOM',
      v.dom,
      'long tasks',
      v.longTasks.length,
      '|',
      v.text.slice(0, 50),
    );
  }

  // Client-side navigation, what a coach gets tapping a roster row.
  await page.goto(base + '/clients');
  await settle(page, 20_000);
  await page.evaluate(() => {
    window.__v.longTasks = [];
  });
  const tNav = Date.now();
  await page.locator('a[href^="/clients/"]:not([href="/clients/new"])').first().click();
  await page.waitForURL((u) => /^\/clients\/[^/]+$/.test(u.pathname));
  await page.getByText('Overview').first().waitFor({ timeout: 15_000 });
  const navMs = Date.now() - tNav;
  const navLongTasks = await page.evaluate(() => window.__v.longTasks);
  console.log('client-side nav roster->hub ms', navMs, 'long tasks', navLongTasks);

  const profileName = '4x CPU, 150 ms RTT, 1.6 Mbps down, 390x844 @2x';
  writeFileSync(
    join(out, 'vitals.json'),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        profile: profileName,
        routes,
        clientSideNav: { roster_to_hub_ms: navMs, longTasks: navLongTasks },
      },
      null,
      2,
    ),
  );
  const scenarios = Object.fromEntries(
    routes.map((r) => [
      r.key,
      {
        fcp: r.fcp,
        lcp: r.lcp,
        tbt: r.tbt,
        longTasks: r.longTasks.length,
        longest: Math.max(0, ...r.longTasks),
        dom: r.dom,
        apiCalls: r.api.length,
      },
    ]),
  );
  scenarios['roster → hub (client-side)'] = {
    ms: navMs,
    longTasks: navLongTasks.length,
    longest: Math.max(0, ...navLongTasks),
  };
  writeResults(out, 'vitals-flow', scenarios);
} finally {
  await browser.close();
}
