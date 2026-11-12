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
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz not null default now());
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);

for (const f of ["0001_initial.sql", "0002_accounts_rsvps_seasons.sql", "0003_homeland_factions.sql", "0004_avatar_background.sql", "0005_avatar_position.sql", "0006_name_safety.sql", "0007_rounds_and_tables.sql", "0008_game_reports.sql", "0009_connect_accounts.sql", "0010_privacy.sql"]) {
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
await mustFail("a claim can no longer carry an email copy", () => as("authenticated", who("d"), () => db.query("insert into player_claims (user_id, player_id, claimant_email) values ($1,$2,'spoof@x.test')", [ids.d, orphan])));
await mustFail("claim for another user id is rejected", () => as("authenticated", who("d"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.c, orphan])));
await mustWork("a user who already has a profile can also claim a name", () => as("authenticated", who("b"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.b, orphan])));
await as("authenticated", who("b"), () => db.query("delete from player_claims where user_id = $1", [ids.b]));
const claimColumns = await db.query("select column_name from information_schema.columns where table_name = 'player_claims'");
ok(!claimColumns.rows.some((r) => r.column_name === "claimant_email"), "claims store no copy of anyone's email");
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

// --- Avatar backgrounds -----------------------------------------------------------------
const bgSet = await as("authenticated", who("b"), () => db.query("update players set avatar_bg='frogs' where id=$1", [bPlayer]));
ok(bgSet.affectedRows === 1, "a player can set their own avatar background");
await mustFail("an unknown avatar background is rejected", () => as("authenticated", who("b"), () => db.query("update players set avatar_bg='dragons' where id=$1", [bPlayer])));
const bgOther = await as("authenticated", who("c"), () => db.query("update players set avatar_bg='bats' where id=$1", [bPlayer]));
ok(bgOther.affectedRows === 0, "nobody else can change it");

// --- Avatar position --------------------------------------------------------------------
const posSet = await as("authenticated", who("b"), () => db.query("update players set avatar_x=40, avatar_y=25, avatar_zoom=220 where id=$1", [bPlayer]));
ok(posSet.affectedRows === 1, "a player can position their own portrait");
await mustFail("zoom below 100 is rejected", () => as("authenticated", who("b"), () => db.query("update players set avatar_zoom=50 where id=$1", [bPlayer])));
await mustFail("position past 100 is rejected", () => as("authenticated", who("b"), () => db.query("update players set avatar_x=140 where id=$1", [bPlayer])));
const posOther = await as("authenticated", who("c"), () => db.query("update players set avatar_x=10 where id=$1", [bPlayer]));
ok(posOther.affectedRows === 0, "nobody else can move it");

// --- Name safety ------------------------------------------------------------------------
const adminName = (n) => as("authenticated", who("admin"), () => db.query("insert into players (name) values ($1)", [n]));
await mustWork("an ordinary name is accepted", () => adminName("Mallory O'Brien"));
await mustWork("an accented name is accepted", () => adminName("Zoë Ana-María"));
await mustFail("markup in a name is rejected", () => adminName("<script>alert(1)</script>"));
await mustFail("quotes and semicolons in a name are rejected", () => adminName("Bob\"; drop table players;--"));
await mustFail("a zero-width character in a name is rejected", () => adminName("Sneaky" + String.fromCodePoint(0x200b) + "Name"));
await mustFail("a control character in a name is rejected", () => adminName("Bell" + String.fromCodePoint(7)));
await mustFail("a name with leading or trailing spaces is rejected", () => adminName(" Padded "));
await mustFail("a name over 40 characters is rejected", () => adminName("x".repeat(41)));
await mustFail("the same name in different capitals is rejected", () => adminName("mallory o'brien"));
await mustFail("an invisible-control bio is rejected", () => as("authenticated", who("admin"), () => db.query("update players set bio=$1 where id=$2", ["bad" + String.fromCodePoint(1), p1])));
await mustWork("a bio with line breaks is fine", () => as("authenticated", who("admin"), () => db.query("update players set bio=$1 where id=$2", ["line one" + String.fromCodePoint(10) + "line two", p1])));
const delByUser = await as("authenticated", who("c"), () => db.query("delete from players where id=$1", [p2]));
ok(delByUser.affectedRows === 0, "a regular player cannot remove another player");
const renByUser = await as("authenticated", who("c"), () => db.query("update players set name='Hijacked' where id=$1", [p2]));
ok(renByUser.affectedRows === 0, "a regular player cannot rename another player");
await mustWork("an organizer can rename a player", () => as("authenticated", who("admin"), () => db.query("update players set name='Renamed Rowan' where id=$1", [p3])));
const lonely = (await as("authenticated", who("admin"), () => db.query("insert into players (name) values ('Lonely Hare') returning id"))).rows[0].id;
const delByAdmin = await as("authenticated", who("admin"), () => db.query("delete from players where id=$1", [lonely]));
ok(delByAdmin.affectedRows === 1, "an organizer can remove a player with no games");
await mustFail("a player with games cannot be removed", () => as("authenticated", who("admin"), () => db.query("delete from players where id=$1", [p1])));

