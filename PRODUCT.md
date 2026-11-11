# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router, TypeScript, Tailwind) with Supabase (Postgres and Auth). The Supabase database is not connected yet; the site currently runs on deterministic sample data behind `getLeagueData()` in `src/lib/data.ts`.

## Users
- **Players on their phones** (primary): league members checking standings, LP and their own stats at a game night or between them.
- **Organizers entering results** (primary): a small set of admins who log games and run sessions, often mid-event.
- **Newcomers deciding to join** (primary): Orlando players discovering the league and what a game night is like.

## Product Purpose
Root League Orlando organizes live, in-person play sessions of the board game Root for a local league. It tracks every game and turns the results into statistics (faction wins, player win rate, each player's best faction) and a League Points (LP) leaderboard that resets each season. Success is players checking the site because it gives them an identity in the league, and newcomers feeling welcome enough to show up to their first game night.

## Positioning
A local, in-person Root league with two-month seasons, a prize pool for the season's top LP earner, and a profile for every player that records their history and best faction. The site's job beyond a spreadsheet or Discord thread is to give players an identity and make newcomers feel welcome.

## Operating Context
- Every game seats exactly 4 players. LP by finish: 1st = 5, 2nd = 3, 3rd = 2, 4th = 1.
- Seasons last 2 calendar months; at season end the player with the most LP wins the prize pool. LP is computed from placements, never stored, so rule changes apply retroactively. Rules live in `src/lib/league.ts` and `src/lib/seasons.ts`.
- Season ties: most wins, then best average placement (a choice made by the builder, not yet confirmed by the league).
- Only players with at least one game in a season appear on that season's leaderboard; there is no minimum-games requirement.
- Games are played live at game nights ("sessions") in Orlando. Results are entered by admins.
- Public read; admin-only writes (Supabase row-level security, admins listed in an `admins` table).

## Capabilities and Constraints
- Pages today: Home, Leaderboard (per season), Players and player profiles, Factions (per season or all time), Game nights.
- Not built yet: admin sign-in and result entry, session creation, session sign-ups/RSVPs.
- Must be usable first on phones.
- Faction colors must never be the only signal: always pair color with the faction's name or icon.
- Site is public; only organizers sign in.
- Undecided facts (do not invent): the real start date of Season 1 (currently assumed Sep 2026), the venue for game nights (currently "Location TBA"), the prize pool amount and how it is funded, and whether newcomers need to sign up in advance.

## Brand Commitments
- Name: **Root League Orlando**.
- Tone: cute and woodland-themed, matching the board game. This is a stated commitment from the league owner; specific visual choices are not yet binding.
- The league owner has permission to use Root's official iconography. Footer credits Leder Games, used with permission.

## Evidence on Hand
- No real league data yet: all players, games and sessions in the repo are made-up sample data (players such as Bramble and Thistle).
- Official Root icons are not yet in the repository. Faction badges currently use emoji on colored circles; `public/factions/` and each faction's `icon` field in `src/lib/league.ts` are the intended slot for the real assets.
- Do not fabricate testimonials, real player names, attendance figures, venue names or prize amounts.

## Product Principles
- Every player gets an identity: profiles, best faction and history are first-class, not a by-product of the leaderboard.
- Welcome newcomers first: someone who has never played Root or visited a game night should understand what the league is within one screen.
- The numbers are the league's trust: LP, ranks and tie-breaks must always be explainable on the page and recomputable from raw placements.
- Phone first, glanceable at the table: standings and stats must read quickly on a small screen.
- Organizers are few and busy: entering a game must be fast and hard to get wrong.

## Accessibility & Inclusion
- Faction identity is conveyed by name or icon in addition to color.
- Mobile-first layouts; text and controls must stay legible and tappable at phone width.
