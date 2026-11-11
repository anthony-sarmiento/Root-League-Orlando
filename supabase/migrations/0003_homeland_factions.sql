-- Root: The Homeland Expansion adds three factions: frogs (Lilypad Diaspora), bats (Twilight Council)
-- and knaves (Knaves of the Deepwood). Allow them in game results and as a favorite faction.
-- Safe to run more than once.

alter table game_results drop constraint if exists game_results_faction_check;
alter table game_results add constraint game_results_faction_check check (faction in (
  'marquise','eyrie','alliance','vagabond','riverfolk',
  'lizards','corvids','duchy','keepers','hundreds',
  'frogs','bats','knaves'));

alter table players drop constraint if exists players_favorite_faction_check;
alter table players add constraint players_favorite_faction_check check (favorite_faction in (
  'marquise','eyrie','alliance','vagabond','riverfolk',
  'lizards','corvids','duchy','keepers','hundreds',
  'frogs','bats','knaves'));