// --- Rounds and tables of three -----------------------------------------------------------
const seat = (player_id, faction, placement) => ({ player_id, faction, placement });
const logAs = (who_, args) => as("authenticated", who(who_), () => db.query("select log_game($1, $2, $3::jsonb, $4::smallint) as id", args));
const night = (await as("authenticated", who("admin"), () => db.query("insert into sessions (date) values ('2026-11-08') returning id"))).rows[0].id;
const trio = [seat(p1, "marquise", 1), seat(p2, "eyrie", 2), seat(p3, "alliance", 3)];
const trioGame = await logAs("admin", ["2026-11-08", night, JSON.stringify(trio), 2]);
ok(Boolean(trioGame.rows[0].id), "an organizer can log a table of three in round 2");
const roundCheck = await db.query("select round from games where id=$1", [trioGame.rows[0].id]);
ok(roundCheck.rows[0].round === 2, "the round is saved");
await mustFail("a table of two is rejected", () => logAs("admin", ["2026-11-08", night, JSON.stringify(trio.slice(0, 2)), 1]));
await mustFail("a table of three needs places 1 to 3", () => logAs("admin", ["2026-11-08", night, JSON.stringify([seat(p1, "marquise", 1), seat(p2, "eyrie", 2), seat(p3, "alliance", 4)]), 1]));
await mustFail("round 5 is rejected", () => logAs("admin", ["2026-11-08", night, JSON.stringify(trio), 5]));
await mustFail("a regular player cannot log a table", () => logAs("c", ["2026-11-08", night, JSON.stringify(trio), 1]));
const fixed = [seat(p3, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3), seat(p4, "vagabond", 4)];
await mustWork("an organizer can edit a game into a table of four", () => as("authenticated", who("admin"), () => db.query("select update_game($1, '2026-11-08', $2, $3::jsonb, 1::smallint)", [trioGame.rows[0].id, night, JSON.stringify(fixed)])));
const afterEdit = await db.query("select count(*)::int n from game_results where game_id=$1", [trioGame.rows[0].id]);
ok(afterEdit.rows[0].n === 4, "the edit replaced the results");
await mustFail("a regular player cannot edit a game", () => as("authenticated", who("c"), () => db.query("select update_game($1, '2026-11-08', $2, $3::jsonb, 1::smallint)", [trioGame.rows[0].id, night, JSON.stringify(fixed)])));
const nightEdit = await as("authenticated", who("admin"), () => db.query("update sessions set title='Renamed night', location='Elsewhere' where id=$1", [night]));
ok(nightEdit.affectedRows === 1, "an organizer can edit a game night");
await mustWork("an organizer can delete a game night", () => as("authenticated", who("admin"), () => db.query("delete from sessions where id=$1", [night])));
const afterNightDelete = await db.query("select session_id from games where id=$1", [trioGame.rows[0].id]);
ok(afterNightDelete.rows[0].session_id === null, "its games stay on the books");

