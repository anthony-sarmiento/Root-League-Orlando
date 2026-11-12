# Root League Orlando

A woodland-themed site for Orlando's live **Root** board game league: game nights and RSVPs, player profiles, faction stats, and a seasonal League Points (LP) leaderboard.

## Stack

Next.js (App Router, TypeScript, Tailwind) · Supabase (Postgres + Auth) · hosted on Vercel. Without Supabase credentials the site runs on built-in sample data.

## League rules

Rules live in [`src/lib/league.ts`](src/lib/league.ts) and the database `seasons` table:

- A table seats 4 players (sometimes 3). LP by finish at a table of four: **1st = 5, 2nd = 3, 3rd = 2, 4th = 1**; at a table of three: **5 / 3 / 2**. Nights have rounds, each with several tables. The point values live in [`src/lib/league.ts`](src/lib/league.ts).
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
2. In the SQL editor run, **in order**, everything in [`supabase/migrations/`](supabase/migrations): `0001_initial.sql`, `0002_accounts_rsvps_seasons.sql`, `0003_homeland_factions.sql`, `0004_avatar_background.sql`, then `0005_avatar_position.sql`, then `0006_name_safety.sql`, then `0007_rounds_and_tables.sql`, then `0008_game_reports.sql`, then `0009_connect_accounts.sql`, then `0010_privacy.sql`. (Run 0002 and 0003 before deploying a version of the site that uses accounts; the site tolerates a missing 0002 but accounts won't work until it's applied.)
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable (or anon) key from *Project Settings → API*.
4. *Authentication → Providers → Email*: turn **Confirm email** off, so players can sign up instantly. Set the Site URL under *Authentication → URL Configuration* to your Vercel domain.
5. Make yourself an organizer: sign up on the site (or *Authentication → Users → Add user*), then run:

   ```sql
   insert into admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

Organizer rights are enforced by the database (row-level security), not just the UI.

## Accounts, profiles and RSVPs

- Anyone can create an account at `/signup`, then choose a player name, favorite faction, bio, character portrait and a faction background for it at `/account`.
- A player whose games an organizer already logged can **claim** that name; an organizer approves it in `/admin`, and the account then owns that history.
- Signed-in players RSVP to upcoming game nights; the list is public.
- Double accounts: a player who already has a profile can still claim an existing name (an organizer approves, and their profile is merged into it). Organizers can also connect any account to any name, or merge two names, from the organizer page. Connecting adds a second login to a name that already has one, so both keep working.
- Players can report a table they played in at `/report`. It waits in the organizer queue and only counts once an organizer approves it (organizers can correct it first). Players can have 5 reports waiting at once, can only report games they sat at, and can withdraw a report until it is reviewed.
- Account links are private in the database. Public profiles only expose name, bio, favorite faction and avatar.

## Deploy (Vercel)

1. Import the GitHub repo into Vercel (Next.js preset, no build settings needed).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under *Settings → Environment Variables* (Production and Preview), then redeploy — `NEXT_PUBLIC_*` values are baked in at build time.

Only the publishable key belongs in the site; never put a Supabase `service_role` key in it.

## Artwork

The original Root artwork lives in `/assets` (about 150 MB, **not committed**). `npm run assets` turns it into small WebP files under `public/` (faction icons, patterned backgrounds, hero art and 70+ player portraits) and regenerates `src/lib/avatars.generated.ts`. It needs `ffmpeg` on your PATH. The committed `public/` files are all the site needs, so you only re-run this when the artwork changes. Root and its iconography are © Leder Games.

After `npm run assets`, run `node scripts/image-sizes.mjs` (needs `ffprobe`) to refresh `src/lib/image-sizes.generated.ts`, the true pixel size of each portrait and piece of art. Small copies (`public/avatars/sm`, `public/patterns/sm`) are used for list rows, cards and phone banners.

## Speed

The site aims for 99+ on Lighthouse (mobile and desktop). What keeps it there:

- **Nothing decorative competes with the first paint.** The web fonts (self-hosted in `public/fonts`, declared in `src/app/fonts.css`) and all artwork are requested only once the page has loaded and painted. `ReadyOnLoad` adds the `ready` and `fonts` classes to `<html>` after that, and `DeferredImage` (a stand-in for `next/image`) swaps a blank, correctly shaped placeholder for the real picture at the same moment. Until then text uses metric-matched fallback fonts, so nothing jumps. Don't bring back `next/font` or `next/image` for artwork: they fetch during the first paint.
- Page headers are the one thing drawn straight away, using a small, faint pattern that is preloaded (`Banner`).
- Artwork is small WebP; cards, tiles and avatars use `sm` copies.
- Long rosters (`PlayerGrid`) start with a handful of cards and offer "Show everyone".

To measure: `bash scripts/rebuild-sample.sh` (production build with demo data on port 3300), then `bash scripts/lh-run.sh 3300 "" players leaderboard` for mobile and desktop scores, and `node scripts/lh-summary.mjs <report.json>` to see what lost points. Needs Chrome (set `CHROME_PATH` if it isn't in the usual place).

## Layout

- `src/lib/stats.ts`, `seasons.ts`, `rsvp.ts`, `profile.ts` — pure logic, all unit-tested
- `src/lib/data.ts` — the one place pages read league data from (Supabase, or sample data)
- `src/lib/viewer.ts` — who is signed in, their profile and organizer status
- `src/app/account`, `login`, `signup`, `admin`, `src/proxy.ts` — accounts and organizer tools
- `src/components` — shared UI (avatars, podium, leaderboard table, RSVP, session cards)
- `supabase/migrations` — database schema and policies; `supabase/tests` — policy tests
- `scripts/build-assets.mjs` — artwork pipeline; `image-sizes.mjs`, `rebuild-sample.sh`, `lh-run.sh`, `lh-summary.mjs` — image sizes and Lighthouse runs

## Security notes

See [`SECURITY.md`](SECURITY.md) for how emails and accounts are protected, what is enforced where, and the Supabase and Vercel settings only the owner can switch on.

- The site only talks to the database through bound parameters (Supabase's client and `rpc` calls), never by building SQL strings, so names can't inject SQL.
- Player names go through one validator (`src/lib/player-name.ts`) everywhere: letters, numbers, spaces and `. ' _ -`, 40 characters at most, invisible characters removed. Migration `0006_name_safety.sql` repeats the rule inside the database (no markup, quotes, statement punctuation, control or invisible characters; one name per player ignoring capitals).
- Under *Authentication* in the Supabase dashboard, review the rate limits for sign-ups and sign-ins and consider turning on CAPTCHA protection, since sign-up is open to anyone.
