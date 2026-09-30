# ויקיפועל — importing the whole wiki

The narrow `--source wiki` pass reads a few categories with a hard ceiling, to build the
first questions from. This is the other job: **every page, complete content, run it again
tomorrow and it updates rather than duplicates.**

## Running it

```bash
# everything, to disk, no database and no credentials
npm run wiki:corpus -- --dry-run

# a smoke test first — 40 pages
npm run wiki:corpus -- --dry-run --limit 40

# articles only, rather than every namespace
npm run wiki:corpus -- --namespaces 0

# the real thing, into Supabase
NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run wiki:corpus

# no network at all — from a Special:Export file
npm run wiki:corpus -- --dump export.xml --dry-run

# ignore the checkpoint and start over
npm run wiki:corpus -- --fresh
```

Environment: `WIKI_BASE_URL` (default `https://wiki.red-fans.com`), `WIKI_DELAY_MS`
(default 1200 — politeness between requests), `WIKI_USER_AGENT`.

## What it does that a naive importer does not

**Discovery goes past the cap.** `list=allpages` with `aplimit=max` returns 500 for an
anonymous client and 5,000 for a bot. Neither is a stopping point — the API answers a
capped slice plus a cursor, and the only correct read follows `apcontinue` until there is
none. Discovery is an async generator, so a wiki of any size streams through in flat
memory and content starts landing while discovery is still running.

**Namespaces are walked one at a time.** `apnamespace` takes exactly one value. Passing
several reads only the first — a bug that looks like a complete import and is missing
most of the wiki. With no `--namespaces` the importer asks the wiki for its own list and
walks all of them.

**Paginated property lists are merged.** This is the one that quietly loses data:
`prop=links` is capped too. A page with 700 links answers with 500 and a `plcontinue`,
and a client that reads `query.pages` once stores a page whose graph is missing 200 edges
and looks perfectly fine. The batch is re-requested and the lists are merged per page.

**A refusal is not retried.** Network failures, 429 and 5xx back off and retry, honouring
`Retry-After`. 403 and 404 do not. Retrying a refusal is how a polite importer turns into
a battering ram, and this project documents a blocked source rather than working around
it (rule 11).

**It checkpoints.** Every batch writes its position, so a run that dies at page 4,000 of
6,000 resumes there.

**It compares before it writes.** A page whose content hash is unchanged has its
`last_seen_at` touched and nothing else. The second run of an unchanged wiki writes no
content at all and says so.

## Where it lands

One row per page in `raw_wiki_page`, keyed on the wiki's own `page_id` — see
`supabase/migrations/20260906090000_wiki_corpus.sql` for why the key is the id and not
the title. Every row carries the original URL, the page id, the complete unmodified
wikitext, its hash, the revision id/timestamp/user/comment, and the API's own resolved
`categories`, `links` and `images`.

Two views make the result readable rather than a number:

- `v_wiki_corpus_summary` — pages, redirects, empties and bytes per namespace.
- `v_wiki_category_sizes` — every category and how many pages are in it. This is how you
  check the import was complete: the songs, the seasons and the matches all arrive as
  categories, and their sizes are the answer to "did we get everything".

## On songs

The wiki's richest material is the songs, and a song page is mostly lyrics. The raw text
is stored because provenance and idempotency both need the original — but a question must
be built from a song's **metadata**: its title, the tune it is set to, who it is about.
The templates in `lib/game/trivia.ts` are written that way and should stay that way. No
question, explanation or share card should print verses.

## Verification

`tests/wiki-corpus.test.ts` runs the real importer against an in-process MediaWiki that
enforces the constraints the real one does: 1,200 pages behind a 500-per-response cap,
a page with 700 links behind a property cursor, separate namespace walks, and a 429 on
the first request of every shape so the retry path runs on every test run. It asserts
discovery completeness, content fidelity, list merging, the checkpoint, and — twice —
that a second run inserts nothing.

## Status against the live wiki, 1.9.2026

The importer **has not yet completed a run against `wiki.red-fans.com`**, and the reason
matters:

```
$ npm run wiki:corpus -- --dry-run --limit 40
MediaWikiAccessError: request rejected —
  https://wiki.red-fans.com/api.php?...&siprop=namespaces (HTTP 403)
```

Earlier notes in this project record that as "the wiki blocks automated reads". That
claim is not supported. From this container:

```
he.wikipedia.org  403  Host not in allowlist: he.wikipedia.org
en.wikipedia.org  403  Host not in allowlist: en.wikipedia.org
```

The build environment allowlists outbound hosts and neither Wikipedia nor red-fans is on
it, so **it cannot be determined from here whether the wiki refuses API clients at all.**
Run the importer from a machine where the wiki opens in a browser; if the API answers,
`--dry-run` will fill `data/wiki-corpus/pages` with the whole wiki. If it genuinely does
return 403 to clients, use `Special:Export` and `--dump`, which needs no API and no
network.
