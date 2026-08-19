import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_HEADER_NAME } from './auth/constants';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth/jwt';
import { type AppContext } from './http';

export const readRefreshToken = (c: AppContext): string | undefined => {
  const fromCookie = getCookie(c, REFRESH_COOKIE_NAME);
  if (fromCookie !== undefined && fromCookie.length > 0) return fromCookie;
  const fromHeader = c.req.header(REFRESH_HEADER_NAME);
  if (fromHeader !== undefined && fromHeader.length > 0) return fromHeader;
  return undefined;
};

/**
 * `Lax`, not `Strict`: WebKit drops `SameSite=Strict` cookies across browser
 * relaunch / tab restore, which signs Safari users out on refresh. Cross-site
 * mutations stay blocked by the `sec-fetch-site` check on `/v1/*`.
 */
export const setRefreshCookie = (c: AppContext, refreshToken: string, maxAgeSec: number): void => {
  const https =
    c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: https,
    sameSite: 'Lax',
    path: '/',
    maxAge: maxAgeSec,
  });
};

export const setAccessCookie = (c: AppContext, accessToken: string): void => {
  const https =
    c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
  setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: https,
    sameSite: 'Lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
};

export const clearRefreshCookie = (c: AppContext): void => {
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
};

export const clearAccessCookie = (c: AppContext): void => {
  deleteCookie(c, ACCESS_COOKIE_NAME, { path: '/' });
};

/** Clear both web session cookies (login out / hard auth failure). */
export const clearAuthCookies = (c: AppContext): void => {
  clearRefreshCookie(c);
  clearAccessCookie(c);
};
