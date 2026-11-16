-- The plan now runs past 60 days (owner, 16.11.2026: "spread all the posts smarter and wider so followers are not
-- overloaded" — the queue was spread to 4.3.2027, about five public posts a day). posts.day counts days from 9.11.2026.
alter table marketing.posts drop constraint if exists posts_day_check;
alter table marketing.posts add constraint posts_day_check check (day >= 0 and day <= 366);
