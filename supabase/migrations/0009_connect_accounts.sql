-- Connecting accounts to names, for when someone made a second account or a fresh profile that duplicates
-- a name organizers already have (with games logged under it).
--
--  * A player who already has a profile can now claim an existing name. When an organizer approves, their
--    profile is merged into that name instead of being refused.
--  * Organizers can connect any account to any name directly (list_accounts, link_account_to_player).
--  * merge_players folds one player into another: games, RSVPs, reports and accounts move over, blank profile
--    details are filled from the old one, and the old player is removed.
--  * More than one account can now belong to one player (only an organizer can add the second), so a person who
--    has two logins can keep using either.

alter table player_accounts drop constraint if exists player_accounts_player_id_key;
create index if not exists player_accounts_player_idx on player_accounts (player_id);

-- Claims no longer require "no profile yet". The name still has to be free of accounts (and this now really
-- checks every account, not just the ones the claimant can see).
drop policy if exists "make claim" on player_claims;
create policy "make claim" on player_claims for insert to authenticated
  with check (
    user_id = auth.uid()
    and claimant_email = (auth.jwt() ->> 'email')
    -- Uses the security-definer helper: row-level security hides other people's account links from a plain
    -- subquery, which would make every name look unclaimed.
    and player_claims.player_id not in (select claimed_player_ids())
  );

-- Every account with the name it is connected to (organizers only).
create function list_accounts()
returns table (user_id uuid, email text, created_at timestamptz, player_id uuid, player_name text)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only organizers can see accounts'; end if;
  return query
    select u.id, u.email::text, u.created_at, a.player_id, p.name
    from auth.users u
    left join player_accounts a on a.user_id = u.id
    left join players p on p.id = a.player_id
    order by u.created_at desc
    limit 500;
end;
$$;

-- Folds p_source into p_target and removes p_source. Returns how much moved.
create function merge_players(p_source uuid, p_target uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  src players;
  moved_games int;
  moved_signups int;
begin
  if not is_admin() then raise exception 'Only organizers can merge players'; end if;
  if p_source = p_target then raise exception 'Pick two different players'; end if;

  select * into src from players where id = p_source;
  if not found then raise exception 'The duplicate player no longer exists'; end if;
  if not exists (select 1 from players where id = p_target) then
    raise exception 'The name to keep no longer exists';
  end if;

  -- Two people can't have sat at the same table, so if they did these aren't the same person.
  if exists (
    select 1 from game_results a join game_results b on a.game_id = b.game_id
    where a.player_id = p_source and b.player_id = p_target
  ) then
    raise exception 'They both played in the same game, so they can''t be the same person';
  end if;

  update game_results set player_id = p_target where player_id = p_source;
  get diagnostics moved_games = row_count;

  insert into session_signups (session_id, player_id, created_at)
    select session_id, p_target, created_at from session_signups where player_id = p_source
  on conflict do nothing;
  get diagnostics moved_signups = row_count;
  delete from session_signups where player_id = p_source;

  update game_reports set reporter_player_id = p_target where reporter_player_id = p_source;
  update game_reports
     set results = (
       select jsonb_agg(
         case when r->>'player_id' = p_source::text
              then jsonb_set(r, '{player_id}', to_jsonb(p_target::text))
              else r end)
       from jsonb_array_elements(results) r)
   where exists (select 1 from jsonb_array_elements(results) r where r->>'player_id' = p_source::text);

  delete from player_claims where player_id = p_source;
  update player_accounts set player_id = p_target where player_id = p_source;

  -- Keep the name that stays, but don't throw away what the other profile had filled in.
  update players
     set bio              = coalesce(bio, src.bio),
         favorite_faction = coalesce(favorite_faction, src.favorite_faction),
         avatar           = coalesce(avatar, src.avatar),
         avatar_bg        = coalesce(avatar_bg, src.avatar_bg),
         avatar_x         = coalesce(avatar_x, src.avatar_x),
         avatar_y         = coalesce(avatar_y, src.avatar_y),
         avatar_zoom      = coalesce(avatar_zoom, src.avatar_zoom)
   where id = p_target;

  delete from players where id = p_source;

  return jsonb_build_object('games', moved_games, 'signups', moved_signups);
end;
$$;

-- Connects an account to a name. If the account already has a different profile, that profile is merged into
-- the name. If the name already has an account, this one is added alongside it.
create function link_account_to_player(p_user_id uuid, p_player_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  existing uuid;
  result jsonb;
begin
  if not is_admin() then raise exception 'Only organizers can connect accounts'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'That account no longer exists'; end if;
  if not exists (select 1 from players where id = p_player_id) then raise exception 'That name no longer exists'; end if;

  select player_id into existing from player_accounts where user_id = p_user_id;

  if existing is null then
    insert into player_accounts (user_id, player_id) values (p_user_id, p_player_id);
    result := jsonb_build_object('games', 0, 'signups', 0);
  elsif existing = p_player_id then
    result := jsonb_build_object('games', 0, 'signups', 0, 'already', true);
  else
    result := merge_players(existing, p_player_id);
  end if;

  delete from player_claims where user_id = p_user_id;
  return result;
end;
$$;

-- An organizer approves a claim. If the claimant has a profile of their own, it is merged into the claimed name.
create or replace function approve_claim(p_user_id uuid)
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

  perform link_account_to_player(claim.user_id, claim.player_id);
end;
$$;

revoke all on function list_accounts() from public, anon;
revoke all on function merge_players(uuid, uuid) from public, anon;
revoke all on function link_account_to_player(uuid, uuid) from public, anon;
grant execute on function list_accounts() to authenticated;
grant execute on function merge_players(uuid, uuid) to authenticated;
grant execute on function link_account_to_player(uuid, uuid) to authenticated;
