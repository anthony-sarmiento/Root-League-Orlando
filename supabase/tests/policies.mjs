import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Applies the migrations to an in-memory Postgres (PGlite) with a stand-in for Supabase's auth
 * schema, then checks the row-level security rules. Run: npm run test:db
 */
const MIG = fileURLToPath(new URL("../migrations/", import.meta.url));
const db = new PGlite();

// --- Minimal stand-in for Supabase's auth schema and roles -------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);

for (const f of ["0001_initial.sql", "0002_accounts_rsvps_seasons.sql", "0003_homeland_factions.sql"]) {
  await db.exec(fs.readFileSync(MIG + f, "utf8"));
  console.log("applied", f);
}

// --- Users: an organizer, and three regular accounts ------------------------
const ids = {};
for (const [k, email] of Object.entries({ admin: "admin@x.test", b: "b@x.test", c: "c@x.test", d: "d@x.test" })) {
  const r = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  ids[k] = r.rows[0].id;
}
await db.query("insert into admins (user_id) values ($1)", [ids.admin]);
const who = (k) => ({ sub: ids[k], email: `${k}@x.test`, role: "authenticated" });

async function as(role, user, fn) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(user ?? {})]);
  await db.exec(`set role ${role}`);
  try { return await fn(); } finally { await db.exec("reset role"); }
}

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}`); };
async function mustWork(label, fn) { try { const r = await fn(); ok(true, label); return r; } catch (e) { ok(false, `${label}  -> ${e.message}`); } }
async function mustFail(label, fn) { try { await fn(); ok(false, `${label}  (should have failed)`); } catch (e) { ok(true, `${label}  [${e.message.slice(0, 70)}]`); } }

// --- Seasons ---------------------------------------------------------------
const seasons = await as("anon", null, () => db.query("select number, starts_on::text, ends_on::text from seasons order by number"));
ok(seasons.rows.length === 2 && seasons.rows[0].starts_on === "2026-06-07" && seasons.rows[1].ends_on === "2026-12-20", "anon reads seeded seasons (S1 Jun 7-Sep 7, S2 Nov 1-Dec 20)");
await mustFail("regular user cannot add a season", () => as("authenticated", who("b"), () => db.query("insert into seasons values (3,'2027-01-01','2027-02-01')")));
await mustWork("organizer can add a season", () => as("authenticated", who("admin"), () => db.query("insert into seasons values (3,'2027-01-01','2027-02-01')")));

// --- Profiles --------------------------------------------------------------
const bPlayer = (await mustWork("B creates own profile", () => as("authenticated", who("b"),
  () => db.query("select create_my_profile('Birch','Loves cats','eyrie','camdyn') as id")))).rows[0].id;
await mustFail("B cannot create a second profile", () => as("authenticated", who("b"), () => db.query("select create_my_profile('Birch2',null,null,null)")));
await mustFail("name too long is rejected", () => as("authenticated", who("c"), () => db.query("select create_my_profile($1,null,null,null)", ["x".repeat(41)])));
await mustFail("bad faction is rejected", () => as("authenticated", who("c"), () => db.query("select create_my_profile('Cee',null,'dragons',null)")));
await mustFail("anonymous visitor cannot create a profile", () => as("anon", null, () => db.query("select create_my_profile('Anon',null,null,null)")));
await mustFail("B cannot insert a player directly", () => as("authenticated", who("b"), () => db.query("insert into players (name) values ('Sneaky')")));
await mustFail("B cannot link themselves to a player directly", () => as("authenticated", who("b"), () => db.query("insert into player_accounts (user_id, player_id) values ($1, $2)", [ids.b, bPlayer])));

const orphan = (await as("authenticated", who("admin"), () => db.query("insert into players (name) values ('Orphan') returning id"))).rows[0].id;
const upd = await as("authenticated", who("b"), () => db.query("update players set bio='hacked' where id = $1", [orphan]));
ok(upd.affectedRows === 0, "B cannot edit someone else's profile (0 rows updated)");
const own = await as("authenticated", who("b"), () => db.query("update players set bio='Updated' where id = $1", [bPlayer]));
ok(own.affectedRows === 1, "B can edit own profile");
const hand = await as("authenticated", who("b"), () => db.query("update player_accounts set user_id = $1 where user_id = $2", [ids.c, ids.b]));
const stillB = await db.query("select count(*)::int n from player_accounts where user_id = $1", [ids.b]);
ok(hand.affectedRows === 0 && stillB.rows[0].n === 1, "B cannot hand their profile to another account (0 rows, link unchanged)");
const seeLinks = await as("authenticated", who("c"), () => db.query("select count(*)::int n from player_accounts"));
ok(seeLinks.rows[0].n === 0, "C cannot see B's account link");
const anonPlayers = await as("anon", null, () => db.query("select name, bio, favorite_faction, avatar from players where id=$1", [bPlayer]));
ok(anonPlayers.rows[0]?.name === "Birch" && anonPlayers.rows[0].favorite_faction === "eyrie", "anyone can read a public profile");

// --- Claims ----------------------------------------------------------------
await mustWork("C files a claim on 'Orphan'", () => as("authenticated", who("c"), () => db.query("insert into player_claims (user_id, player_id, note) values ($1,$2,'Hi, I am Orphan')", [ids.c, orphan])));
await mustFail("claim with someone else's email is rejected", () => as("authenticated", who("d"), () => db.query("insert into player_claims (user_id, player_id, claimant_email) values ($1,$2,'spoof@x.test')", [ids.d, orphan])));
await mustFail("claim for another user id is rejected", () => as("authenticated", who("d"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.c, orphan])));
await mustFail("user with a profile cannot also claim", () => as("authenticated", who("b"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.b, orphan])));
const claimEmail = await as("authenticated", who("admin"), () => db.query("select claimant_email from player_claims"));
ok(claimEmail.rows[0]?.claimant_email === "c@x.test", "claimant email recorded from the account, visible to organizer");
const dSees = await as("authenticated", who("d"), () => db.query("select count(*)::int n from player_claims"));
ok(dSees.rows[0].n === 0, "other users cannot see claims");
await mustFail("regular user cannot approve a claim", () => as("authenticated", who("c"), () => db.query("select approve_claim($1)", [ids.c])));
await mustWork("organizer approves the claim", () => as("authenticated", who("admin"), () => db.query("select approve_claim($1)", [ids.c])));
const cLink = await as("authenticated", who("c"), () => db.query("select player_id from player_accounts"));
ok(cLink.rows[0]?.player_id === orphan, "C is now linked to 'Orphan'");
const leftover = await as("authenticated", who("admin"), () => db.query("select count(*)::int n from player_claims"));
ok(leftover.rows[0].n === 0, "claim is removed after approval");
const claimed = await as("anon", null, () => db.query("select * from claimed_player_ids()"));
ok(claimed.rows.length === 2, "claimed_player_ids lists linked players (ids only)");

// Claim then create a fresh profile: the pending claim is dropped.
await as("authenticated", who("admin"), () => db.query("insert into players (name) values ('Wanderer')"));
const wanderer = (await db.query("select id from players where name='Wanderer'")).rows[0].id;
await as("authenticated", who("d"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.d, wanderer]));
await as("authenticated", who("d"), () => db.query("select create_my_profile('Dee',null,null,null)"));
const dClaims = await db.query("select count(*)::int n from player_claims where user_id=$1", [ids.d]);
ok(dClaims.rows[0].n === 0, "creating a fresh profile clears a pending claim");

// --- RSVPs -----------------------------------------------------------------
const future = (await db.query("select ((now() at time zone 'America/New_York')::date + 7)::text d")).rows[0].d;
const past = (await db.query("select ((now() at time zone 'America/New_York')::date - 7)::text d")).rows[0].d;
const sFuture = (await as("authenticated", who("admin"), () => db.query("insert into sessions (date) values ($1) returning id", [future]))).rows[0].id;
const sPast = (await as("authenticated", who("admin"), () => db.query("insert into sessions (date) values ($1) returning id", [past]))).rows[0].id;
await mustWork("B joins an upcoming night", () => as("authenticated", who("b"), () => db.query("insert into session_signups (session_id, player_id) values ($1,$2)", [sFuture, bPlayer])));
await mustFail("B cannot join twice", () => as("authenticated", who("b"), () => db.query("insert into session_signups (session_id, player_id) values ($1,$2)", [sFuture, bPlayer])));
await mustFail("B cannot join a past night", () => as("authenticated", who("b"), () => db.query("insert into session_signups (session_id, player_id) values ($1,$2)", [sPast, bPlayer])));
await mustFail("C cannot RSVP on B's behalf", () => as("authenticated", who("c"), () => db.query("insert into session_signups (session_id, player_id) values ($1,$2)", [sFuture, bPlayer])));
await mustFail("anon cannot RSVP", () => as("anon", null, () => db.query("insert into session_signups (session_id, player_id) values ($1,$2)", [sFuture, bPlayer])));
const publicRsvps = await as("anon", null, () => db.query("select count(*)::int n from session_signups"));
ok(publicRsvps.rows[0].n === 1, "RSVPs are publicly readable");
const cLeave = await as("authenticated", who("c"), () => db.query("delete from session_signups where player_id=$1", [bPlayer]));
ok(cLeave.affectedRows === 0, "C cannot remove B's RSVP");
const bLeave = await as("authenticated", who("b"), () => db.query("delete from session_signups where player_id=$1", [bPlayer]));
ok(bLeave.affectedRows === 1, "B can withdraw their RSVP");

// --- Regression: original organizer-only behaviour still holds -------------------------
await mustFail("regular user cannot delete a game or log one", () => as("authenticated", who("b"), () => db.query("select log_game(current_date, null, '[]'::jsonb)")));
const mk = async (n) => (await as("authenticated", who("admin"), () => db.query("insert into players (name) values ($1) returning id", [n]))).rows[0].id;
const [p1, p2, p3, p4] = [await mk("P1"), await mk("P2"), await mk("P3"), await mk("P4")];
const results = [[p1, "marquise", 1], [p2, "eyrie", 2], [p3, "alliance", 3], [p4, "vagabond", 4]].map(([player_id, faction, placement]) => ({ player_id, faction, placement }));
await mustWork("organizer can log a game", () => as("authenticated", who("admin"), () => db.query("select log_game('2026-11-05', null, $1::jsonb)", [JSON.stringify(results)])));
await mustFail("game with a repeated faction is rejected atomically", () => as("authenticated", who("admin"),
  () => db.query("select log_game('2026-11-06', null, $1::jsonb)", [JSON.stringify(results.map((r, i) => ({ ...r, faction: i < 2 ? "eyrie" : r.faction })))])));
const gcount = await db.query("select count(*)::int n from games");
ok(gcount.rows[0].n === 1, "failed game left nothing behind");

// --- Homeland Expansion factions ---------------------------------------------------------
const homeland = [[p1, "frogs", 1], [p2, "bats", 2], [p3, "knaves", 3], [p4, "marquise", 4]].map(([player_id, faction, placement]) => ({ player_id, faction, placement }));
await mustWork("a game can use the Homeland factions", () => as("authenticated", who("admin"), () => db.query("select log_game('2026-11-07', null, $1::jsonb)", [JSON.stringify(homeland)])));
await mustWork("a Homeland faction can be a favorite", () => as("authenticated", who("admin"), () => db.query("update players set favorite_faction='bats' where id=$1", [p1])));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
