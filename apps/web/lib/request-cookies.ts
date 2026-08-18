import { cookies } from 'next/headers';

/** Incoming request cookies as a `Cookie` header for the API. */
export const requestCookieHeader = async (): Promise<string> => {
  const jar = await cookies();
  return jar
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
};