// --- Player-reported games ------------------------------------------------------------------
const dPlayer = (await db.query("select player_id from player_accounts where user_id=$1", [ids.d])).rows[0].player_id;
const reportTable = (extra = {}) => [seat(bPlayer, "marquise", 1), seat(dPlayer, "eyrie", 2), seat(p1, "alliance", 3), seat(p2, "vagabond", 4)].map((s) => ({ ...s, ...extra }));
const submit = (user, args) => as("authenticated", who(user), () => db.query("select submit_game_report($1, null, $2::smallint, $3::jsonb, $4) as id", args));
const gamesBefore = (await db.query("select count(*)::int n from games")).rows[0].n;

const report1 = (await mustWork("a player can report a table they played in", () => submit("b", ["2026-11-01", 1, JSON.stringify(reportTable()), "We played at the back"]))).rows[0].id;
const stillSame = (await db.query("select count(*)::int n from games")).rows[0].n;
ok(stillSame === gamesBefore, "a report does not change the standings");
await mustFail("a player cannot report a table they were not at", () => submit("b", ["2026-11-01", 1, JSON.stringify([seat(dPlayer, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3)]), null]));
await mustFail("a report dated in the future is rejected", () => submit("b", ["2099-01-01", 1, JSON.stringify(reportTable()), null]));
await mustFail("a report with a repeated faction is rejected", () => submit("b", ["2026-11-01", 1, JSON.stringify([seat(bPlayer, "marquise", 1), seat(dPlayer, "marquise", 2), seat(p1, "alliance", 3)]), null]));
await mustFail("a report with an unknown faction is rejected", () => submit("b", ["2026-11-01", 1, JSON.stringify([seat(bPlayer, "dragons", 1), seat(dPlayer, "eyrie", 2), seat(p1, "alliance", 3)]), null]));
await mustFail("a report with skipped places is rejected", () => submit("b", ["2026-11-01", 1, JSON.stringify([seat(bPlayer, "marquise", 1), seat(dPlayer, "eyrie", 2), seat(p1, "alliance", 4)]), null]));
await mustFail("a report with an unknown player is rejected", () => submit("b", ["2026-11-01", 1, JSON.stringify([seat(bPlayer, "marquise", 1), seat(dPlayer, "eyrie", 2), seat("00000000-0000-0000-0000-000000000000", "alliance", 3)]), null]));
await mustFail("a signed-out visitor cannot report", () => as("anon", null, () => db.query("select submit_game_report('2026-11-01', null, 1::smallint, $1::jsonb, null)", [JSON.stringify(reportTable())])));
await mustFail("a user with no profile cannot report", () => as("authenticated", who("c"), () => db.query("select submit_game_report('2026-11-01', null, 1::smallint, $1::jsonb, null)", [JSON.stringify(reportTable())])));
await mustFail("a player cannot insert a report directly", () => as("authenticated", who("b"), () => db.query("insert into game_reports (reporter_player_id, played_on, results) values ($1, '2026-11-01', $2::jsonb)", [bPlayer, JSON.stringify(reportTable())])));

const mine = await as("authenticated", who("b"), () => db.query("select count(*)::int n from game_reports"));
ok(mine.rows[0].n === 1, "a player sees their own report");
const theirs = await as("authenticated", who("d"), () => db.query("select count(*)::int n from game_reports"));
ok(theirs.rows[0].n === 0, "another player does not see it");
const everyone = await as("authenticated", who("admin"), () => db.query("select count(*)::int n from game_reports"));
ok(everyone.rows[0].n === 1, "an organizer sees every report");
const anonSees = await as("anon", null, () => db.query("select count(*)::int n from game_reports"));
ok(anonSees.rows[0].n === 0, "the public sees no reports");

await mustFail("a player cannot approve their own report", () => as("authenticated", who("b"), () => db.query("select approve_game_report($1, '2026-11-01', null, $2::jsonb, 1::smallint)", [report1, JSON.stringify(reportTable())])));
const selfEdit = await as("authenticated", who("b"), () => db.query("update game_reports set status='approved' where id=$1", [report1]));
ok(selfEdit.affectedRows === 0, "a player cannot mark their own report approved");

