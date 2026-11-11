# Root League Orlando 

A woodland-themed site for organizing live **Root** board game sessions in Orlando: game nights, stats, and a seasonal League Points (LP) leaderboard.

## Stack

Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth). Without Supabase credentials the site runs on built-in sample data.

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
npm test        # unit tests (stats, seasons, game validation)
npm run build
```

## Connect Supabase (real league data + organizer tools)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It creates the tables, the `log_game` function and row-level security (everyone can read, only organizers can write).
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (or anon) key from *Project Settings → API*. Restart `npm run dev`. The "sample data" banner disappears.
4. Create your organizer account: *Authentication → Users → Add user* (email + password).
5. Make that user an organizer by running this in the SQL editor, using your email:

   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

6. Sign in at `/login`, then use `/admin` to add players, schedule game nights and log games.

Organizer rights are enforced by the database (row-level security), not just the UI.

## Deploy (Vercel)

The site is hosted on Vercel, straight from the GitHub repo.

1. Push the repo to GitHub, then *Add New → Project* in Vercel and import it. Framework preset: Next.js (auto-detected, no build settings needed).
2. Under *Settings → Environment Variables*, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (same values as `.env.local`) for Production, and for Preview if you want preview deployments to use real data.
3. In Supabase, *Authentication → URL Configuration*: set the Site URL to your Vercel domain.
4. Redeploy after changing environment variables — they're read at build time for `NEXT_PUBLIC_*` values.

Only the publishable key belongs in these variables; never put a Supabase `service_role` key in the site.

## Layout

- `src/lib/stats.ts` — leaderboard, player profile and faction stat calculations
- `src/lib/data.ts` — the one place pages read league data from (Supabase, or sample data)
- `src/lib/game-input.ts` — validation for logging a game
- `src/lib/sample-data.ts` — made-up demo league
- `src/app/admin`, `src/app/login`, `src/proxy.ts` — organizer sign-in and tools
- `supabase/schema.sql` — database tables, `log_game` function and security policies
- `src/components/FactionBadge.tsx` — faction icons; set `icon` per faction in `league.ts` once images are in `public/factions/`
