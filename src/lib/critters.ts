import type { FactionId } from "./league";

/** Character portraits (files in /public/avatars) used as decoration, one standing in for each faction. */
export const FACTION_CRITTER: Record<FactionId, string> = {
  marquise: "commander-vauquelin",
  eyrie: "duke-whitetalon",
  alliance: "captain-ismay",
  vagabond: "thief",
  riverfolk: "skipper-audgunn",
  lizards: "ubade-mo-set",
  corvids: "odilie",
  duchy: "captain-hersilia",
  keepers: "arbiter",
  hundreds: "pirate",
  frogs: "tory",
  bats: "envoy",
  knaves: "cenric",
};

export const critterSrc = (id: string) => `/avatars/${id}.webp`;
