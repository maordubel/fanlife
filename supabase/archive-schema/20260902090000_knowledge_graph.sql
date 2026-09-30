-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- The Worker — knowledge-graph extension.
--
-- Turns the football-stats core into the connected Hapoel graph: a shirt leads to a
-- season, a sponsor, a crest, a song, a stand, a story and a source.
--
-- Two hard rules encoded here:
--   1. Football and basketball never mix. Every sport-bearing table carries `sport`.
--   2. A derby means Maccabi Tel Aviv. Nothing else. It is derived, not typed in.

-- =====================================================================
-- 1. SPORT SEPARATION
-- =====================================================================

create type sport_code as enum ('football', 'basketball');

alter table club        add column if not exists sport sport_code not null default 'football';
alter table competition add column if not exists sport sport_code not null default 'football';
alter table venue       add column if not exists sport sport_code not null default 'football';
alter table kit         add column if not exists sport sport_code not null default 'football';
alter table trophy      add column if not exists sport sport_code not null default 'football';
alter table moment      add column if not exists sport sport_code not null default 'football';
alter table person_stint add column if not exists sport sport_code not null default 'football';

-- A club's slug is unique across sports, so the football and basketball sides of the
-- same club are two rows, deliberately.
drop index if exists club_slug_key;
alter table club drop constraint if exists club_slug_key;
create unique index if not exists club_slug_sport_idx on club (slug, sport);

-- A match cannot cross sports: the competition decides, and both clubs must agree.
create or replace function match_sport_consistent() returns trigger
language plpgsql as $$
declare
  competition_sport sport_code;
  home_sport sport_code;
  away_sport sport_code;
begin
  select sport into competition_sport from competition where id = new.competition_id;
  select sport into home_sport from club where id = new.home_club_id;
  select sport into away_sport from club where id = new.away_club_id;
  if competition_sport is distinct from home_sport or competition_sport is distinct from away_sport then
    raise exception 'match % mixes sports (competition %, home %, away %)',
      new.id, competition_sport, home_sport, away_sport;
  end if;
  return new;
end $$;

create trigger match_sport_guard before insert or update on match
  for each row execute function match_sport_consistent();

-- =====================================================================
-- 2. DERBY  — Maccabi Tel Aviv only
-- =====================================================================

-- The rival is a property of the club, declared once, sourced like any other fact.
alter table club add column if not exists is_derby_rival boolean not null default false;
comment on column club.is_derby_rival is
  'True only for the club whose fixture against us is the derby. For Hapoel Tel Aviv football that is Maccabi Tel Aviv, and nothing else.';

-- match.is_derby is derived, never hand-set: a fixture is a derby when one side is us
-- and the other is the declared rival.
create or replace function match_derby_derived() returns trigger
language plpgsql as $$
declare
  home_us boolean; away_us boolean; home_rival boolean; away_rival boolean;
begin
  select is_us, is_derby_rival into home_us, home_rival from club where id = new.home_club_id;
  select is_us, is_derby_rival into away_us, away_rival from club where id = new.away_club_id;
  new.is_derby := (coalesce(home_us,false) and coalesce(away_rival,false))
               or (coalesce(away_us,false) and coalesce(home_rival,false));
  return new;
end $$;

create trigger match_derby_guard before insert or update on match
  for each row execute function match_derby_derived();

-- =====================================================================
-- 3. FACT CONFLICTS  — sources disagree, and that is itself data
-- =====================================================================

create table fact_conflict (
  id            uuid primary key default gen_random_uuid(),
  natural_key   text not null unique,
  entity_table  text not null,
  entity_key    text,
  field         text not null,
  claim_a       text not null,
  source_a      uuid references source(id),
  claim_b       text not null,
  source_b      uuid references source(id),
  resolution    text,                              -- null while unresolved
  resolved_by   text,
  note_he       text,
  created_at    timestamptz not null default now()
);
comment on table fact_conflict is
  'Two credible sources disagree. Recorded, shown, and never silently resolved by picking one.';

-- =====================================================================
-- 4. COMMERCIAL AND VISUAL IDENTITY
-- =====================================================================

create type sponsor_placement as enum ('front', 'back', 'shorts', 'sleeve', 'other');

create table sponsor (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name_he    text not null,
  name_en    text,
  industry   text
);

create table sponsor_deal (
  id           uuid primary key default gen_random_uuid(),
  natural_key  text unique not null,               -- club|sport|sponsor|placement|from
  club_id      uuid not null references club(id),
  sponsor_id   uuid not null references sponsor(id),
  sport        sport_code not null default 'football',
  placement    sponsor_placement not null default 'front',
  from_season  uuid references season(id),
  to_season    uuid references season(id),
  from_label   text,                               -- as the source words it
  to_label     text,
  ended_early  boolean not null default false,
  note_he      text,
  source_id    uuid references source(id),
  confidence   confidence not null default 1
);

create table manufacturer (
  id      uuid primary key default gen_random_uuid(),
  slug    text unique not null,
  name_he text not null,
  name_en text
);

-- A supply spell, separate from an individual kit: "Nike, three separate eras" is the
-- game mechanic, and it only exists if the spells are first-class rows.
create table kit_supply_spell (
  id              uuid primary key default gen_random_uuid(),
  natural_key     text unique not null,            -- club|sport|manufacturer|from
  club_id         uuid not null references club(id),
  manufacturer_id uuid not null references manufacturer(id),
  sport           sport_code not null default 'football',
  from_season     uuid references season(id),
  to_season       uuid references season(id),
  from_label      text,
  to_label        text,
  is_current      boolean not null default false,
  source_id       uuid references source(id),
  confidence      confidence not null default 1
);

