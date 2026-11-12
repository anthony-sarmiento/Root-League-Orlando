export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// A short list of the passwords that get tried first. Not exhaustive: the point is to refuse the obvious ones.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "p@ssw0rd", "qwerty", "qwertyuiop", "qwerty123",
  "letmein", "welcome", "welcome1", "iloveyou", "admin", "administrator", "changeme", "football", "baseball",
  "monkey", "dragon", "sunshine", "princess", "abc123", "trustno1", "starwars", "whatever", "rootleague",
  "rootleagueorlando", "root1234", "woodland", "woodland1", "geekdorlando", "orlando123",
]);

const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiopasdfghjklzxcvbnm"];

function isSequence(value: string): boolean {
  const v = value.toLowerCase();
  return SEQUENCES.some((s) => s.includes(v) || [...s].reverse().join("").includes(v));
}

/**
 * Problems with a new password, in plain words; empty means it is acceptable.
 * Length matters most (the minimum is 10), so there are no "must include a symbol" rules, just the obvious refusals.
 */
export function validatePassword(password: string, email = ""): string[] {
  const errors: string[] = [];
  if (password.length < PASSWORD_MIN) errors.push(`Use at least ${PASSWORD_MIN} characters for your password.`);
  if (password.length > PASSWORD_MAX) errors.push(`Keep your password under ${PASSWORD_MAX} characters.`);
  if (errors.length) return errors;

  const lower = password.toLowerCase();
  if (COMMON.has(lower.replace(/[^a-z0-9@]/g, ""))) errors.push("That password is one of the first ones attackers try. Pick something less common.");
  else if (/^(.)\1+$/.test(password)) errors.push("A password can't be one character repeated.");
  else if (isSequence(lower)) errors.push("A run of keys or letters in order is easy to guess. Mix it up.");
  else if (new Set(lower).size < 5) errors.push("Use a wider mix of characters.");

  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!errors.length && local.length >= 4 && lower.includes(local)) errors.push("Your password shouldn't contain your email name.");
  return errors;
}
