import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

/** Access token TTL — short-lived; refresh issues a new one. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export type AccessTokenClaims = {
  /** User id (JWT `sub`). */
  sub: string;
  /** Session id — ties access token to a refresh session for revocation checks. */
  sid: string;
  orgId: string;
  outletId: string;
  roles: string[];
};

type InternalPayload = JWTPayload & {
  sid: string;
  orgId: string;
  outletId: string;
  roles: string[];
};

const encoder = new TextEncoder();

export const issueAccessToken = async (
  claims: AccessTokenClaims,
  secret: string,
  now = Date.now(),
): Promise<{ token: string; expiresIn: number }> => {
  const token = await new SignJWT({
    sid: claims.sid,
    orgId: claims.orgId,
    outletId: claims.outletId,
    roles: claims.roles,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + ACCESS_TOKEN_TTL_SECONDS)
    .setIssuer('gymos')
    .sign(encoder.encode(secret));

  return { token, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
};

export const verifyAccessToken = async (
  token: string,
  secret: string,
): Promise<AccessTokenClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret), {
      issuer: 'gymos',
      algorithms: ['HS256'],
    });
    const p = payload as InternalPayload;
    if (
      typeof p.sub !== 'string' ||
      typeof p.sid !== 'string' ||
      typeof p.orgId !== 'string' ||
      typeof p.outletId !== 'string' ||
      !Array.isArray(p.roles)
    ) {
      return null;
    }
    return {
      sub: p.sub,
      sid: p.sid,
      orgId: p.orgId,
      outletId: p.outletId,
      roles: p.roles.filter((r): r is string => typeof r === 'string'),
    };
  } catch {
    return null;
  }
};
