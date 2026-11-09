import { getRequestListener } from '@hono/node-server';
import { GET } from './vercel';

/** Node (req, res) default export for the Vercel Build Output function bundled by scripts/build-vercel.mjs. */
export default getRequestListener(GET, {
  // A failed cold start (env, database, manifest) must show up in the function logs, not as a bare 500.
  errorHandler: (error) => {
    console.error('API request failed', error);
    return new Response('Internal Server Error', { status: 500 });
  },
});
