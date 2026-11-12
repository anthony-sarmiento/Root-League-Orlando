# Security notes

How Root League Orlando protects people's information, what is enforced where, and the few things only the site owner can switch on in Supabase and Vercel.

## Emails

An email address lives in one place: the login system (Supabase Auth). Everywhere else is built so it doesn't need to be copied.

- **Not in public data.** Player names, profiles, games and RSVPs never include an email. The public database tables have no email column.
- **No copies.** Name claims used to store the claimant's email; migration `0010_privacy.sql` removes that column. When an account is deleted, the address goes with it.
- **Masked for organizers.** The organizer page only receives masked addresses (`a••••@g••••.com`). An organizer clicks **Show** to see one address at a time; the full address is fetched for that one account by a server action that checks the caller is an organizer, and each look is written to the server log (who looked at which account, never the address itself).
- **Never in the page chrome.** The header and public pages don't carry anyone's email, not even for an initial letter.
- **Can't be looked up from the sign-up form.** Signing up with an address that already exists gives the same message as any other failure, so the form can't be used to find out who has an account. Sign-in errors are generic too.
- **People can delete themselves.** *My account → Delete my account* removes the login and email for good (migration `0010`). Their games stay under their player name as part of the league's record; their bio is removed, and a profile with no games is removed entirely.
- **Private pages stay private.** `/admin`, `/account`, `/report`, `/login` and `/signup` are marked `noindex` and `no-store`, and are blocked in `robots.txt`.

## What the site enforces

**In the database (the real gatekeeper).** Row-level security is on for every table. The public can read league data; players can only edit their own profile and RSVP as themselves; only organizers can write anything else. Reports, claims and account links are private to their owner and organizers. Sensitive operations (merging players, connecting accounts, approving reports, deleting an account) are database functions that check who is calling. Names, bios, avatar settings, rounds and table sizes have database `CHECK` rules, so bad data is refused even if the site had a bug. The test suite (`npm run test:db`) runs every rule against a real Postgres.

**In the app.**

- **Content-Security-Policy with a nonce** (`src/proxy.ts`, `src/lib/csp.ts`). Scripts only run if they carry a random, per-request nonce, so an attacker who injected markup still couldn't run code. Nothing can frame the site, no plugins, and forms only post back to the site.
- **Other headers**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, location and more are off), `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`. The framework header is removed.
- **Session cookies** are `HttpOnly`, `SameSite=Lax` and `Secure`; there is no Supabase client in the browser at all, so page scripts can't read a login.
- **Passwords**: at least 10 characters, refuse the most common passwords, repeats, key runs and anything containing the email name. A hidden honeypot field stops simple sign-up bots.
- **Input**: one validator for player names (letters, numbers, spaces and `. ' _ -`), cleaned bios, ids from forms must be real UUIDs, and the database is only ever queried with bound parameters (no SQL is built from text).
- **Server actions** re-check who is asking every time; the redirects in the proxy are only a convenience.
- **Limits**: at most 5 game reports waiting per player, one claim per account, a report can only name a table the reporter played at.
- **Dependencies**: `npm audit --omit=dev` reports 0 vulnerabilities in what ships to the site. The moderate findings `npm audit` lists are in the ESLint toolchain (development only) and are not part of the deployed site.

## Things only the owner can switch on

These are dashboard settings, not code:

1. **Supabase → Authentication → Providers → Email → Confirm email.** It is currently off, which means nobody checks that an email belongs to the person typing it, so someone could register with another person's address (and organizers shouldn't treat an unconfirmed address as proof of identity when approving a name claim). Turning it on fixes that, but you also need to set up a custom SMTP sender (Authentication → SMTP) because Supabase's built-in sender is heavily rate limited.
2. **Supabase → Authentication → Attack protection.** Turn on CAPTCHA (Cloudflare Turnstile or hCaptcha) and review the sign-up and sign-in **rate limits**. The site relies on these for brute-force protection; the CAPTCHA also needs a small widget added to the sign-up form (ask and I'll add it).
3. **Supabase → Authentication → Policies / Password.** Match the minimum length of 10 and, on a paid plan, turn on **leaked password protection**.
4. **Organizer accounts.** Organizers can see and change everything, so give them strong, unique passwords. Supabase supports TOTP two-factor authentication for accounts; ask for it to be required for organizers and I'll add it to the sign-in flow.
5. **Supabase → Authentication → URL Configuration.** Set the **Site URL** to the real domain and list only that domain under redirect URLs.
6. **Keys.** The site only uses the publishable key. Never put the `service_role` key in the project or in a `NEXT_PUBLIC_` variable; if one is ever exposed, rotate it in Supabase.
7. **Vercel → Deployment Protection** for preview deployments, and the **Firewall / Attack Challenge Mode** if the site is ever hit by bots.
8. **Backups.** Enable daily backups (or point-in-time recovery) in Supabase.

## Known limits

- The site has no password-reset flow yet (people who forget a password need an organizer or a new account). Adding one needs email sending, so it should come together with step 1 above.
- A page that doesn't exist (a 404) is served without the script nonce, so it loads as plain HTML with no scripts. It still shows and its links work.
- There's no per-request rate limiting inside the site itself; that is Supabase's and Vercel's job (steps 2 and 7).

## Reporting a problem

If you find a security problem, tell an organizer privately rather than posting it publicly.
