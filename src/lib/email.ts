/**
 * Hides most of an email address: "alex.smith@gmail.com" becomes "a•••@g••••.com". Enough for an organizer to tell
 * accounts apart without the full address sitting in the page; the full address is fetched only when asked for.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  const hide = (s: string) => `${s.charAt(0)}${"•".repeat(Math.min(Math.max(s.length - 1, 2), 4))}`;
  return `${hide(local)}@${hide(host)}${tld}`;
}

/** True for the shape of a UUID, which is all we ever expect for an id that comes from a form. */
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
