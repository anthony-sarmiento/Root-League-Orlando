# Root League Orlando

A woodland-themed site for Orlando's live **Root** board game league: game nights and RSVPs, player profiles, faction stats, and a seasonal League Points (LP) leaderboard.

## Stack

Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth) · hosted on Vercel. Without Supabase credentials the site runs on built-in sample data.

## League rules

Rules live in [`src/lib/league.ts`](src/lib/league.ts) and the database `seasons` table:

- 4 players per game. LP by finish: **1st = 5, 2nd = 3, 3rd = 2, 4th = 1**.
- Seasons are explicit date ranges (Season 1: Jun 7 – Sep 7 2026, Season 2: Nov 1 – Dec 20 2026). Organizers add and edit them in `/admin`; they can't overlap. The player with the most LP at season end wins the prize pool.
- Season ties: most wins, then best average placement.
- LP is never stored — it's computed from placements, so changing the rules updates history too.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000 (uses .env.local if present)
npm test             # unit tests: stats, seasons, profiles, RSVPs, game validation
npm run test:db      # database migrations + row-level-security checks (in-memory Postgres)
npm run build
```

To see the site with demo data even when `.env.local` is set, run `node scripts/dev-sample.mjs` (port 3100).

## Connect Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor run, **in order**, everything in [`supabase/migrations/`](supabase/migrations): `0001_initial.sql`, then `0002_accounts_rsvps_seasons.sql`. (Run 0002 before deploying a version of the site that uses accounts; the site tolerates a missing 0002 but accounts won't work until it's applied.)
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (or anon) key from *Project Settings → API*.
4. *Authentication → Providers → Email*: turn **Confirm email** off, so players can sign up instantly. Set the Site URL under *Authentication → URL Configuration* to your Vercel domain.
5. Make yourself an organizer: sign up on the site (or *Authentication → Users → Add user*), then run:

   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

Organizer rights are enforced by the database (row-level security), not just the UI.

## Accounts, profiles and RSVPs

- Anyone can create an account at `/signup`, then choose a player name, favorite faction, bio and character portrait at `/account`.
- A player whose games an organizer already logged can **claim** that name; an organizer approves it in `/admin`, and the account then owns that history.
- Signed-in players RSVP to upcoming game nights; the list is public.
- Account links are private in the database. Public profiles only expose name, bio, favorite faction and avatar.

## Deploy (Vercel)

1. Import the GitHub repo into Vercel (Next.js preset, no build settings needed).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under *Settings → Environment Variables* (Production and Preview), then redeploy — `NEXT_PUBLIC_*` values are baked in at build time.

Only the publishable key belongs in the site; never put a Supabase `service_role` key in it.

## Artwork

The original Root artwork lives in `/assets` (about 150 MB, **not committed**). `npm run assets` turns it into small WebP files under `public/` (faction icons, patterned backgrounds, the logo, hero art and 70+ player portraits) and regenerates `src/lib/avatars.generated.ts`. It needs `ffmpeg` on your PATH. The committed `public/` files are all the site needs, so you only re-run this when the artwork changes. Root and its iconography are © Leder Games, used with permission.

## Layout

- `src/lib/stats.ts`, `seasons.ts`, `rsvp.ts`, `profile.ts` — pure logic, all unit-tested
- `src/lib/data.ts` — the one place pages read league data from (Supabase, or sample data)
- `src/lib/viewer.ts` — who is signed in, their profile and organizer status
- `src/app/account`, `login`, `signup`, `admin`, `src/proxy.ts` — accounts and organizer tools
- `src/components` — shared UI (avatars, podium, leaderboard table, RSVP, session cards)
- `supabase/migrations` — database schema and policies; `supabase/tests` — policy tests
- `scripts/build-assets.mjs` — artwork pipeline
