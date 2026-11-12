-- Privacy: keep fewer copies of anyone's email, and let people delete their own account.
--
--  * player_claims no longer stores a copy of the claimant's email. Organizers see claimants through
--    list_accounts() (masked on the page, revealed one address at a time on request), so the only place an
--    email lives is the login system itself, and it goes when the account does.
--  * delete_my_account() lets a signed-in person remove their own login. Their league history stays under the
--    player name (it is the league's record), but their email, login, claims and reports go, and a profile
--    with no games is removed entirely.

drop policy if exists "make claim" on player_claims;
alter table player_claims drop column claimant_email;
create policy "make claim" on player_claims for insert to authenticated
  with check (
    user_id = auth.uid()
    and player_claims.player_id not in (select claimed_player_ids())
  );

create function delete_my_account()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_player uuid;
begin
  if v_user is null then raise exception 'Sign in first'; end if;
  if is_admin() then
    raise exception 'Organizers can''t delete their own account here. Ask another organizer to remove you from the organizer list first.';
  end if;

  select player_id into v_player from player_accounts where user_id = v_user;

  -- Removing the login cascades to the account link, any open claim, and the reports they sent.
  delete from auth.users where id = v_user;

  if v_player is not null and not exists (select 1 from player_accounts where player_id = v_player) then
    if exists (select 1 from game_results where player_id = v_player) then
      -- The name stays on the leaderboard with its history; what they wrote about themselves goes.
      update players set bio = null where id = v_player;
    else
      delete from players where id = v_player;
    end if;
  end if;
end;
$$;

revoke all on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
