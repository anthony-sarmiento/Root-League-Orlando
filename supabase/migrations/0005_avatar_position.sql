-- Players can reposition and zoom their character inside their round profile picture.
-- avatar_x / avatar_y: the point of the portrait kept in the middle of the circle, 0-100 (percent across / down).
-- avatar_zoom: how far in, as a percentage (100 = fitted, 300 = three times closer).

alter table players
  add column avatar_x    smallint check (avatar_x between 0 and 100),
  add column avatar_y    smallint check (avatar_y between 0 and 100),
  add column avatar_zoom smallint check (avatar_zoom between 100 and 300);
