# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Next.js (App Router, TypeScript, Tailwind) with Supabase (Postgres and Auth), hosted on Vercel. Data is read through `getLeagueData()` in `src/lib/data.ts`; without Supabase credentials the site shows built-in sample data.

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
- Seasons are explicit date ranges kept in the database `seasons` table and managed by organizers: Season 1 ran Jun 7 – Sep 7, 2026; Season 2 runs Nov 1 – Dec 20, 2026, with game nights every other week. At season end the player with the most LP wins the prize pool. LP is computed from placements, never stored, so rule changes apply retroactively. LP rules live in `src/lib/league.ts`.
- Season ties: most wins, then best average placement (a choice made by the builder, not yet confirmed by the league).
- Only players with at least one game in a season appear on that season's leaderboard; there is no minimum-games requirement.
- Games are played live at game nights ("sessions") in Orlando. Results are entered by organizers (admins). Season 1 results are being entered by hand.
- Public read. Organizers (listed in an `admins` table) write everything; signed-in players can only edit their own profile and RSVP themselves to upcoming nights (Supabase row-level security).
- Anyone can create an account (open sign-up, email confirmation off). Players create a profile or claim an existing name, which an organizer approves.

## Capabilities and Constraints
- Pages: Home, Leaderboard (per season), Players and player profiles, Factions (per season or all time), Game nights with RSVPs, Sign in / Sign up, Account (profile, claim a name), Organizer tools (log games, players, game nights, seasons, approve name claims).
- Must be usable first on phones.
- Faction identity is never color alone: always pair color with the faction's name or icon.
- Site is public to read; accounts are optional and only needed to RSVP and have a profile.
- Undecided facts (do not invent): the game night venue beyond what organizers enter, the prize pool amount and how it is funded.

## Brand Commitments
- Name: **Root League Orlando**.
- Tone: cute and woodland-themed, matching the board game. This is a stated commitment from the league owner; specific visual choices are not yet binding.
- The league owner has permission to use Root's official iconography. Footer credits Leder Games, used with permission.

## Evidence on Hand
- Official Root artwork (used with permission) is in `/assets` (not committed) and processed into `public/` by `scripts/build-assets.mjs`: faction head icons and patterned backgrounds, a hero illustration of the Woodland Alliance, and 70+ character portraits used as player avatars.
- Real league data lives in Supabase and is entered by organizers. The built-in sample players (Bramble, Thistle, ...) exist only for demos.
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
