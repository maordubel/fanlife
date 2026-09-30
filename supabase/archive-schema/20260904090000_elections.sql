-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- The first Hapoel Ussishkin association elections.
--
-- Recorded as a body being elected plus one row per candidate, because that is the
-- shape the association published: every candidate, their declared occupation, and
-- their vote count — not only the winners. A question like "who came second" only
-- exists if the losers are in the database too.

create table if not exists election (
  id                  uuid primary key default gen_random_uuid(),
  association_id      uuid not null references association(id) on delete cascade,
  slug                text not null unique,
  title_he            text not null,
  -- הנהלה · ועדת ביקורת
  body_he             text not null,
  held_on             date,
  date_confirmed      boolean not null default false,
  method_he           text,
  eligible_voters     integer check (eligible_voters is null or eligible_voters >= 0),
  votes_cast          integer check (votes_cast is null or votes_cast >= 0),
  invalid_votes       integer check (invalid_votes is null or invalid_votes >= 0),
  seats               integer check (seats is null or seats > 0),
  -- true when the source itself says "approximately"; the figures are not exact
  figures_approximate boolean not null default false,
  note_he             text,
  source_id           uuid not null references source(id),
  confidence          smallint not null check (confidence between 0 and 3),
  created_at          timestamptz not null default now(),
  -- A ballot cannot be cast by more people than are eligible to vote.
  constraint election_turnout_sane
    check (votes_cast is null or eligible_voters is null or votes_cast <= eligible_voters),
  constraint election_invalid_sane
    check (invalid_votes is null or votes_cast is null or invalid_votes <= votes_cast)
);

create table if not exists election_candidate (
  id             uuid primary key default gen_random_uuid(),
  election_id    uuid not null references election(id) on delete cascade,
  person_slug    text not null,
  person_name_he text not null,
  votes          integer check (votes is null or votes >= 0),
  elected        boolean not null default false,
  rank           integer check (rank is null or rank > 0),
  occupation_he  text,
  prior_role_he  text,
  source_id      uuid not null references source(id),
  confidence     smallint not null check (confidence between 0 and 3),
  created_at     timestamptz not null default now(),
  unique (election_id, person_name_he)
);

create index if not exists election_candidate_election_idx on election_candidate (election_id);
create index if not exists election_candidate_votes_idx on election_candidate (election_id, votes desc);

alter table election enable row level security;
alter table election_candidate enable row level security;

drop policy if exists election_read on election;
create policy election_read on election for select using (true);
drop policy if exists election_candidate_read on election_candidate;
create policy election_candidate_read on election_candidate for select using (true);

-- Data quality: a candidate marked elected with no votes recorded, or a body whose
-- elected count does not match the seats the source stated.
create or replace view v_dq_election_gaps as
select
  e.slug,
  e.body_he,
  e.seats,
  count(*) filter (where c.elected)             as elected_count,
  count(*) filter (where c.votes is null)       as candidates_without_votes,
  sum(c.votes)                                  as total_votes_recorded,
  e.votes_cast
from election e
left join election_candidate c on c.election_id = e.id
group by e.id;

comment on column election.seats is
  'Null when the source does not state how many seats were filled. Never inferred from the number of winners.';
comment on column election.figures_approximate is
  'The association published turnout with "approximately". Stored as given, flagged as approximate.';
