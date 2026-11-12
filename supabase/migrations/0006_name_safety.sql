-- Hardening for player names and bios (the text people can type into sign-up and profile forms).
--
-- The site only ever talks to the database through bound parameters, so SQL injection through a name isn't
-- possible. This migration adds a second line of defence in the database itself: names can't contain markup,
-- quotes, statement punctuation, control characters or invisible text, can't be padded or over-long, and two
-- players can't share a name that differs only by capitals.
--
-- The checks are NOT VALID: they apply to every new and edited row, but don't reject names that already exist.

alter table players
  add constraint players_name_safe check (
    name = btrim(name)
    and char_length(name) between 1 and 40
    and name !~ '[[:cntrl:]<>"`;{}|^~$%=]'
    -- zero-width spaces, directional overrides and the byte-order mark
    and name !~ ('[' || chr(8203) || '-' || chr(8207) || chr(8234) || '-' || chr(8238) || chr(8288) || '-' || chr(8292) || chr(65279) || ']')
  ) not valid;

alter table players
  add constraint players_bio_safe check (
    bio is null or translate(bio, chr(9) || chr(10) || chr(13), '') !~ '[[:cntrl:]]'
  ) not valid;

-- One name per player, ignoring capitals ("bramble" can't be added next to "Bramble").
do $$
begin
  create unique index players_name_ci_key on players (lower(name));
exception when unique_violation then
  raise notice 'Skipped the case-insensitive name index: two existing players differ only by capitals. Rename one, then run: create unique index players_name_ci_key on players (lower(name));';
end $$;
