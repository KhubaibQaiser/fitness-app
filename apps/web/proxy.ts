import { NextResponse, type NextRequest } from 'next/server';

/** Must match `REFRESH_COOKIE_NAME` in apps/api — HttpOnly session cookie. Presence only. */
const REFRESH_COOKIE = 'gymos_refresh';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/enter'] as const;

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

/**
 * Optimistic route gate — not authorization. Access JWT verification stays on `/v1/*`.
 * Do not check `gymos_access` expiry here (15m TTL would false-logout a valid refresh).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(REFRESH_COOKIE);

  if (isPublicPath(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!v1/|gate/|health/|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
