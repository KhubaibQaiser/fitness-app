// Screenshots every GymOS web route at 1440 and 390 px, light and dark, plus console errors per page.
// Usage: PILOT_COACH_PASSWORD=... node scripts/visual/web-shots.mjs <webBase> <outDir>
//        ONLY=light|dark shoots one scheme; TALL=1 also grows the viewport to an inner scroller's height.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { apiClient, coachCredentials, findFixtures } from '../perf/lib.mjs';
import { coachRoutes, PUBLIC_ROUTES, resolvable } from './routes.mjs';

const { chromium } = createRequire(new URL('../../apps/web/package.json', import.meta.url))(
  '@playwright/test',
);
const [base, outDir] = process.argv.slice(2);
if (!base || !outDir) throw new Error('usage: web-shots.mjs <webBase> <outDir>');
const api = apiClient(base);
await api.signIn();
const { routes: COACH, skipped } = resolvable(coachRoutes(await findFixtures(api)));

const VIEWPORTS = [
  { name: 'web-desktop', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  {
    name: 'web-mobile',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
];

const settle = async (page) => {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch((error) => {
    // Polling queries keep the network busy; carry on after the timeout, logged.
    console.warn('networkidle timeout', page.url(), error.message.split('\n')[0]);
  });
  await page.waitForTimeout(1200);
};

const shoot = async (page, dir, key, path, log) => {
  const errors = [];
  const onConsole = (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  };
  const onPageError = (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  const res = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.screenshot({ path: join(dir, `${key}.png`), fullPage: true });
  if (process.env.TALL) {
    // RN-web screens scroll inside a View, so fullPage stops at the viewport; grow it to the inner scroll height.
    const inner = await page.evaluate(() => {
      let max = 0;
      for (const el of document.querySelectorAll('*')) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 10) {
          max = Math.max(max, el.scrollHeight - el.clientHeight);
        }
      }
      return max;
    });
    if (inner > 0) {
      const vp = page.viewportSize();
      await page.setViewportSize({ width: vp.width, height: Math.min(vp.height + inner, 7000) });
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(dir, `${key}--tall.png`), fullPage: true });
      await page.setViewportSize(vp);
    }
  }
  page.off('console', onConsole);
  page.off('pageerror', onPageError);
  const finalUrl = page.url().replace(base, '');
  log.push({ key, path, finalUrl, status: res?.status() ?? null, errors });
  console.log(
    dir.split('/').pop(),
    key,
    res?.status(),
    finalUrl,
    errors.length ? `errors:${errors.length}` : '',
  );
};

const browser = await chromium.launch();
try {
  const { email, password } = coachCredentials();
  for (const scheme of process.env.ONLY ? [process.env.ONLY] : ['light', 'dark']) {
    for (const vp of VIEWPORTS) {
      const dir = join(outDir, scheme === 'light' ? vp.name : `${vp.name}-dark`);
      mkdirSync(dir, { recursive: true });
      const context = await browser.newContext({
        ...vp,
        colorScheme: scheme,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      const log = [];
      for (const [key, path] of PUBLIC_ROUTES) await shoot(page, dir, key, path, log);
      await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
      await settle(page);
      await page.getByLabel('Email').fill(email);
      await page.getByPlaceholder('Your password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
      await settle(page);
      for (const [key, path] of COACH) await shoot(page, dir, key, path, log);
      writeFileSync(join(dir, 'index.json'), JSON.stringify({ skipped, shots: log }, null, 2));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
