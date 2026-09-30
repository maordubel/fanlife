-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- The Worker (הפועל) — core historical data engine
-- DRAFT. Not applied. Review before promoting to supabase/migrations/<timestamp>_core_schema.sql
-- House rules: RLS on every table · append-only event log · provenance on every fact ·
--              server-authoritative scoring (SECURITY DEFINER RPC) · idempotency keys.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- =====================================================================
-- 0. PROVENANCE  — every fact must be able to answer "who says so?"
-- =====================================================================

create type source_kind as enum ('wiki','book','newspaper','video','official','manual','other');

create table source (
  id            uuid primary key default gen_random_uuid(),
  kind          source_kind not null,
  title         text not null,
  url           text,
  page_title    text,              -- wiki page title
  revision_id   bigint,            -- wiki revision, so a fact is pinned to a version
  retrieved_at  timestamptz,
  note          text,
  created_at    timestamptz not null default now()
);

-- confidence: 0 unverified · 1 single source · 2 cross-checked · 3 human-verified
-- Only confidence >= 2 is allowed to feed the trivia generator.
create domain confidence as smallint check (value between 0 and 3);

-- Disputes / known-bad data. Fed by the ingest reports and by in-app "report an error".
create table data_issue (
  id           uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id    uuid not null,
  field        text,
  severity     smallint not null default 2,
  description  text not null,
  reported_by  uuid,               -- auth.users, null = system
  status       text not null default 'open',   -- open | fixed | wontfix
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- 1. REFERENCE ENTITIES
-- =====================================================================

create table club (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_he     text not null,
  name_en     text,
  city        text,
  is_us       boolean not null default false,   -- true only for Hapoel Tel Aviv
  crest_media uuid,
  created_at  timestamptz not null default now()
);

create table venue (
  id       uuid primary key default gen_random_uuid(),
  slug     text unique not null,
  name_he  text not null,
  city     text,
  opened   int,
  closed   int
);

create type competition_type as enum ('league','national_cup','league_cup','europe','friendly','other');

create table competition (
  id       uuid primary key default gen_random_uuid(),
  slug     text unique not null,
  name_he  text not null,
  type     competition_type not null,
  tier     smallint                                  -- 1 = top flight
);

-- A season is competition-independent: '2001/02'.
create table season (
  id          uuid primary key default gen_random_uuid(),
  label       text unique not null,                  -- canonical '2001/02'
  start_year  int not null,
  end_year    int not null,
  era_id      uuid,                                  -- fk added below
  source_id   uuid references source(id),
  confidence  confidence not null default 1
);

-- What we played in that season, and where we finished.
create table season_competition (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references season(id) on delete cascade,
  competition_id uuid not null references competition(id),
  final_position smallint,
  reached_stage  text,                               -- 'גמר', '1/4 גמר', ...
  source_id      uuid references source(id),
  confidence     confidence not null default 1,
  unique (season_id, competition_id)
);

-- Eras drive the "unlockable eras" progression later. Cheap now, expensive to retrofit.
create table era (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_he     text not null,
  start_year  int not null,
  end_year    int,
  sort_order  smallint not null
);
alter table season add constraint season_era_fk foreign key (era_id) references era(id);

-- =====================================================================
-- 2. PEOPLE  — players and coaches are the same table; role lives on the stint
-- =====================================================================

create table person (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  full_name_he  text not null,
  full_name_en  text,
  birth_date    date,
  death_date    date,
  birth_place   text,
  nationalities text[] not null default '{}',
  is_youth_product boolean,                          -- "שחקן בית"
  bio_he        text,
  portrait_media uuid,
  wiki_page     text,
  source_id     uuid references source(id),
  confidence    confidence not null default 1,
  created_at    timestamptz not null default now()
);

-- Explicit alias table. Never fuzzy-match Hebrew names.
create table entity_alias (
  id           uuid primary key default gen_random_uuid(),
  entity_table text not null,                        -- 'person' | 'club' | 'venue' | 'competition'
  entity_id    uuid not null,
  alias        text not null,                        -- raw, as written in the source
  normalized   text not null,                        -- stripped of gershayim/quotes/diacritics
  note         text,
  unique (entity_table, normalized)
);
create index entity_alias_norm_idx on entity_alias using gin (normalized gin_trgm_ops);

create type person_role as enum ('player','head_coach','assistant_coach','gk_coach','captain','chairman','other');

create table person_stint (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references person(id) on delete cascade,
  club_id    uuid not null references club(id),
  role       person_role not null,
  from_date  date,
  to_date    date,
  from_season uuid references season(id),
  to_season   uuid references season(id),
  note       text,
  source_id  uuid references source(id),
  confidence confidence not null default 1
);
create index person_stint_person_idx on person_stint (person_id, role);

-- =====================================================================
-- 3. SQUADS  — the backbone of shirt numbers and the lineup game
-- =====================================================================

create type position_code as enum ('GK','DF','MF','FW','UNK');

create table squad_membership (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references person(id) on delete cascade,
  season_id     uuid not null references season(id) on delete cascade,
  club_id       uuid not null references club(id),
  shirt_number  smallint,
  position      position_code not null default 'UNK',
  on_loan       boolean not null default false,
  joined_mid_season boolean not null default false,
  appearances   smallint,
  goals         smallint,
  source_id     uuid references source(id),
  confidence    confidence not null default 1,
  unique (person_id, season_id, club_id)
);
-- Duplicate shirt numbers happen in real history (mid-season transfers). Do NOT make this unique.
-- Monitor it instead: see v_dq_duplicate_shirt_numbers below.
create index squad_shirt_idx on squad_membership (season_id, shirt_number);

-- =====================================================================
-- 4. MATCHES
-- =====================================================================

create type match_status as enum ('played','abandoned','postponed','awarded','unknown');

create table match (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references season(id),
  competition_id uuid not null references competition(id),
  stage          text,                               -- 'מחזור 12', '1/4 גמר משחק 1'
  played_on      date,
  kickoff_at     timestamptz,
  kickoff_confirmed boolean not null default false,  -- never invent a kickoff time
  home_club_id   uuid not null references club(id),
  away_club_id   uuid not null references club(id),
  venue_id       uuid references venue(id),
  home_score     smallint,
  away_score     smallint,
  status         match_status not null default 'unknown',
  attendance     int,
  is_derby       boolean not null default false,     -- drives Derby mode later
  wiki_page      text,
  source_id      uuid references source(id),
  confidence     confidence not null default 1,
  check (home_club_id <> away_club_id)
);
create index match_season_idx on match (season_id, played_on);
create unique index match_natural_key on match (season_id, competition_id, home_club_id, away_club_id, coalesce(stage,''));

create type lineup_role as enum ('start','sub_in','unused_sub');

create table match_lineup (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references match(id) on delete cascade,
  person_id    uuid not null references person(id),
  club_id      uuid not null references club(id),
  role         lineup_role not null,
  position     position_code not null default 'UNK',
  shirt_number smallint,
  minute_on    smallint,
  minute_off   smallint,
  is_captain   boolean not null default false,
  source_id    uuid references source(id),
  confidence   confidence not null default 1,
  unique (match_id, person_id)
);

-- Append-only. Corrections are new rows. Enforced by trigger, not by convention.
create type event_type as enum
  ('goal','own_goal','penalty_goal','penalty_miss','assist','yellow','second_yellow','red','sub','var_review');

create table match_event (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references match(id) on delete cascade,
  seq             int not null,                      -- assigned order, never wall clock
  minute          smallint,
  minute_extra    smallint,
  type            event_type not null,
  club_id         uuid references club(id),
  person_id       uuid references person(id),
  related_person_id uuid references person(id),      -- assist provider / player subbed off
  voids_event_id  uuid references match_event(id),   -- corrections point at the old row
  source_id       uuid references source(id),
  confidence      confidence not null default 1,
  created_at      timestamptz not null default now(),
  unique (match_id, seq)
);

create or replace function match_event_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'match_event is append-only: insert a correcting row with voids_event_id instead';
end $$;

create trigger match_event_no_update before update on match_event
  for each row execute function match_event_immutable();
create trigger match_event_no_delete before delete on match_event
  for each row execute function match_event_immutable();

-- Effective (non-voided) events. Everything downstream reads this, never the raw table.
create view v_match_event_effective as
  select e.* from match_event e
  where not exists (select 1 from match_event c where c.voids_event_id = e.id);

-- =====================================================================
-- 5. TROPHIES · KITS · MOMENTS
-- =====================================================================

create type trophy_result as enum ('won','runner_up','semi_final','promoted','relegated');

create table trophy (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references competition(id),
  season_id      uuid not null references season(id),
  club_id        uuid not null references club(id),
  result         trophy_result not null,
  final_match_id uuid references match(id),
  note_he        text,
  source_id      uuid references source(id),
  confidence     confidence not null default 1,
  unique (competition_id, season_id, club_id)
);

create type kit_type as enum ('home','away','third','gk','special');

-- spec drives the kit-design / reconstruction game. Vector spec, not a photo.
create table kit (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references club(id),
  season_from   uuid not null references season(id),
  season_to     uuid references season(id),
  type          kit_type not null,
  manufacturer  text,
  sponsor       text,
  primary_color text,                                -- hex
  secondary_color text,
  detail_color  text,
  pattern       text,                                -- 'solid' | 'stripes' | 'hoops' | 'sash' ...
  spec          jsonb not null default '{}'::jsonb,  -- collar, sleeves, crest position, number font
  description_he text,
  hero_media    uuid,
  source_id     uuid references source(id),
  confidence    confidence not null default 1
);

create table moment (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title_he     text not null,
  happened_on  date,
  season_id    uuid references season(id),
  match_id     uuid references match(id),
  era_id       uuid references era(id),
  category     text,                                 -- 'derby' | 'europe' | 'title' | 'farewell'
  body_he      text not null,
  hero_media   uuid,
  source_id    uuid references source(id),
  confidence   confidence not null default 1
);

create table moment_person (
  moment_id uuid not null references moment(id) on delete cascade,
  person_id uuid not null references person(id) on delete cascade,
  primary key (moment_id, person_id)
);

-- =====================================================================
-- 6. MEDIA  — nothing ships without a rights status
-- =====================================================================

create type media_kind   as enum ('photo','crest','kit_render','illustration','video','audio');
create type rights_status as enum ('owned','licensed','permission','public_domain','fair_use_claimed','unknown');

create table media (
  id            uuid primary key default gen_random_uuid(),
  kind          media_kind not null,
  storage_path  text not null,                       -- Supabase Storage
  width         int,
  height        int,
  credit        text,
  license       text,
  source_url    text,
  rights        rights_status not null default 'unknown',
  usable_in_app boolean not null default false,      -- false until rights are settled
  alt_he        text not null,                       -- WCAG: never optional
  created_at    timestamptz not null default now()
);
-- Guard: unknown rights can never be marked usable.
alter table media add constraint media_rights_guard
  check (usable_in_app = false or rights <> 'unknown');

-- =====================================================================
-- 7. TRIVIA  — generated from the DB, then human-verified
-- =====================================================================

create type question_type   as enum ('mcq','true_false','ordering','image_mcq');
create type question_status as enum ('draft','review','verified','retired');

-- A template turns one SQL shape into hundreds of questions.
create table trivia_template (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name_he       text not null,
  type          question_type not null,
  prompt_he     text not null,                       -- 'מי לבש את חולצה מספר {n} בעונת {season}?'
  answer_sql    text not null,                       -- returns (answer, distractor_pool)
  difficulty    smallint not null default 2,
  min_confidence confidence not null default 2,      -- never generate from unverified facts
  enabled       boolean not null default true
);

create table trivia_question (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid references trivia_template(id),
  type           question_type not null,
  question_he    text not null,
  difficulty     smallint not null default 2,
  era_id         uuid references era(id),
  subject_table  text,                               -- what the question is about, for dedup
  subject_id     uuid,
  media_id       uuid references media(id),
  explanation_he text,
  source_id      uuid references source(id),
  status         question_status not null default 'draft',
  verified_by    uuid,
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index trivia_question_pool_idx on trivia_question (status, difficulty, era_id);

-- Answers live in their own table so the client can be served the question WITHOUT them.
create table trivia_answer (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references trivia_question(id) on delete cascade,
  ordinal     smallint not null,
  text_he     text not null,
  is_correct  boolean not null,
  unique (question_id, ordinal)
);

-- =====================================================================
-- 8. PLAYERS OF THE GAME (users) · progress · scoring
-- =====================================================================

create table app_user (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_media uuid references media(id),
  created_at   timestamptz not null default now()
);

create type game_mode as enum ('trivia','memory','lineup','kit','derby');

create table game_session (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references app_user(id) on delete cascade,
  mode        game_mode not null,
  era_id      uuid references era(id),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  score       int not null default 0,
  max_streak  smallint not null default 0
);

create table answer_log (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references game_session(id) on delete cascade,
  user_id         uuid not null references app_user(id) on delete cascade,
  question_id     uuid references trivia_question(id),
  given_answer_id uuid references trivia_answer(id),
  is_correct      boolean not null,
  ms_taken        int,
  points          int not null default 0,
  idempotency_key text not null,                     -- 'session:question' — a retry returns the first result
  created_at      timestamptz not null default now(),
  unique (idempotency_key)
);

create table user_progress (
  user_id      uuid primary key references app_user(id) on delete cascade,
  xp           int not null default 0,
  level        smallint not null default 1,
  unlocked_eras uuid[] not null default '{}',
  updated_at   timestamptz not null default now()
);

-- =====================================================================
-- 9. INGESTION  — raw first, parse second, never parse twice
-- =====================================================================

create table raw_wiki_page (
  id           uuid primary key default gen_random_uuid(),
  page_id      bigint,
  title        text not null,
  namespace    int not null default 0,
  revision_id  bigint,
  wikitext     text not null,
  content_hash text not null,
  fetched_at   timestamptz not null default now(),
  unique (title, revision_id)
);

create table ingest_run (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,                         -- 'wiki_fetch' | 'parse_players' | ...
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean,
  stats       jsonb not null default '{}'::jsonb,    -- rows in/out/recovered/skipped
  report_md   text                                   -- the data-quality report someone must read
);

-- =====================================================================
-- 10. DATA-QUALITY VIEWS  — the things that fail quietly
-- =====================================================================

create view v_dq_duplicate_shirt_numbers as
  select season_id, shirt_number, count(*) n
  from squad_membership where shirt_number is not null
  group by 1,2 having count(*) > 1;

create view v_dq_person_no_stint as
  select p.id, p.full_name_he from person p
  where not exists (select 1 from person_stint s where s.person_id = p.id);

create view v_dq_season_no_competition as
  select s.id, s.label from season s
  where not exists (select 1 from season_competition sc where sc.season_id = s.id);

create view v_dq_match_no_result as
  select id, played_on, stage from match
  where status = 'played' and (home_score is null or away_score is null);

create view v_dq_low_confidence_in_trivia as
  select q.id, q.question_he from trivia_question q
  where q.status = 'verified' and q.source_id is null;

create view v_dq_media_unrights as
  select id, storage_path, kind from media where rights = 'unknown';

-- =====================================================================
-- 11. RLS  — mandatory. Content is world-readable, user data is not.
-- =====================================================================

-- Public read-only content tables.
do $$
declare t text;
begin
  foreach t in array array[
    'club','venue','competition','season','season_competition','era','person','entity_alias',
    'person_stint','squad_membership','match','match_lineup','match_event','trophy','kit',
    'moment','moment_person','media','trivia_question','source'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format($f$create policy %I_read on %I for select using (true)$f$, t, t);
  end loop;
end $$;

-- trivia_answer is NOT publicly readable — that would ship the answers to the client.
alter table trivia_answer enable row level security;
-- (no select policy: reachable only through SECURITY DEFINER RPCs)

alter table trivia_template enable row level security;
alter table raw_wiki_page   enable row level security;
alter table ingest_run      enable row level security;
alter table data_issue      enable row level security;
-- (no policies: service_role only)

alter table app_user      enable row level security;
alter table game_session  enable row level security;
alter table answer_log    enable row level security;
alter table user_progress enable row level security;

create policy app_user_self on app_user
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy game_session_self on game_session
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy answer_log_self on answer_log
  for select using (user_id = auth.uid());     -- writes go through the RPC only
create policy user_progress_self on user_progress
  for select using (user_id = auth.uid());

-- =====================================================================
-- 12. SERVER AUTHORITY  — scoring happens in Postgres, never in the client
-- =====================================================================

-- Deal a question without its answers.
create or replace function rpc_next_question(p_session uuid)
returns table (question_id uuid, question_he text, media_id uuid, options jsonb)
language plpgsql security definer set search_path = public as $$
begin
  -- ownership check, exclude already-answered questions, pick by difficulty/era, return options
  -- without is_correct. Implementation in a later migration.
  raise exception 'not implemented';
end $$;

-- Grade an answer. Idempotent: the same (session, question) always returns the first result.
create or replace function rpc_submit_answer(
  p_session uuid, p_question uuid, p_answer uuid, p_ms int
) returns table (is_correct boolean, correct_answer_id uuid, points int, explanation_he text)
language plpgsql security definer set search_path = public as $$
begin
  raise exception 'not implemented';
end $$;

revoke all on function rpc_next_question(uuid)              from public;
revoke all on function rpc_submit_answer(uuid,uuid,uuid,int) from public;
grant execute on function rpc_next_question(uuid)              to authenticated;
grant execute on function rpc_submit_answer(uuid,uuid,uuid,int) to authenticated;
