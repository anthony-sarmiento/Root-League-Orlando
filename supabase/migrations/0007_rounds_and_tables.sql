-- Game nights can have more than one round, and a table can seat 3 or 4 players.
--
--  * games.round says which round of the night a table belongs to (1 to 4).
--  * log_game now accepts 3 or 4 results and a round, and checks that the finishing places run 1st..Nth.
--  * update_game replaces a game's night, round and results in one step, so organizers can fix a table.
--
-- Safe to run once. Existing games become Round 1.

alter table games
  add column round smallint not null default 1 check (round between 1 and 4);

create index games_session_round_idx on games (session_id, round);

drop function if exists log_game(date, uuid, jsonb);

create function log_game(p_played_on date, p_session_id uuid, p_results jsonb, p_round smallint default 1)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  new_game_id uuid;
  seats int := jsonb_array_length(p_results);
begin
  if seats not between 3 and 4 then
    raise exception 'A table seats 3 or 4 players, not %', seats;
  end if;

  insert into games (played_on, session_id, round) values (p_played_on, p_session_id, p_round)
  returning id into new_game_id;

  insert into game_results (game_id, player_id, faction, placement)
  select new_game_id, (r->>'player_id')::uuid, r->>'faction', (r->>'placement')::smallint
  from jsonb_array_elements(p_results) as r;

  -- Places are unique and between 1 and 4, so the highest being N means they are exactly 1..N.
  if (select max(placement) from game_results where game_id = new_game_id) <> seats then
    raise exception 'Finishing places must run 1st to %, once each', case when seats = 3 then '3rd' else '4th' end;
  end if;

  return new_game_id;
end;
$$;

create function update_game(
  p_game_id uuid, p_played_on date, p_session_id uuid, p_results jsonb, p_round smallint default 1
)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  seats int := jsonb_array_length(p_results);
begin
  if seats not between 3 and 4 then
    raise exception 'A table seats 3 or 4 players, not %', seats;
  end if;

  update games set played_on = p_played_on, session_id = p_session_id, round = p_round where id = p_game_id;
  -- Row-level security hides games from non-organizers, so "not found" also covers "not allowed".
  if not found then
    raise exception 'Game not found';
  end if;

  delete from game_results where game_id = p_game_id;

  insert into game_results (game_id, player_id, faction, placement)
  select p_game_id, (r->>'player_id')::uuid, r->>'faction', (r->>'placement')::smallint
  from jsonb_array_elements(p_results) as r;

  if (select max(placement) from game_results where game_id = p_game_id) <> seats then
    raise exception 'Finishing places must run 1st to %, once each', case when seats = 3 then '3rd' else '4th' end;
  end if;
end;
$$;
