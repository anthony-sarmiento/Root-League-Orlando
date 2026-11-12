import { FACTIONS, type FactionId, type Game, type Placement, type Player, type Session } from "./league";
import { DEFAULT_SEASONS } from "./seasons";

/**
 * Deterministic made-up league data, used until Supabase is connected.
 * Same output every run so pages don't flicker between reloads.
 */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261111);

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const ROSTER: { name: string; strength: number; avatar: string; bio: string; favorite: FactionId }[] = [
  { name: "Bramble", strength: 1.4, avatar: "camdyn", bio: "Tinkerer by day, Marquise by night. Always has a plan.", favorite: "marquise" },
  { name: "Thistle", strength: 1.1, avatar: "alfhard", bio: "Loves a good Eyrie turmoil. Hates losing a decree.", favorite: "eyrie" },
  { name: "Juniper", strength: 0.9, avatar: "kyra-sirien", bio: "Woodland Alliance die-hard. Sympathy is my love language.", favorite: "alliance" },
  { name: "Fennel", strength: 0.7, avatar: "gunvald", bio: "Riverfolk trader. Everything has a price.", favorite: "riverfolk" },
  { name: "Hazel", strength: 0.5, avatar: "beth", bio: "Here for the snacks and the Vagabond quests.", favorite: "vagabond" },
  { name: "Sorrel", strength: 0.3, avatar: "thaddeus", bio: "Tunnels everywhere. Ask me about the Duchy.", favorite: "duchy" },
  { name: "Rowan", strength: 0.1, avatar: "ranger", bio: "Second season at the table, still learning the Corvids.", favorite: "corvids" },
  { name: "Mossy", strength: 0, avatar: "tinker", bio: "New this season. Please be gentle.", favorite: "lizards" },
];

const players: Player[] = ROSTER.map((p) => ({
  id: `p-${p.name.toLowerCase()}`,
  name: p.name,
  bio: p.bio,
  avatar: p.avatar,
  avatarBg: p.favorite,
  favoriteFaction: p.favorite,
}));
const strengthOf = new Map(ROSTER.map((p, i) => [players[i].id, p.strength]));

// Game nights run every other Sunday. Season 1: Jun 7 – Sep 7. Season 2: Nov 1 – Dec 20.
const PAST_DATES = [
  "2026-06-07", "2026-06-21", "2026-07-05", "2026-07-19", "2026-08-02", "2026-08-16", "2026-08-30",
  "2026-11-01",
];
const UPCOMING_DATES = ["2026-11-15", "2026-11-29", "2026-12-13"];

const sessions: Session[] = [...PAST_DATES, ...UPCOMING_DATES].map((date, i) => ({
  id: `s-${i + 1}`,
  date,
  title: "Root League Night",
  location: "GEEK'D Orlando",
}));

const games: Game[] = [];
for (const session of sessions.filter((s) => PAST_DATES.includes(s.date))) {
  const seated = shuffle(players);
  for (let table = 0; table < 2; table++) {
    const group = seated.slice(table * 4, table * 4 + 4);
    const factions = shuffle(FACTIONS).slice(0, 4);
    // Stronger players tend to finish higher, with plenty of upsets.
    const order = group
      .map((p, i) => ({ p, faction: factions[i].id, score: (strengthOf.get(p.id) ?? 0) + rng() * 1.8 }))
      .sort((a, b) => b.score - a.score);
    games.push({
      id: `g-${session.id}-${table + 1}`,
      playedOn: session.date,
      sessionId: session.id,
      results: order.map((o, i) => ({
        playerId: o.p.id,
        faction: o.faction,
        placement: (i + 1) as Placement,
      })),
    });
  }
}

export const sampleData = { players, sessions, games, seasons: DEFAULT_SEASONS };
