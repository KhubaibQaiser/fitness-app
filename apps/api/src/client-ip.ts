import { isIP } from 'node:net';
import { type AppContext } from './http';

export type ClientIp = (c: AppContext) => string | null;

/** The Node server's socket address, when the request came through `@hono/node-server`. */
const socketAddress = (c: AppContext): string | null => {
  const bindings: unknown = c.env;
  if (typeof bindings !== 'object' || bindings === null || !('incoming' in bindings)) return null;
  const { incoming } = bindings as { incoming: { socket?: { remoteAddress?: string } } };
  return incoming.socket?.remoteAddress ?? null;
};

const header =
  (name: string): ClientIp =>
  (c) => {
    const value = c.req.header(name)?.trim();
    return value !== undefined && isIP(value) !== 0 ? value : null;
  };

/**
 * The caller's IP, read only from a source the host sets itself, never from a header a caller can
 * write (so not the first `x-forwarded-for` hop):
 * - Vercel (`VERCEL=1`): `x-real-ip`, which Vercel sets to the visitor's public IP and overwrites
 *   (https://vercel.com/docs/headers/request-headers#x-real-ip), also on rewrites from the web app
 *   (https://vercel.com/docs/rewrites#identifying-the-visitor-at-your-origin).
 * - Render (`RENDER=true`): `cf-connecting-ip`, set by Cloudflare in front of Render's public traffic,
 *   which rejects a caller's own value (https://render.com/articles/host-pocketbase-on-render).
 * - Anywhere else: the Node server's socket address, if there is one.
 * Null when none applies; callers then use the per-account and global limits, never a shared bucket.
 */
export const createClientIpResolver = (platform: {
  VERCEL?: string | undefined;
  RENDER?: string | undefined;
}): ClientIp => {
  if (platform.VERCEL === '1') return header('x-real-ip');
  if (platform.RENDER === 'true') return header('cf-connecting-ip');
  return (c) => {
    const address = socketAddress(c);
    return address !== null && isIP(address) !== 0 ? address : null;
  };
};

const hextets = (part: string): string[] =>
  part === '' ? [] : part.split(':').flatMap((g) => (g.includes('.') ? ['0', '0'] : [g]));

/**
 * The per-IP limiter key: IPv4 per address; IPv6 grouped by /64, as is standard practice for rate
 * limits, since one subscriber is usually given a whole /64. An IPv4-mapped IPv6 address counts as
 * its IPv4 address.
 */
export const rateLimitKey = (ip: string): string => {
  if (isIP(ip) !== 6) return ip;
  const address = (ip.split('%')[0] ?? ip).toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address)?.[1];
  if (mapped !== undefined) return mapped;
  const [head = '', tail] = address.split('::');
  const left = hextets(head);
  const right = tail === undefined ? [] : hextets(tail);
  const full = [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right];
  return `${full
    .slice(0, 4)
    .map((g) => Number.parseInt(g, 16).toString(16))
    .join(':')}::/64`;
};
