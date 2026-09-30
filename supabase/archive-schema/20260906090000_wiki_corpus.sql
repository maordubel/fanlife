-- ארכיון בלבד (22.9.2026): סכמת הארכיון לפרויקט Supabase נפרד. לא לפרויקט המשותף עם DUBID —
-- היא יוצרת ב-public שמות כלליים. בתיקיית migrations נשאר במקומה קובץ ריק באותו שם.
-- =====================================================================
-- ויקיפועל — the whole wiki, one row per page.
-- =====================================================================
--
-- `raw_wiki_page` already existed, keyed `unique (title, revision_id)`. That key is
-- right for an APPEND-per-revision store and wrong for what the corpus importer needs:
-- Maor asked for repeated runs to UPDATE existing pages rather than create duplicates,
-- and a key that includes the revision makes every new revision a new row by
-- construction.
--
-- So the natural key becomes the wiki's own `page_id`. Two reasons, and the second is
-- the one that matters:
--
--   1. It is stable. A page that is RENAMED keeps its id, so an importer keyed on the
--      title would insert a second row for the same page every time an editor moves it.
--   2. It is the wiki's own identity, which is what the requirement to "store the page
--      id with every imported page" is actually for — it lets a row be traced back to
--      the exact page it came from even after a rename.
--
-- The old key is kept. It costs nothing (NULL revision ids do not collide in Postgres)
-- and it still catches a genuine duplicate insert of the same title at the same
-- revision.
--
-- Nothing here drops or rewrites a column, so an existing table survives the migration
-- with its rows intact.

alter table raw_wiki_page
  -- provenance: where this page came from, exactly
  add column if not exists source_host   text,
  add column if not exists url           text,

  -- what the page IS
  add column if not exists content_model text not null default 'wikitext',
  add column if not exists is_redirect   boolean not null default false,
  add column if not exists redirect_to   text,
  add column if not exists byte_size     int,

  -- the graph around it, straight off the API rather than re-derived from the wikitext.
  -- The parser in `mediawiki.ts` can read categories and links out of the source, but
  -- the API's own lists resolve templates and redirects, so they are the truth and the
  -- parsed ones are the fallback.
  add column if not exists categories    text[] not null default '{}',
  add column if not exists links         text[] not null default '{}',
  add column if not exists images        text[] not null default '{}',

  -- revision metadata
  add column if not exists rev_timestamp timestamptz,
  add column if not exists rev_user      text,
  add column if not exists rev_comment   text,

  -- import bookkeeping. `last_seen_at` moves on every run; `last_changed_at` moves only
  -- when the content hash actually changes, which is what makes "nothing changed" a
  -- cheap and honest answer rather than a rewrite of the whole table.
  add column if not exists first_seen_at   timestamptz not null default now(),
  add column if not exists last_seen_at    timestamptz not null default now(),
  add column if not exists last_changed_at timestamptz not null default now(),
  add column if not exists import_run_id   uuid;

-- The upsert target. Partial, because the column is nullable on the legacy rows and a
-- plain unique index would refuse more than one of them.
create unique index if not exists raw_wiki_page_page_id_key
  on raw_wiki_page (page_id)
  where page_id is not null;

create index if not exists raw_wiki_page_title_idx      on raw_wiki_page (title);
create index if not exists raw_wiki_page_namespace_idx  on raw_wiki_page (namespace);
create index if not exists raw_wiki_page_categories_idx on raw_wiki_page using gin (categories);
create index if not exists raw_wiki_page_links_idx      on raw_wiki_page using gin (links);

-- Hebrew full-text is not a configuration Postgres ships, so `simple` is the honest
-- choice: no stemming, no stop words, exact tokens. It still makes "which pages mention
-- this player" a single indexed query instead of a scan of every page's wikitext.
create index if not exists raw_wiki_page_fts_idx
  on raw_wiki_page using gin (to_tsvector('simple', coalesce(wikitext, '')));

comment on table raw_wiki_page is
  'One row per wiki page, keyed on the wiki''s own page_id. Idempotent: a repeated '
  'import updates in place. wikitext holds the complete original source, unmodified.';

-- =====================================================================
-- What the corpus actually contains — a report, not a guess.
-- =====================================================================
create or replace view v_wiki_corpus_summary as
  select
    namespace,
    count(*)                                          as pages,
    count(*) filter (where is_redirect)                as redirects,
    count(*) filter (where wikitext = '')              as empty_pages,
    sum(coalesce(byte_size, length(wikitext)))         as bytes,
    min(last_seen_at)                                  as oldest_seen,
    max(last_changed_at)                               as newest_change
  from raw_wiki_page
  group by namespace
  order by namespace;

-- Which categories the corpus holds, and how big each one is. This is the view that
-- turns "import everything" into "here is what we got" — the songs, the matches, the
-- seasons all arrive as categories, and their sizes are how anyone judges whether the
-- import was complete.
create or replace view v_wiki_category_sizes as
  select category, count(*) as pages
  from raw_wiki_page, unnest(categories) as category
  where not is_redirect
  group by category
  order by count(*) desc;

alter table raw_wiki_page enable row level security;
-- (no policies: service_role only, exactly as the table already was)
