import { type Context } from 'hono';

type ProblemStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;

/**
 * RFC 9457-shaped error. Handlers THROW this; the app-level onError maps it
 * to an application/problem+json response — so typed route handlers only
 * ever return their declared success shape.
 */
export class ProblemError extends Error {
  constructor(
    readonly status: ProblemStatus,
    readonly code: string,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(`${code}: ${title}`);
  }
}

export const problemResponse = (
  c: Context,
  status: ProblemStatus,
  code: string,
  title: string,
  detail?: string,
): Response => {
  const requestId: unknown = c.get('requestId');
  const body = {
    type: `https://gymos.app/problems/${code.toLowerCase().replaceAll('_', '-')}`,
    title,
    status,
    code,
    ...(detail !== undefined ? { detail } : {}),
    ...(typeof requestId === 'string' ? { requestId } : {}),
  };
  return c.body(JSON.stringify(body), status, { 'content-type': 'application/problem+json' });
};