create table crest_version (
  id           uuid primary key default gen_random_uuid(),
  natural_key  text unique not null,               -- club|from_year
  club_id      uuid not null references club(id),
  from_year    int not null,
  to_year      int,
  name_he      text not null,
  change_he    text,                               -- what changed and why
  media_id     uuid references media(id),
  source_id    uuid references source(id),
  confidence   confidence not null default 1
);

-- =====================================================================
-- 5. FAN CULTURE
-- =====================================================================

create table fan_group (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name_he       text not null,
  former_name_he text,
  founded_year  int,
  stand_he      text,                              -- e.g. שער 5
  club_id       uuid references club(id),
  sport         sport_code not null default 'football',
  note_he       text,
  source_id     uuid references source(id),
  confidence    confidence not null default 1
);

create table song (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  title_he          text not null,
  sport             sport_code not null default 'football',
  fan_group_id      uuid references fan_group(id),
  season_introduced uuid references season(id),
  season_label      text,                          -- as stated, before resolution
  lyrics_author_he  text,
  original_title    text,                          -- the borrowed melody
  original_artist   text,
  person_id         uuid references person(id),    -- a player song
  moment_id         uuid references moment(id),
  video_url         text,
  background_he     text,
  source_id         uuid references source(id),
  confidence        confidence not null default 1
);

create table quote (
  id          uuid primary key default gen_random_uuid(),
  natural_key text unique not null,
  text_he     text not null,
  person_id   uuid references person(id),
  person_name_he text,                             -- when the speaker has no person row
  said_on     date,
  context_he  text,
  season_id   uuid references season(id),
  moment_id   uuid references moment(id),
  source_id   uuid references source(id),
  confidence  confidence not null default 1
);

-- =====================================================================
-- 6. FAN OWNERSHIP  — the Hapoel Ussishkin chapter
-- =====================================================================

create table association (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name_he       text not null,
  registry_id   text,                              -- Israeli amuta number
  founded_year  int,
  club_id       uuid references club(id),
  sport         sport_code not null default 'basketball',
  purpose_he    text,
  source_id     uuid references source(id),
  confidence    confidence not null default 1
);

create type association_event_kind as enum
  ('founding', 'meeting', 'election', 'vote', 'promotion', 'name_change', 'resignation', 'ceremony', 'other');

create table association_event (
  id             uuid primary key default gen_random_uuid(),
  natural_key    text unique not null,
  association_id uuid not null references association(id) on delete cascade,
  kind           association_event_kind not null,
  happened_on    date,
  date_confirmed boolean not null default false,   -- never invent a date
  title_he       text not null,
  body_he        text,
  votes_for      int,
  votes_against  int,
  abstentions    int,
  turnout        int,
  source_id      uuid references source(id),
  confidence     confidence not null default 1
);

create table association_role (
  id             uuid primary key default gen_random_uuid(),
  natural_key    text unique not null,
  association_id uuid not null references association(id) on delete cascade,
  person_id      uuid references person(id),
  person_name_he text not null,
  role_he        text not null,                    -- חבר הנהלה · יו"ר · מייסד
  from_date      date,
  to_date        date,
  end_reason_he  text,
  replaced_by_name_he text,
  votes          int,
  source_id      uuid references source(id),
  confidence     confidence not null default 1
);

create table membership_milestone (
  id             uuid primary key default gen_random_uuid(),
  natural_key    text unique not null,
  association_id uuid not null references association(id) on delete cascade,
  number         int not null,
  person_name_he text not null,
  person_id      uuid references person(id),
  happened_on    date,
  date_confirmed boolean not null default false,
  context_he     text,
  source_id      uuid references source(id),
  confidence     confidence not null default 1
);

-- =====================================================================
-- 7. RLS  — new content tables are world-readable, same as the rest
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'fact_conflict','sponsor','sponsor_deal','manufacturer','kit_supply_spell','crest_version',
    'fan_group','song','quote','association','association_event','association_role',
    'membership_milestone'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($f$create policy %I_read on %I for select using (true)$f$, t, t);
  end loop;
end $$;

-- =====================================================================
-- 8. DATA-QUALITY VIEWS for the new material
-- =====================================================================

create view v_dq_open_conflicts as
  select id, entity_table, entity_key, field, claim_a, claim_b
  from fact_conflict where resolution is null;

create view v_dq_song_without_origin as
  select id, title_he from song where original_title is null;

create view v_dq_undated_association_events as
  select id, title_he, happened_on from association_event where date_confirmed = false;

create view v_dq_sport_mixing as
  select 'kit_supply_spell' as tbl, s.id
  from kit_supply_spell s join club c on c.id = s.club_id where c.sport <> s.sport
  union all
  select 'sponsor_deal', d.id
  from sponsor_deal d join club c on c.id = d.club_id where c.sport <> d.sport;

-- =====================================================================
-- 9. ALIASES ARE SCOPED BY SPORT
-- =====================================================================
-- "הפועל תל אביב (כדורסל)" normalises to the same string as the football club.
-- Forcing them to collide would merge two different entities, so the alias key
-- carries the sport.
alter table entity_alias add column if not exists scope sport_code not null default 'football';
alter table entity_alias drop constraint if exists entity_alias_entity_table_normalized_key;
create unique index if not exists entity_alias_scoped_idx
  on entity_alias (entity_table, scope, normalized);
