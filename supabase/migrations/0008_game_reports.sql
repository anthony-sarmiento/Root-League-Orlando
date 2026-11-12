-- Players can report a table they played in; an organizer approves it before it counts.
--
--  * game_reports holds the reports. A player sees only their own; organizers see all.
--  * submit_game_report is the only way a player can add one: it checks the table, makes sure the reporter
--    actually sat at it, rejects future dates and limits how many reports can be waiting at once.
--  * approve_game_report turns a pending report into a real game (organizers only), using the organizer's
--    final version of the table, so a mistake in the report can be fixed on the way through.
--
-- Nothing a player reports touches the standings until it is approved.

create table game_reports (
  id                 uuid primary key default gen_random_uuid(),
  submitted_by       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  reporter_player_id uuid not null references players(id) on delete cascade,
  played_on          date not null,
  session_id         uuid references sessions(id) on delete set null,
  round              smallint not null default 1 check (round between 1 and 4),
  -- [{ "player_id": uuid, "faction": text, "placement": 1..4 }, ...] in any order
  results            jsonb not null check (jsonb_typeof(results) = 'array' and jsonb_array_length(results) between 3 and 4),
  note               text check (note is null or char_length(note) <= 280),
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason      text check (reject_reason is null or char_length(reject_reason) <= 280),
  game_id            uuid references games(id) on delete set null,
  reviewed_by        uuid references auth.users(id) on delete set null,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index game_reports_status_idx on game_reports (status, created_at);
create index game_reports_submitter_idx on game_reports (submitted_by);

alter table game_reports enable row level security;

create policy "see own reports, organizers see all" on game_reports for select
  using (submitted_by = auth.uid() or is_admin());
create policy "withdraw own pending report" on game_reports for delete
  using (submitted_by = auth.uid() and status = 'pending');
create policy "organizers manage reports" on game_reports for all
  using (is_admin()) with check (is_admin());
-- No insert policy for regular accounts: reports only arrive through submit_game_report below.

create function submit_game_report(
  p_played_on date, p_session_id uuid, p_round smallint, p_results jsonb, p_note text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_player uuid;
  seats int;
  report_id uuid;
  factions text[] := array['marquise','eyrie','alliance','vagabond','riverfolk','lizards','corvids',
                           'duchy','keepers','hundreds','frogs','bats','knaves'];
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;

  select player_id into v_player from player_accounts where user_id = auth.uid();
  if v_player is null then raise exception 'Create your player profile first'; end if;

  if p_played_on > current_date + 1 then raise exception 'That date is in the future'; end if;
  if p_round not between 1 and 4 then raise exception 'Pick a round from 1 to 4'; end if;
  if p_note is not null and char_length(p_note) > 280 then raise exception 'Keep the note under 280 characters'; end if;
  if jsonb_typeof(p_results) <> 'array' then raise exception 'Results must be a list'; end if;

  seats := jsonb_array_length(p_results);
  if seats not between 3 and 4 then raise exception 'A table seats 3 or 4 players, not %', seats; end if;

  if exists (
    select 1 from jsonb_array_elements(p_results) r
    where r->>'player_id' is null or r->>'faction' is null or r->>'placement' is null
  ) then raise exception 'Every seat needs a player, a faction and a finishing place'; end if;

  if exists (select 1 from jsonb_array_elements(p_results) r where not (r->>'faction' = any (factions))) then
    raise exception 'Unknown faction';
  end if;
  if (select count(distinct r->>'player_id') from jsonb_array_elements(p_results) r) <> seats then
    raise exception 'A player can only sit once per game';
  end if;
  if (select count(distinct r->>'faction') from jsonb_array_elements(p_results) r) <> seats then
    raise exception 'Each faction can only be played once per game';
  end if;
  if (select count(distinct (r->>'placement')::int) from jsonb_array_elements(p_results) r) <> seats
     or (select min((r->>'placement')::int) from jsonb_array_elements(p_results) r) <> 1
     or (select max((r->>'placement')::int) from jsonb_array_elements(p_results) r) <> seats then
    raise exception 'Finishing places must run 1st to %, once each', case when seats = 3 then '3rd' else '4th' end;
  end if;
  if (select count(*) from players where id in (select (r->>'player_id')::uuid from jsonb_array_elements(p_results) r)) <> seats then
    raise exception 'One of those players is not in the league';
  end if;
  if not exists (select 1 from jsonb_array_elements(p_results) r where (r->>'player_id')::uuid = v_player) then
    raise exception 'You can only report a game you played in';
  end if;
  if (select count(*) from game_reports where submitted_by = auth.uid() and status = 'pending') >= 5 then
    raise exception 'You already have 5 reports waiting for approval';
  end if;

  insert into game_reports (submitted_by, reporter_player_id, played_on, session_id, round, results, note)
  values (auth.uid(), v_player, p_played_on, p_session_id, p_round, p_results, nullif(btrim(p_note), ''))
  returning id into report_id;

  return report_id;
end;
$$;

revoke all on function submit_game_report(date, uuid, smallint, jsonb, text) from public, anon;
grant execute on function submit_game_report(date, uuid, smallint, jsonb, text) to authenticated;

-- Runs as the caller: only an organizer can see the report for update and create the game, so anyone else
-- simply gets "not found".
create function approve_game_report(
  p_report_id uuid, p_played_on date, p_session_id uuid, p_results jsonb, p_round smallint default 1
)
returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_game uuid;
begin
  perform 1 from game_reports where id = p_report_id and status = 'pending' for update;
  if not found then raise exception 'Report not found or already reviewed'; end if;

  v_game := log_game(p_played_on, p_session_id, p_results, p_round);

  update game_reports
     set status = 'approved', game_id = v_game, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_report_id;

  return v_game;
end;
$$;
