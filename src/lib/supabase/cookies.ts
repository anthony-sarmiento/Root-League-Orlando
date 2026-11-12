/** The options Supabase suggests for a session cookie, tightened. */
interface CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
}

/**
 * Session cookies are only ever read on the server (there is no Supabase client in the browser), so they can be
 * invisible to page scripts: even if some script did run on the page it couldn't read or steal the login.
 * `SameSite=Lax` keeps them off cross-site requests that aren't plain navigations, and `Secure` keeps them off
 * unencrypted connections everywhere except local development.
 */
export function hardenCookie(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: options.path ?? "/",
  };
}
