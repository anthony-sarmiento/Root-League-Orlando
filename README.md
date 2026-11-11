# Root League Orlando 🍂

A woodland-themed site for organizing live **Root** board game sessions in Orlando: game nights, stats, and a seasonal League Points (LP) leaderboard.

## Stack

Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth) — *database not wired up yet; the site runs on sample data.*

## League rules

All rules live in [`src/lib/league.ts`](src/lib/league.ts) and [`src/lib/seasons.ts`](src/lib/seasons.ts):

- 4 players per game. LP by finish: **1st = 5, 2nd = 3, 3rd = 2, 4th = 1**.
- Seasons last 2 calendar months. The player with the most LP at season end wins the prize pool.
- Season ties: most wins, then best average placement.
- LP is never stored — it's computed from placements, so changing the rules updates history too.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Layout

- `src/lib/stats.ts` — leaderboard, player profile and faction stat calculations
- `src/lib/data.ts` — the one place pages get data from (swap sample data for Supabase here)
- `src/lib/sample-data.ts` — made-up demo league
- `supabase/schema.sql` — database tables and row-level security (public read, admin write)
- `src/components/FactionBadge.tsx` — faction icons; set `icon` per faction in `league.ts` once images are in `public/factions/`
