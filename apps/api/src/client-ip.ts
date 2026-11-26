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

/**
 * Reads the client IP from the host's documented client-IP header; elsewhere uses the socket
 * address. Returns null when none applies, and callers then use the per-account limit and the
 * route-wide cap.
 * - Vercel (`VERCEL=1`): `x-real-ip`, the visitor's public IP
 *   (https://vercel.com/docs/headers/request-headers#x-real-ip), also on rewrites from the web app
 *   (https://vercel.com/docs/rewrites#identifying-the-visitor-at-your-origin).
 * - Render (`RENDER=true`): null. Render's docs don't name a client-IP header, and the socket
 *   address there is Render's proxy.
 * - Anywhere else: the Node server's socket address.
 */
export const createClientIpResolver = (host: {
  VERCEL?: string | undefined;
  RENDER?: string | undefined;
}): ClientIp => {
  if (host.VERCEL === '1') {
    return (c) => {
      const value = c.req.header('x-real-ip')?.trim();
      return value !== undefined && isIP(value) !== 0 ? value : null;
    };
  }
  if (host.RENDER === 'true') return () => null;
  // ponytail: behind a reverse proxy this is the proxy's address, so callers share one per-IP key;
  // fine for a Node server facing callers directly, needs a trusted-proxy setting behind a proxy.
  return (c) => {
    const address = socketAddress(c);
    return address !== null && isIP(address) !== 0 ? address : null;
  };
};

/** The eight 16-bit groups of a valid IPv6 address (zone id already removed). */
const ipv6Groups = (address: string): number[] => {
  const groups = (part: string): number[] =>
    part === ''
      ? []
      : part.split(':').flatMap((group) => {
          if (!group.includes('.')) return [Number.parseInt(group, 16)];
          const [a = 0, b = 0, c = 0, d = 0] = group.split('.').map(Number);
          return [(a << 8) | b, (c << 8) | d];
        });
  const [head = '', tail] = address.split('::');
  const left = groups(head);
  const right = tail === undefined ? [] : groups(tail);
  return [...left, ...Array<number>(8 - left.length - right.length).fill(0), ...right];
};

/**
 * The per-IP limiter key: IPv4 per address; IPv6 grouped by /64, as is standard practice for rate
 * limits. An IPv4-mapped IPv6 address (`::ffff:a.b.c.d` in any form) counts as its IPv4 address.
 */
export const rateLimitKey = (ip: string): string => {
  if (isIP(ip) !== 6) return ip;
  const groups = ipv6Groups((ip.split('%')[0] ?? ip).toLowerCase());
  const [g0, g1, g2, g3, g4, g5, g6 = 0, g7 = 0] = groups;
  if ([g0, g1, g2, g3, g4].every((g) => g === 0) && g5 === 0xffff) {
    return [g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff].join('.');
  }
  return `${groups
    .slice(0, 4)
    .map((g) => g.toString(16))
    .join(':')}::/64`;
};
