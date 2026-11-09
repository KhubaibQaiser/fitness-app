import { getRequestListener } from '@hono/node-server';
import { GET } from './vercel';

/** Host, user and password length of the database URL, never the password itself. */
const describeDatabaseUrl = (raw: string | undefined): string => {
  if (!raw) return 'DATABASE_URL is not set';
  try {
    const url = new URL(raw);
    return `database host=${url.hostname} user=${url.username} passwordLength=${url.password.length}`;
  } catch {
    return 'DATABASE_URL is not a valid URL';
  }
};

/** Node (req, res) default export for the Vercel Build Output function bundled by scripts/build-vercel.mjs. */
export default getRequestListener(GET, {
  // A failed cold start (env, database, manifest) must show up in the function logs, not as a bare 500.
  errorHandler: (error) => {
    console.error('API request failed', describeDatabaseUrl(process.env.DATABASE_URL), error);
    return new Response('Internal Server Error', { status: 500 });
  },
});
