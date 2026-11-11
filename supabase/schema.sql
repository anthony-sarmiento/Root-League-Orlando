-- Root League Orlando — database schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor. LP is NOT stored: it is computed from
-- placements using the rules in src/lib/league.ts, so rule changes apply retroactively.

create table players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  title       text not null default 'Root League Night',
  location    text not null default 'Location TBA',
  created_at  timestamptz not null default now()
);

create table games (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete set null,
  played_on   date not null,
  created_at  timestamptz not null default now()
);

create table game_results (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references games(id) on delete cascade,
  player_id   uuid not null references players(id),
  faction     text not null check (faction in (
                'marquise','eyrie','alliance','vagabond','riverfolk',
                'lizards','corvids','duchy','keepers','hundreds')),
  placement   smallint not null check (placement between 1 and 4),
  unique (game_id, player_id),   -- a player sits once per game
  unique (game_id, placement),   -- one player per finishing position
  unique (game_id, faction)      -- one of each faction per game
);

create index on games (played_on);
create index on game_results (player_id);

-- Admins are Supabase Auth users listed here.
create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Row-level security: everyone can read, only admins can write.
alter table players      enable row level security;
alter table sessions     enable row level security;
alter table games        enable row level security;
alter table game_results enable row level security;
alter table admins       enable row level security;

create policy "public read" on players      for select using (true);
create policy "public read" on sessions     for select using (true);
create policy "public read" on games        for select using (true);
create policy "public read" on game_results for select using (true);

create policy "admin write" on players      for all using (is_admin()) with check (is_admin());
create policy "admin write" on sessions     for all using (is_admin()) with check (is_admin());
create policy "admin write" on games        for all using (is_admin()) with check (is_admin());
create policy "admin write" on game_results for all using (is_admin()) with check (is_admin());

create policy "admins see admins" on admins for select using (is_admin());
