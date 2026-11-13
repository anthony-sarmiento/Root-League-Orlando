/**
 * CAPTCHA (Cloudflare Turnstile). The site key is public by design; the matching secret key lives only in the
 * Supabase dashboard (Authentication → Attack Protection), which checks every token the forms pass along.
 * With no site key set the forms simply show no check, so the site works before CAPTCHA is switched on.
 */
export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
export const captchaEnabled = Boolean(turnstileSiteKey);

/** Whether the "Continue with Google" button is shown (turn it on once the provider is set up in Supabase). */
export const googleSignInEnabled = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "true";

/** The token Turnstile put in the form, or "" if there isn't one. */
export const captchaTokenFrom = (formData: FormData) => String(formData.get("cf-turnstile-response") ?? "");
