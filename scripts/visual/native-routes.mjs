// Prints the native coach routes as "<key> <path>" lines, resolved against the database behind the
// API, for shell scripts that step through screens by deep link (perf/android/android-perf.sh).
// Usage: PILOT_COACH_PASSWORD=... node scripts/visual/native-routes.mjs <apiBase>
import { apiClient, findFixtures } from '../perf/lib.mjs';
import { coachRoutes, resolvable, WEB_ONLY } from './routes.mjs';

const [apiBase] = process.argv.slice(2);
if (!apiBase) throw new Error('usage: native-routes.mjs <apiBase>');
const api = apiClient(apiBase);
await api.signIn();
const { routes } = resolvable(
  coachRoutes(await findFixtures(api)).filter(([key]) => !WEB_ONLY.has(key)),
);
for (const [key, path] of routes) console.log(key, path);
