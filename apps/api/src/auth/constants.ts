/** Cookie + header names for the session auth transport. */

/** HttpOnly access JWT cookie (web). Mobile uses Authorization: Bearer instead. */
export const ACCESS_COOKIE_NAME = 'gymos_access';

/** HttpOnly refresh cookie (web). Mobile sends the same value in the JSON body / Authorization is for access only. */
export const REFRESH_COOKIE_NAME = 'gymos_refresh';

/** Optional body/header field name when the client cannot use cookies (native). */
export const REFRESH_HEADER_NAME = 'x-refresh-token';
