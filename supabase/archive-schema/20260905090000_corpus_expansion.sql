-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- The research-master corpus: shirt numbers, the year-labelled sponsor chronology,
-- supporter culture, and the match fields the European pages actually carry.

-- ── matches: a gate count, and the honest handling of a source that contradicts itself
alter table match add column if not exists attendance integer
  check (attendance is null or attendance >= 0);
alter table match add column if not exists attendance_disputed boolean not null default false;
alter table match add column if not exists travelling_supporters integer
  check (travelling_supporters is null or travelling_supporters >= 0);
alter table match add column if not exists note_he text;

comment on column match.attendance_disputed is
  'True when the source gives more than one gate figure. The stored value is the one the source''s own summary carries; the disagreement lives in fact_conflict. Never averaged, never picked silently.';
comment on column match.travelling_supporters is
  'Away support that travelled, where a source counts it — 7,000 to the San Siro in 2002. A separate historical statistic, not part of attendance.';

-- ── shirt numbers. The season is part of the key, always.
create table if not exists shirt_number_holding (
  id             uuid primary key default gen_random_uuid(),
  natural_key    text not null unique,
  shirt_number   smallint not null check (shirt_number between 1 and 99),
  season_id      uuid not null references season(id) on delete cascade,
  person_id      uuid references person(id),
  person_name_he text not null,
  club_id        uuid not null references club(id),
  sport          text not null default 'football' check (sport in ('football','basketball')),
  note_he        text,
  source_id      uuid not null references source(id),
  confidence     smallint not null check (confidence between 0 and 3),
  created_at     timestamptz not null default now()
);

create index if not exists shirt_number_season_idx on shirt_number_holding (season_id, shirt_number);
create index if not exists shirt_number_person_idx on shirt_number_holding (person_id);

-- NOT unique on (season, number): a mid-season transfer means two holders, and a unique
-- constraint here would force the importer to silently drop a real row.
comment on table shirt_number_holding is
  'One row per (number, season, player). Two rows for one season is a real fact — a shirt changed hands. The question generator drops any pair with more than one holder rather than choosing.';

-- ── the year-labelled sponsor chronology, kept apart from season-keyed deals
create table if not exists sponsor_year (
  id                  uuid primary key default gen_random_uuid(),
  natural_key         text not null unique,
  year_label_raw      text not null,
  season_ambiguous    boolean not null default true,
  main_sponsor_he     text not null,
  additional_sponsors_he text[] not null default '{}',
  manufacturer_he     text,
  sport               text not null default 'football' check (sport in ('football','basketball')),
  note_he             text,
  source_id           uuid not null references source(id),
  confidence          smallint not null check (confidence between 0 and 3),
  created_at          timestamptz not null default now()
);

comment on column sponsor_year.year_label_raw is
  'Exactly as the source writes it. A bare "1998" is not a season: it could be 1997/98 or 1998/99 and the source does not say, so it is never joined to season.';
comment on column sponsor_year.season_ambiguous is
  'True for a bare-year label. A row with this set may not answer a question phrased by season.';

-- ── supporter culture, deliberately not a statistics table
create table if not exists fan_culture (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title_he       text not null,
  category       text not null check (category in
                   ('chant','song','superstition','derby','gate','travel','choreography','fence')),
  description_he text not null,
  period_he      text,
  location_he    text,
  sport          text not null default 'football' check (sport in ('football','basketball')),
  source_id      uuid not null references source(id),
  confidence     smallint not null check (confidence between 0 and 3),
  created_at     timestamptz not null default now()
);

comment on table fan_culture is
  'Terrace folklore: chants, gate customs, fence meetings, superstition. Separate from match statistics on purpose — a chant is not a fact about a football match.';

-- ── songs gain a type and a subject
alter table song add column if not exists song_type text not null default 'terrace_song'
  check (song_type in ('terrace_song','player_song','club_song','derby_song','historical'));
alter table song add column if not exists person_name_he text;

comment on column song.song_type is
  'Never one undifferentiated table of songs. A player song carries its subject, which is what makes "which player got Creep?" answerable.';

alter table shirt_number_holding enable row level security;
alter table sponsor_year enable row level security;
alter table fan_culture enable row level security;

drop policy if exists shirt_number_read on shirt_number_holding;
create policy shirt_number_read on shirt_number_holding for select using (true);
drop policy if exists sponsor_year_read on sponsor_year;
create policy sponsor_year_read on sponsor_year for select using (true);
drop policy if exists fan_culture_read on fan_culture;
create policy fan_culture_read on fan_culture for select using (true);

-- ── data quality: which (season, number) pairs cannot be asked about, and why
create or replace view v_dq_shirt_number_contested as
select s.label as season_label, h.shirt_number, count(*) as holders,
       array_agg(h.person_name_he order by h.person_name_he) as names
from shirt_number_holding h
join season s on s.id = h.season_id
group by s.label, h.shirt_number
having count(*) > 1;

create or replace view v_dq_match_attendance_gaps as
select m.natural_key, m.attendance, m.attendance_disputed, m.note_he
from match m
where m.attendance is null or m.attendance_disputed;
