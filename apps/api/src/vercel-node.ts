import { getRequestListener } from '@hono/node-server';
import { GET } from './vercel';

/** Node (req, res) default export for the Vercel Build Output function bundled by scripts/build-vercel.mjs. */
export default getRequestListener(GET);
