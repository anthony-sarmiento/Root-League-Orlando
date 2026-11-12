-- Players can pick a faction background to sit behind their character portrait.
-- Stored as the faction id; the site draws that faction's pattern behind the portrait.

alter table players
  add column avatar_bg text check (avatar_bg in (
    'marquise','eyrie','alliance','vagabond','riverfolk',
    'lizards','corvids','duchy','keepers','hundreds',
    'frogs','bats','knaves'));
