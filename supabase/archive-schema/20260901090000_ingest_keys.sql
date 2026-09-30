-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- Ingestion support: natural keys that make every importer run idempotent.

-- A source is identified by where it came from, so re-running the importer
-- attaches facts to the same source row instead of creating a new one.
alter table source add column if not exists natural_key text;
update source set natural_key = coalesce(natural_key, id::text) where natural_key is null;
alter table source alter column natural_key set not null;
create unique index if not exists source_natural_key_idx on source (natural_key);

-- Data issues are deduped by content so a repeated run does not multiply them.
alter table data_issue add column if not exists dedupe_key text;
create unique index if not exists data_issue_dedupe_idx on data_issue (dedupe_key)
  where dedupe_key is not null;

-- match upserts target the natural key; the expression index created with the table
-- cannot be used by ON CONFLICT, so restate it over a stored, non-null stage.
alter table match alter column stage set default '';
update match set stage = '' where stage is null;
alter table match alter column stage set not null;
drop index if exists match_natural_key;
create unique index if not exists match_natural_key on match
  (season_id, competition_id, home_club_id, away_club_id, stage);

-- entity_alias upserts target (entity_table, normalized), already unique.
-- squad_membership, match_event, trophy and the slug columns are already unique.

comment on column source.natural_key is
  'Stable importer key, e.g. wiki:<title>@<revision> or manual:<file>. Drives idempotency.';
