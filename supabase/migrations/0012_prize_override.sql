-- An organizer-set prize pool for a season.
--
-- Normally the pool is counted from the games ($5 per player per game night). When an organizer needs to correct it
-- (a night that wasn't logged, a late entry, a rollover) they can type the amount in, and the site shows that instead.
-- NULL means "count it from the games". Seasons are already writable only by organizers (the "admin write" policy).
alter table seasons
  add column prize_override integer
  check (prize_override is null or (prize_override >= 0 and prize_override <= 100000));
