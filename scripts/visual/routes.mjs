// The coach routes the visual sweeps visit, built from findFixtures() (scripts/perf/lib.mjs).
// A route's path is undefined when the database has no data for it; callers skip it and say so.
export const PUBLIC_ROUTES = [
  ['01-login', '/login'],
  ['02-signup', '/signup'],
  ['03-forgot-password', '/forgot-password'],
];

/** Web-only keys the native capture leaves out. */
export const WEB_ONLY = new Set(['28-settings-meal-planner', '99-not-found']);

export const coachRoutes = (fx) => {
  // The seed's demo client (the one with a completed check-in): vitals, check-ins, dietary, no plan.
  const rich = fx.checkIn?.client;
  const at = (id, path = '') => (id ? `/clients/${id}${path}` : undefined);
  return [
    ['10-home', '/'],
    ['11-clients', '/clients'],
    ['12-clients-new', '/clients/new'],
    ['13-client-hub-rich', at(rich)],
    ['14-client-hub-plans', at(fx.plan)],
    ['15-client-hub-empty', at(fx.empty)],
    ['16-vitals-new', at(rich, '/vitals/new')],
    ['17-goal-new', at(rich, '/goal/new')],
    ['18-check-in', at(rich, '/check-in')],
    ['19-check-in-detail', fx.checkIn && at(rich, `/check-ins/${fx.checkIn.id}`)],
    ['20-dietary', at(rich, '/dietary')],
    ['21-history', at(rich, '/history')],
    ['22-journey', at(rich, '/journey')],
    ['23-meal-plan', at(fx.plan, '/meal-plan')],
    ['24-plan', at(fx.plan, '/plan')],
    ['25-meal-plan-empty', at(rich, '/meal-plan')],
    ['26-notifications', '/notifications'],
    ['27-settings', '/settings'],
    ['28-settings-meal-planner', '/settings/meal-planner'],
    ['29-settings-nutrition', '/settings/nutrition'],
    ['30-tools', '/tools'],
    ['31-tools-meals', '/tools/meals'],
    ['32-tools-targets', '/tools/targets'],
    ['99-not-found', '/this-route-does-not-exist'],
  ];
};

/** Splits routes into those the data supports and the keys it doesn't, logging the skipped ones. */
export const resolvable = (routes) => {
  const skipped = routes.filter(([, path]) => !path).map(([key]) => key);
  if (skipped.length > 0)
    console.warn(`skipped (no matching data in this database): ${skipped.join(', ')}`);
  return { routes: routes.filter(([, path]) => path), skipped };
};
