import { AVATARS } from "./avatars.generated";
import { FACTIONS, type AvatarCrop, type FactionId } from "./league";

export const NAME_MAX = 40;

/** Where a portrait sits in its circle when the player hasn't moved it. */
export const DEFAULT_CROP: AvatarCrop = { x: 50, y: 32, zoom: 160 };
export const ZOOM_MIN = 100;
export const ZOOM_MAX = 300;

/** CSS that puts the crop's focal point in the middle of its square frame and zooms around it. */
export function cropStyle(crop: AvatarCrop = DEFAULT_CROP): { transformOrigin: string; transform: string } {
  return {
    transformOrigin: `${crop.x}% ${crop.y}%`,
    transform: `translate(${50 - crop.x}%, ${50 - crop.y}%) scale(${crop.zoom / 100})`,
  };
}

/** Builds a crop from database values; any missing piece falls back to the default. Returns undefined for the default look. */
export function cropFrom(x?: number | null, y?: number | null, zoom?: number | null): AvatarCrop | undefined {
  if (x == null && y == null && zoom == null) return undefined;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    x: clamp(x ?? DEFAULT_CROP.x, 0, 100),
    y: clamp(y ?? DEFAULT_CROP.y, 0, 100),
    zoom: clamp(zoom ?? DEFAULT_CROP.zoom, ZOOM_MIN, ZOOM_MAX),
  };
}
export const BIO_MAX = 280;

export interface ProfileInput {
  name: string;
  bio: string;
  favoriteFaction: string; // "" when not chosen
  avatar: string; // "" when not chosen
  avatarBg: string; // faction id, "" when not chosen
  avatarX: string; // "" when the portrait hasn't been moved
  avatarY: string;
  avatarZoom: string;
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
    avatarBg: input.avatarBg.trim(),
    avatarX: input.avatarX.trim(),
    avatarY: input.avatarY.trim(),
    avatarZoom: input.avatarZoom.trim(),
  };
  const errors: string[] = [];

  if (!clean.name) errors.push("Choose a player name.");
  else if (clean.name.length > NAME_MAX) errors.push(`Keep your name under ${NAME_MAX} characters.`);

  if (clean.bio.length > BIO_MAX) errors.push(`Keep your bio under ${BIO_MAX} characters.`);
  if (clean.favoriteFaction && !FACTION_IDS.has(clean.favoriteFaction)) errors.push("Pick a faction from the list.");
  if (clean.avatar && !AVATAR_IDS.has(clean.avatar)) errors.push("Pick an avatar from the list.");
  if (clean.avatarBg && !FACTION_IDS.has(clean.avatarBg)) errors.push("Pick a background from the list.");

  const inRange = (value: string, lo: number, hi: number) =>
    value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= lo && Number(value) <= hi);
  if (!inRange(clean.avatarX, 0, 100) || !inRange(clean.avatarY, 0, 100) || !inRange(clean.avatarZoom, ZOOM_MIN, ZOOM_MAX)) {
    errors.push("That picture position isn't valid. Use Reset and try again.");
  }

  return { clean, errors };
}

export function asFactionId(value: string | null | undefined): FactionId | undefined {
  return value && FACTION_IDS.has(value) ? (value as FactionId) : undefined;
}