const gameId = (await mustWork("an organizer can approve a report (with their own corrections)", () => as("authenticated", who("admin"),
  () => db.query("select approve_game_report($1, '2026-11-02', null, $2::jsonb, 2::smallint) as id", [report1, JSON.stringify([seat(dPlayer, "marquise", 1), seat(bPlayer, "eyrie", 2), seat(p1, "alliance", 3), seat(p2, "vagabond", 4)])])))).rows[0].id;
const approved = await db.query("select status, game_id, reviewed_at is not null as reviewed from game_reports where id=$1", [report1]);
ok(approved.rows[0].status === "approved" && approved.rows[0].game_id === gameId && approved.rows[0].reviewed, "the report is marked approved and linked to its game");
const madeGame = await db.query("select round, played_on::text d from games where id=$1", [gameId]);
ok(madeGame.rows[0].round === 2 && madeGame.rows[0].d === "2026-11-02", "the game uses the organizer's corrected version");
await mustFail("an approved report cannot be approved twice", () => as("authenticated", who("admin"), () => db.query("select approve_game_report($1, '2026-11-02', null, $2::jsonb, 1::smallint)", [report1, JSON.stringify(reportTable())])));
const withdrawApproved = await as("authenticated", who("b"), () => db.query("delete from game_reports where id=$1", [report1]));
ok(withdrawApproved.affectedRows === 0, "an approved report cannot be withdrawn");

const report2 = (await submit("b", ["2026-11-03", 1, JSON.stringify(reportTable()), null])).rows[0].id;
const withdraw = await as("authenticated", who("b"), () => db.query("delete from game_reports where id=$1", [report2]));
ok(withdraw.affectedRows === 1, "a player can withdraw a pending report");
const reject = await as("authenticated", who("admin"), () => db.query("insert into game_reports (submitted_by, reporter_player_id, played_on, results, status, reject_reason) values ($1,$2,'2026-11-03',$3::jsonb,'rejected','Wrong night')", [ids.b, bPlayer, JSON.stringify(reportTable())]));
ok(reject.affectedRows === 1, "an organizer can record a rejection");

for (let i = 0; i < 5; i++) await submit("d", ["2026-11-0" + (i + 1), 1, JSON.stringify([seat(dPlayer, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3)]), null]);
await mustFail("a sixth waiting report is refused", () => submit("d", ["2026-11-06", 1, JSON.stringify([seat(dPlayer, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3)]), null]));

// --- Connecting accounts to names ------------------------------------------------------------
// The scenario: organizers logged games under "Alpha Old"; Alpha then signed up and made a fresh profile.
const admin_ = (fn) => as("authenticated", who("admin"), fn);
const newUser = async (email) => (await db.query("insert into auth.users (email) values ($1) returning id", [email])).rows[0].id;
ids.e = await newUser("e@x.test");
ids.f = await newUser("f@x.test");
ids.g = await newUser("g@x.test");

const alphaOld = (await admin_(() => db.query("insert into players (name) values ('Alpha Old') returning id"))).rows[0].id;
const gameWithAlpha = [seat(alphaOld, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3), seat(p3, "vagabond", 4)];
const alphaGame = (await admin_(() => db.query("select log_game('2026-11-09', null, $1::jsonb, 1::smallint) as id", [JSON.stringify(gameWithAlpha)]))).rows[0].id;
await admin_(() => db.query("insert into sessions (date) values ('2026-11-22')"));
const upcomingNight = (await db.query("select id from sessions where date = '2026-11-22'")).rows[0].id;

const alphaNew = (await as("authenticated", who("e"), () => db.query("select create_my_profile('Alpha New','Hello woodland','riverfolk','camdyn') as id"))).rows[0].id;
await mustWork("the new profile can claim the old name", () => as("authenticated", who("e"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.e, alphaOld])));
await mustFail("a claim on a name that already has an account is refused", () => as("authenticated", who("g"), () => db.query("insert into player_claims (user_id, player_id) values ($1,$2)", [ids.g, bPlayer])));

