-- Tighten who may call the claim helper.
--
-- claimed_player_ids() answers "which player names are already linked to an account?" for the name-claim policy.
-- It only needs to run for signed-in people, so the public (anon) role no longer gets to call it.
revoke execute on function claimed_player_ids() from public, anon;
grant execute on function claimed_player_ids() to authenticated;
