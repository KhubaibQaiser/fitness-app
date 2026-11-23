import { randomUUID } from 'node:crypto';

/** Ruling O15: letters, digits, "-", "_" and ".", 1 to 128 characters. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * The caller's x-request-id when it is safe to echo into the response header, logs and
 * problem bodies. Otherwise a fresh id, the same as when the header is missing.
 */
export const resolveRequestId = (incoming: string | undefined): string =>
  incoming !== undefined && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
