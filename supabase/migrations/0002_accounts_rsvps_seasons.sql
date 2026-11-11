-- Root League Orlando — migration 0002: seasons, player accounts and profiles, name claims, RSVPs.
-- Run once in the Supabase SQL editor, after 0001_initial.sql. Safe to read top to bottom.

-- ============================================================================
-- Seasons: explicit dates instead of a fixed two-month rhythm
-- ============================================================================

create table seasons (
  number    int  primary key check (number > 0),
  starts_on date not null,
  ends_on   date not null,
  check (ends_on >= starts_on)
);

insert into seasons (number, starts_on, ends_on) values
  (1, '2026-06-07', '2026-09-07'),
  (2, '2026-11-01', '2026-12-20');

alter table seasons enable row level security;
create policy "public read"  on seasons for select using (true);
create policy "admin write"  on seasons for all using (is_admin()) with check (is_admin());

-- ============================================================================
-- Player profiles (public) and the private link from an account to a player
-- ============================================================================

alter table players
  add column bio              text     check (char_length(bio) <= 280),
  add column favorite_faction text     check (favorite_faction in (
                                'marquise','eyrie','alliance','vagabond','riverfolk',
                                'lizards','corvids','duchy','keepers','hundreds')),
  add column avatar           text     check (avatar ~ '^[a-z0-9-]{1,60}$');

-- Which account owns which player. Private: you can only read your own row (or be an organizer),
-- so profiles stay public without exposing anyone's account id.
create table player_accounts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  player_id  uuid not null unique references players(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table player_accounts enable row level security;
create policy "see own link"      on player_accounts for select using (user_id = auth.uid() or is_admin());
create policy "admin manage link" on player_accounts for all    using (is_admin()) with check (is_admin());
-- No insert policy for regular users: links are only created by the functions below.

-- Players can edit their own profile; organizers can edit anyone's (existing "admin write" policy).
create policy "edit own profile" on players for update to authenticated
  using (exists (select 1 from player_accounts a where a.player_id = players.id and a.user_id = auth.uid()))
  with check (exists (select 1 from player_accounts a where a.player_id = players.id and a.user_id = auth.uid()));

-- Create a brand-new player profile for the signed-in account, atomically.
create function create_my_profile(p_name text, p_bio text, p_favorite_faction text, p_avatar text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_player_id uuid;
  clean_name text := btrim(p_name);
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if clean_name is null or clean_name = '' or char_length(clean_name) > 40 then
    raise exception 'Name must be 1-40 characters';
  end if;
  if exists (select 1 from player_accounts where user_id = auth.uid()) then
    raise exception 'You already have a profile';
  end if;

  insert into players (name, bio, favorite_faction, avatar)
  values (clean_name, nullif(btrim(p_bio), ''), nullif(p_favorite_faction, ''), nullif(p_avatar, ''))
  returning id into new_player_id;

  insert into player_accounts (user_id, player_id) values (auth.uid(), new_player_id);
  delete from player_claims where user_id = auth.uid();  -- a pending claim is moot now
  return new_player_id;
end;
$$;

revoke all on function create_my_profile(text, text, text, text) from public, anon;
grant execute on function create_my_profile(text, text, text, text) to authenticated;

-- Which players already belong to an account (ids only, never whose) — lets the site hide
-- taken names from the "claim your name" list.
create function claimed_player_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select player_id from player_accounts;
$$;
grant execute on function claimed_player_ids() to anon, authenticated;

-- ============================================================================
-- Claims: "that existing player name is me" — approved by an organizer
-- ============================================================================

create table player_claims (
  user_id        uuid primary key references auth.users(id) on delete cascade,  -- one open claim per account
  player_id      uuid not null references players(id) on delete cascade,
  claimant_email text not null default (auth.jwt() ->> 'email'),
  note           text check (char_length(note) <= 280),
  created_at     timestamptz not null default now()
);

alter table player_claims enable row level security;
create policy "see own claim" on player_claims for select using (user_id = auth.uid() or is_admin());
create policy "make claim"    on player_claims for insert to authenticated
  with check (
    user_id = auth.uid()
    and claimant_email = (auth.jwt() ->> 'email')
    and not exists (select 1 from player_accounts a where a.user_id = auth.uid())          -- no profile yet
    and not exists (select 1 from player_accounts a where a.player_id = player_claims.player_id) -- name not taken
  );
create policy "withdraw or reject claim" on player_claims for delete using (user_id = auth.uid() or is_admin());

-- Organizer approves a claim: the account becomes the owner of the existing player record.
create function approve_claim(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  claim player_claims;
begin
  if not is_admin() then raise exception 'Only organizers can approve claims'; end if;

  select * into claim from player_claims where user_id = p_user_id for update;
  if not found then raise exception 'That claim no longer exists'; end if;
  if exists (select 1 from player_accounts where player_id = claim.player_id) then
    raise exception 'That player already belongs to an account';
  end if;

  -- If they made a fresh profile in the meantime and it has no games, drop it in favour of the real one.
  delete from players p
  using player_accounts a
  where a.user_id = claim.user_id and a.player_id = p.id
    and not exists (select 1 from game_results r where r.player_id = p.id);
  if exists (select 1 from player_accounts where user_id = claim.user_id) then
    raise exception 'That account already has a profile with games; resolve it manually';
  end if;

  insert into player_accounts (user_id, player_id) values (claim.user_id, claim.player_id);
  delete from player_claims where user_id = p_user_id;
end;
$$;

revoke all on function approve_claim(uuid) from public, anon;
grant execute on function approve_claim(uuid) to authenticated;

-- ============================================================================
-- Game night RSVPs
-- ============================================================================

create table session_signups (
  session_id uuid not null references sessions(id) on delete cascade,
  player_id  uuid not null references players(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

create index on session_signups (player_id);

alter table session_signups enable row level security;
create policy "public read" on session_signups for select using (true);

-- You can RSVP yourself to a night that hasn't happened yet (Orlando time), and withdraw any time.
create policy "join own" on session_signups for insert to authenticated
  with check (
    exists (select 1 from player_accounts a where a.player_id = session_signups.player_id and a.user_id = auth.uid())
    and exists (
      select 1 from sessions s
      where s.id = session_signups.session_id
        and s.date >= (now() at time zone 'America/New_York')::date
    )
  );
create policy "leave own" on session_signups for delete to authenticated
  using (exists (select 1 from player_accounts a where a.player_id = session_signups.player_id and a.user_id = auth.uid()));
create policy "admin manage signups" on session_signups for all using (is_admin()) with check (is_admin());
