/** Vercel Build Output API (v3) config for the API function. Pure so tests can assert it. */
export const FUNCTION_NAME = 'api';

export const outputConfig = () => ({
  version: 3,
  routes: [{ src: '/(.*)', dest: `/${FUNCTION_NAME}` }],
  crons: [{ path: '/internal/cron/nightly', schedule: '5 21 * * *' }],
});

export const functionConfig = () => ({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: false,
  maxDuration: 60,
});
