import { AVATARS } from "./avatars.generated";
import { FACTIONS, type FactionId } from "./league";

export const NAME_MAX = 40;
export const BIO_MAX = 280;

export interface ProfileInput {
  name: string;
  bio: string;
  favoriteFaction: string; // "" when not chosen
  avatar: string; // "" when not chosen
}

const AVATAR_IDS = new Set(AVATARS.map((a) => a.id));
const FACTION_IDS = new Set<string>(FACTIONS.map((f) => f.id));

export function isAvatarId(id: string | undefined | null): id is string {
  return Boolean(id && AVATAR_IDS.has(id));
}

export function getAvatar(id: string | undefined | null) {
  return isAvatarId(id) ? AVATARS.find((a) => a.id === id) : undefined;
}

/** Trims fields and returns user-facing problems; empty means the profile is valid. */
export function validateProfile(input: ProfileInput): { clean: ProfileInput; errors: string[] } {
  const clean: ProfileInput = {
    name: input.name.trim().replace(/\s+/g, " "),
    bio: input.bio.trim(),
    favoriteFaction: input.favoriteFaction.trim(),
    avatar: input.avatar.trim(),
  };
  const errors: string[] = [];

  if (!clean.name) errors.push("Choose a player name.");
  else if (clean.name.length > NAME_MAX) errors.push(`Keep your name under ${NAME_MAX} characters.`);

  if (clean.bio.length > BIO_MAX) errors.push(`Keep your bio under ${BIO_MAX} characters.`);
  if (clean.favoriteFaction && !FACTION_IDS.has(clean.favoriteFaction)) errors.push("Pick a faction from the list.");
  if (clean.avatar && !AVATAR_IDS.has(clean.avatar)) errors.push("Pick an avatar from the list.");

  return { clean, errors };
}

export function asFactionId(value: string | null | undefined): FactionId | undefined {
  return value && FACTION_IDS.has(value) ? (value as FactionId) : undefined;
}