await mustFail("a regular player cannot list accounts", () => as("authenticated", who("e"), () => db.query("select * from list_accounts()")));
const accountList = await admin_(() => db.query("select email, player_name from list_accounts()"));
ok(accountList.rows.some((r) => r.email === "e@x.test" && r.player_name === "Alpha New"), "an organizer can list accounts with their names");
ok(accountList.rows.some((r) => r.email === "g@x.test" && r.player_name === null), "accounts without a profile are listed too");

// The new profile RSVPs for a coming night, then the claim is approved.
await as("authenticated", who("e"), () => db.query("insert into session_signups (session_id, player_id) values ($1,$2)", [upcomingNight, alphaNew]));
await mustWork("approving merges the new profile into the old name", () => admin_(() => db.query("select approve_claim($1)", [ids.e])));
const eLink = await as("authenticated", who("e"), () => db.query("select player_id from player_accounts"));
ok(eLink.rows[0]?.player_id === alphaOld, "the account now owns the old name");
const gone = await db.query("select count(*)::int n from players where id = $1", [alphaNew]);
ok(gone.rows[0].n === 0, "the duplicate profile is gone");
const kept = await db.query("select name, bio, favorite_faction, avatar from players where id = $1", [alphaOld]);
ok(kept.rows[0].name === "Alpha Old" && kept.rows[0].bio === "Hello woodland" && kept.rows[0].avatar === "camdyn", "the old name keeps its name and takes the new profile's details");
const stillPlayed = await db.query("select count(*)::int n from game_results where game_id = $1 and player_id = $2", [alphaGame, alphaOld]);
ok(stillPlayed.rows[0].n === 1, "the old name's game history is untouched");
const rsvp = await db.query("select count(*)::int n from session_signups where session_id = $1 and player_id = $2", [upcomingNight, alphaOld]);
ok(rsvp.rows[0].n === 1, "the RSVP moved to the old name");

// An organizer connects a second login to a name that already has an account (a person with two accounts).
await mustWork("an organizer can add a second account to a name", () => admin_(() => db.query("select link_account_to_player($1,$2)", [ids.g, alphaOld])));
const bothLinked = await db.query("select count(*)::int n from player_accounts where player_id = $1", [alphaOld]);
ok(bothLinked.rows[0].n === 2, "both logins now belong to the one player");
const gEdit = await as("authenticated", who("g"), () => db.query("update players set bio='From my other login' where id = $1", [alphaOld]));
ok(gEdit.affectedRows === 1, "the second login can edit that profile");
await mustFail("a regular player cannot connect accounts", () => as("authenticated", who("f"), () => db.query("select link_account_to_player($1,$2)", [ids.f, alphaOld])));

// Merging two organizer-made duplicates, each with games, plus an RSVP both made.
const dupA = (await admin_(() => db.query("insert into players (name) values ('Dup Left') returning id"))).rows[0].id;
const dupB = (await admin_(() => db.query("insert into players (name, bio) values ('Dup Right','Real bio') returning id"))).rows[0].id;
await admin_(() => db.query("select log_game('2026-11-10', null, $1::jsonb, 1::smallint)", [JSON.stringify([seat(dupA, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3)])]));
await admin_(() => db.query("select log_game('2026-11-11', null, $1::jsonb, 1::smallint)", [JSON.stringify([seat(dupB, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3)])]));
await admin_(() => db.query("insert into session_signups (session_id, player_id) values ($1,$2),($1,$3)", [upcomingNight, dupA, dupB]));
await as("authenticated", who("e"), () => db.query("select submit_game_report('2026-11-10', null, 1::smallint, $1::jsonb, null)", [JSON.stringify([seat(alphaOld, "marquise", 1), seat(dupA, "eyrie", 2), seat(p1, "alliance", 3)])]));
await mustFail("a regular player cannot merge players", () => as("authenticated", who("d"), () => db.query("select merge_players($1,$2)", [dupA, dupB])));
await mustFail("merging a player into themselves is refused", () => admin_(() => db.query("select merge_players($1,$1)", [dupA])));
const merged = await mustWork("an organizer can merge two duplicates", () => admin_(() => db.query("select merge_players($1,$2) as r", [dupA, dupB])));
ok(merged?.rows[0].r.games === 1, "the merge reports the games it moved");
const dupGames = await db.query("select count(*)::int n from game_results where player_id = $1", [dupB]);
ok(dupGames.rows[0].n === 2, "the kept name now has both players' games");
const dupGone = await db.query("select count(*)::int n from players where id = $1", [dupA]);
ok(dupGone.rows[0].n === 0, "the duplicate is removed");
const oneRsvp = await db.query("select count(*)::int n from session_signups where session_id = $1 and player_id = $2", [upcomingNight, dupB]);
ok(oneRsvp.rows[0].n === 1, "two RSVPs for one night collapse to one");
const rewritten = await db.query("select count(*)::int n from game_reports where results::text like $1", ["%" + dupB + "%"]);
ok(rewritten.rows[0].n === 1, "a pending report that named the duplicate now names the kept player");
const keepBio = await db.query("select bio from players where id = $1", [dupB]);
ok(keepBio.rows[0].bio === "Real bio", "the kept name's own details win");

// Two people who sat at the same table can't be the same person.
const sameTableA = (await admin_(() => db.query("insert into players (name) values ('Same Table A') returning id"))).rows[0].id;
const sameTableB = (await admin_(() => db.query("insert into players (name) values ('Same Table B') returning id"))).rows[0].id;
await admin_(() => db.query("select log_game('2026-11-12', null, $1::jsonb, 1::smallint)", [JSON.stringify([seat(sameTableA, "marquise", 1), seat(sameTableB, "eyrie", 2), seat(p1, "alliance", 3)])]));
await mustFail("players who sat at the same table cannot be merged", () => admin_(() => db.query("select merge_players($1,$2)", [sameTableA, sameTableB])));

// --- Deleting your own account ------------------------------------------------------------
// h: a profile with no games. i: a profile with games. j: the organizer.
ids.h = await newUser("h@x.test");
ids.i = await newUser("i@x.test");
const hPlayer = (await as("authenticated", who("h"), () => db.query("select create_my_profile('Hermit','About me',null,null) as id"))).rows[0].id;
const iPlayer = (await as("authenticated", who("i"), () => db.query("select create_my_profile('Ivy','About me too',null,null) as id"))).rows[0].id;
await admin_(() => db.query("select log_game('2026-11-13', null, $1::jsonb, 1::smallint)", [JSON.stringify([seat(iPlayer, "marquise", 1), seat(p1, "eyrie", 2), seat(p2, "alliance", 3)])]));
await mustFail("a signed-out visitor cannot delete an account", () => as("anon", null, () => db.query("select delete_my_account()")));
await mustFail("an organizer cannot delete their own account this way", () => admin_(() => db.query("select delete_my_account()")));
await mustWork("a player can delete their own account", () => as("authenticated", who("h"), () => db.query("select delete_my_account()")));
ok((await db.query("select count(*)::int n from auth.users where id = $1", [ids.h])).rows[0].n === 0, "the login (and its email) is gone");
ok((await db.query("select count(*)::int n from players where id = $1", [hPlayer])).rows[0].n === 0, "a profile with no games is removed too");
await mustWork("a player with games can delete their account", () => as("authenticated", who("i"), () => db.query("select delete_my_account()")));
const ivy = await db.query("select name, bio from players where id = $1", [iPlayer]);
ok(ivy.rows[0]?.name === "Ivy" && ivy.rows[0].bio === null, "their name and games stay, what they wrote about themselves goes");
ok((await db.query("select count(*)::int n from player_accounts where player_id = $1", [iPlayer])).rows[0].n === 0, "the name is no longer tied to any account");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
