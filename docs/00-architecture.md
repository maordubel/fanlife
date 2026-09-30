# The Worker (הפועל) — Data Engine Architecture

Working title: **The Worker** · Club: Hapoel Tel Aviv (football only) · UI language: Hebrew, RTL
Status: pre-build. No screens, no game modes implemented.
Date: 2026-08-31

---

## A. Repository audit

`github.com/maordubel/The-Worker` — **empty**. Cloned successfully; `main` is an unborn branch, zero commits, zero files. Nothing to inherit, nothing to migrate, no legacy decisions to work around.

That is the best possible starting state, and it means the stack is a decision rather than an audit finding. Adopt the house stack unchanged:

| Layer | Choice | Note |
|---|---|---|
| Framework | Next.js (App Router) + React | server components for content, client only for game loops |
| Language | TypeScript, `strict` | |
| Styling | Tailwind + design tokens | tokens from `brand-concept`, not yet run |
| Direction | **RTL-first**, LTR supported | Hebrew UI — logical properties everywhere (`ps-`/`pe-`) |
| Data | Supabase Postgres + RLS + Storage | one project, free tier |
| Server logic | `SECURITY DEFINER` RPC in Postgres | scoring must not live in the client |
| Fetching | TanStack Query | |
| Hosting | Vercel | Preview per PR |
| Errors | Sentry | from day one |
| CI | GitHub Actions: lint · typecheck · test · build | `main` protected |

**Scaffolding to create in the first commit** (none of it exists yet):

```
.github/workflows/ci.yml      .env.example          CLAUDE.md
.claude/skills/frontend-standards/   (project-local copy)
docs/                          supabase/migrations/
src/app/  src/components/  src/lib/  src/data/
scripts/ingest/               content/              tests/
```

Branches: `main` (protected) · `dev` (integration) · `feat/*`.

---

## B. Wiki / data audit

**The source.** `wiki.red-fans.com` — "ויקיפועל", a Hebrew MediaWiki run by the Red Fans community. It is the single best Hapoel Tel Aviv archive in existence and it is unusually well structured for a fan wiki: it uses categories, templates and a consistent page-naming convention.

**Access status — read this first.** The site sits behind Cloudflare bot protection. Server-side fetches (`api.php` and `index.php`) return **403**, and the browser route was unavailable when your machine went offline mid-session. So the structural map below is derived from indexed page titles, not from a crawl. It is accurate about *what exists*; it is not yet a page inventory with counts.

**This is the single highest-leverage action on the whole project: contact the Red Fans wiki owners.** Ask for (1) permission to use the content in the game, (2) a `Special:Export` XML dump or database dump, (3) an attribution wording they are happy with. A fan project asking a fan community usually gets a yes, and it removes the 403 problem, the scraping-ethics problem and the licensing problem in one email. Every scraping alternative is worse.

### Structure observed

| Layer | Example page | Value |
|---|---|---|
| Portal | `פורטל:כדורגל` | entry point; **the wiki also covers basketball — everything must be filtered to `(כדורגל)`** |
| Club | `הפועל תל אביב (כדורגל)` + `/היסטוריה` | club-level narrative, honours |
| Seasons | `קטגוריה:עונות (כדורגל)` | one page per season |
| Squads | `קטגוריה:סגל הפועל ת"א (כדורגל) 2025/26` | **per-season squad categories — the backbone of the lineup and shirt-number games** |
| Players | `קטגוריה:שחקני הפועל תל אביב (כדורגל)`, `שחקנים זרים`, `שחקני בית` | player pages with infoboxes; foreign / academy splits are free metadata |
| Coaches | `מאמני הפועל תל אביב (כדורגל)` | list page, tabular |
| Captains | `רשימת קפטנים` | list page, tabular |
| Matches | `עונת 2001/02 (כדורגל) גביע אופ"א 1/4 גמר משחק 1` | **individual match pages with a parseable title convention** |
| Competitions | `גביע המדינה בכדורגל` | |
| Templates | `תבנית:עונות`, `תבנית:שחקן נבחרת באתר ההתאחדות` | infoboxes and navboxes = the machine-readable gold |

### What can be imported automatically vs curated by hand

| Data | Route | Confidence |
|---|---|---|
| Player list, names, aliases | auto — category walk | high |
| Player bio fields (birth, position, nationality) | auto — infobox parse | high |
| Season list, competitions entered, final position | auto — season pages | high |
| Per-season squads + shirt numbers | auto — squad categories, **manual review** | medium |
| Coaches, captains, honours | auto — list-table parse | high |
| Match results (big matches) | auto — match pages | medium |
| Match results (full league history) | **partly manual** — the wiki does not cover every round | low |
| Starting XI per match | **manual, curated per match** | low |
| Goals / scorers per match | semi-auto from match pages, review | low |
| Kits per era | **manual reconstruction** — colours and patterns described in prose, no vector art | low |
| Iconic moments | **manual editorial** | n/a |
| Trivia questions | **generated from the DB**, then human-verified | n/a |
| Photos | **manual, rights-gated** — see risk 2 | n/a |

Cross-check sources for anything that will be shown as fact: Hebrew Wikipedia season articles, the IFA site (`football.org.il`), UEFA archives for European ties, Transfermarkt for squads from ~2000 on. Rule: a fact used in a question needs two agreeing sources or a human tick.

---

## C. Proposed database schema

Full draft SQL: `supabase/migrations/_draft/0001_core_schema.sql` (not applied).

**The principle:** one canonical database of *facts*. Game modes are read-models over it, never their own datasets. Adding Derby mode later must be a query, not an import.

### Entity map

```
                        ┌── era ──┐
                        ▼         ▼
   competition ◄── season_competition ──► season ──► trophy ◄── competition
        ▲                                  │  ▲
        │                                  │  └────────── kit (season_from → season_to)
        │                                  │
      match ────────────────────────────────
        │  ├── venue
        │  ├── club (home / away)
        │  ├── match_lineup ──► person        (start · sub_in · unused_sub, shirt, minutes)
        │  └── match_event  ──► person        (APPEND-ONLY: goal · card · sub · VAR)
        │
   squad_membership ──► person + season       (shirt_number · position · apps · goals)
        │
     person ──► person_stint ──► club         (player · head_coach · captain …)
        │  └── entity_alias                   (explicit Hebrew name aliases)
        │
      moment ──► match / season / era / person[]
        │
      media  (rights-gated) ◄── person · kit · moment · trivia_question
        │
   trivia_template ──generates──► trivia_question ──► trivia_answer  (RLS-hidden)
        │
   source + confidence  ── attached to EVERY fact row
```

### The eight decisions that matter

1. **`person`, not `player` + `coach`.** Amatzia Levkovich played and coached. Two tables would duplicate him and break every query that asks "who was at the club in 1975". Role lives on `person_stint`.

2. **`squad_membership` is the spine.** `(person, season, shirt_number, position)` powers the lineup builder, the memory game's pairs, and the highest-yield trivia templates ("who wore #10 in 1999/00"). Get this table right and three game modes come almost free.

3. **Shirt numbers are NOT unique per season.** Mid-season transfers reuse them, and historical sources disagree. A `UNIQUE` constraint here would force the importer to silently drop real rows. Indexed and *monitored* instead (`v_dq_duplicate_shirt_numbers`).

4. **`match_event` is append-only, enforced by trigger.** Corrections insert a new row with `voids_event_id`. Everything downstream reads `v_match_event_effective`. This is the `football-data` house rule and it is what makes "the archive changed" distinguishable from "the code changed".

5. **Provenance on every fact.** `source_id` + `confidence` (0–3) on every table. Only `confidence >= 2` may feed the trivia generator. A fan wiki has errors; a Hapoel trivia game that states a wrong fact to Hapoel fans is finished on day one. This column is the product's credibility.

6. **`trivia_answer` has RLS enabled and no `SELECT` policy.** The client is served the question and the options through an RPC; `is_correct` never leaves the server. Scoring is `rpc_submit_answer`, `SECURITY DEFINER`, with a `UNIQUE` idempotency key. Without this the game is cheatable from DevTools in ten seconds.

7. **`media.usable_in_app` defaults to `false` and a CHECK forbids `unknown` rights from being usable.** The database refuses to let an un-cleared photo reach the app. Not a process, a constraint.

8. **`era` exists from day one** even though eras are a later feature. Retro-fitting an era column across seasons, moments and questions after content is written is a migration nobody enjoys. It costs one small table now.

### Kits

`kit` stores a **vector spec (`jsonb`)**, not a photo: base colours, pattern, collar, sleeve, sponsor, number font. The kit-design game reads that spec and renders SVG. This makes kits generatable, comparable, and — critically — free of image rights. Photos of kits are reference material for the curator, not app assets.

---

## D. MVP game architecture

### Scope — three modes, one database

| In MVP | Why |
|---|---|
| **טריוויה** — Trivia | The data supports it best; questions are generated, not written |
| **זיכרון** — Memory / matching | Same data, near-zero extra content cost (player ↔ shirt number, player ↔ season, moment ↔ year) |
| **בניית הרכב** — Historical lineup | The emotional core of the product. ~20 curated matches is enough |

| Out of MVP | Why |
|---|---|
| Kit designer | Every kit era is manual vector work. Highest content cost, build it once the engine is proven |
| Derby mode | A filter over `is_derby` — cheap later, distracting now |
| Rankings / progression / unlockable eras | Needs users first. Schema is ready; UI is not MVP |
| Photo galleries | Blocked on image rights |

### MVP data target

- 1 club, all seasons listed with competitions and final positions
- ~600 players with per-season squad membership and shirt numbers
- Coaches, captains, honours — complete
- **20 curated matches** with a full starting XI and goals (title deciders, derbies, the 2001/02 European run)
- **~10 trivia templates → 300+ generated questions → 100 verified for launch**

### Runtime shape

```
Next.js (RSC)                 Supabase Postgres
──────────────                ──────────────────
/                              canonical facts (read-only, RLS: public read)
/trivia    ─ rpc_next_question ─►  question + options, NO answers
           ─ rpc_submit_answer ─►  grade · score · idempotent · answer_log
/memory    ─ server-generated pair set per round
/lineup    ─ match + match_lineup, graded server-side
/admin     ─ service_role only: curation + data-quality reports
```

Content is static-ish and cacheable; only the game loop is dynamic. Everything the player could cheat with is behind an RPC.

### Ingestion workflow

```
1. FETCH    MediaWiki export / api.php  ──►  raw_wiki_page (wikitext + revision_id + hash)
                                             never parsed in this step, never fetched twice
2. PARSE    scripts/ingest/parse-*.ts    ──►  staging rows + source_id + confidence
                                             one adapter file knows MediaWiki. Nothing else does.
3. REPORT   ingest_run.report_md          ──►  coverage, not just errors:
                                             "512 of 600 players have a position"
                                             every recovered row named, no row dropped silently
4. REVIEW   /admin                        ──►  human raises confidence 1 → 3
5. PROMOTE  confidence >= 2               ──►  eligible for trivia generation
6. MONITOR  v_dq_* views                  ──►  duplicates, orphans, unrighted media
```

Re-running any step must be idempotent — natural keys and `ON CONFLICT DO NOTHING` + re-select, never blind inserts.

---

## E. Recommended development order

| # | Step | Output |
|---|---|---|
| 0 | Repo scaffold, CI, Supabase project, `.env.example`, branch protection | green CI on an empty app |
| 1 | **`brand-concept`** — visual identity for The Worker | tokens file, before any UI |
| 2 | **Wiki access + permission** (email the Red Fans owners) | XML dump or a working API route |
| 3 | Apply `0001_core_schema` + generated TS types | live schema with RLS |
| 4 | Ingest layer: raw fetch → `raw_wiki_page` | full wikitext archive, pinned to revisions |
| 5 | Parsers: players → seasons → squads → coaches/captains/honours | canonical rows + first data-quality report |
| 6 | Minimal `/admin` curation screen | confidence raised by hand, issues logged |
| 7 | Curate 20 matches with lineups | the lineup mode's content |
| 8 | Trivia templates + generator + verification pass | 100 verified questions |
| 9 | Game shell: Hebrew RTL, tokens, `rpc_next_question` / `rpc_submit_answer` | trivia playable end to end |
| 10 | Memory mode | second mode, same data |
| 11 | Lineup mode | third mode |
| 12 | `responsive-qa` · WCAG 2.2 AA · Dubel Team footer credit · CWV budget | delivery gate |
| 13 | Ship v1. Then: kits → derby → progression → eras | |

Steps 2–8 are the project. Steps 9–11 are a few days each once the data is right. **The content work is the schedule; the code is not.**

---

## Technical risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Wiki is behind Cloudflare and returns 403 to automated fetching; licence unknown** | **High** | Ask the owners for a dump + permission + attribution wording. Do not build a scraper before that conversation |
| 2 | **Image rights.** Historical Hapoel photos are almost all rights-unknown | **High** | Ship illustration, SVG kit renders and typography instead of photos. `media.usable_in_app` is `false` by default and the DB refuses `unknown` rights. Licensed photos only per explicit agreement |
| 3 | **Accuracy.** A wrong fact in front of Hapoel fans destroys trust permanently | **High** | Two-source rule, `confidence >= 2` gate on generation, visible source per question, in-app "דווח על טעות" writing to `data_issue` |
| 4 | **Hebrew name normalisation.** Gershayim, quotes, transliteration variants, same-name players | Medium | Explicit `entity_alias` table. Normalise for matching, store the raw name for display. Key on `(person, season, position)`. Never fuzzy-match |
| 5 | **Season label formats** — `2001/02`, `2001-02`, `תשס"ב` | Medium | One canonical `season.label`, everything else an alias |
| 6 | **Basketball contamination** — the wiki covers both sports | Medium | Filter every category walk on `(כדורגל)`; assert it in the ingest report |
| 7 | **Answer leakage to the client** | Medium | `trivia_answer` RLS with no read policy; grading only via `SECURITY DEFINER` RPC |
| 8 | **Curation is the real cost.** Kits and lineups are hours of human work each | Medium | Kits and photo galleries deliberately out of MVP |
| 9 | **Supabase free tier: 1 GB storage.** Text is trivial; images are not | Low now | Compress and cap media; re-check before adding a gallery |
| 10 | **Trademark / commercial use.** Club crest and name; Vercel Hobby is non-commercial only | Low now | Fine as a free fan project. The moment it monetises: Vercel Pro (~$20/mo) and a conversation with the club |

---

## Cost warning

Nothing approaches a limit today. Two to watch:

- **Vercel Hobby is non-commercial.** If The Worker ever carries ads, sponsorship or a paid tier, it needs Pro (~$20/mo). This is a terms restriction, not a usage meter — no warning email will arrive.
- **Supabase Free: 1 GB storage / 500 MB DB.** The database will not get close. An image archive would.

Verified against the house cost table (August 2026); re-check before any budget decision.

---

## Upgrade options (proposed, not implemented)

Ranked by impact / effort.

1. **Trivia templates instead of hand-written questions** — already in the schema. Ten SQL shapes over ~600 players and ~100 seasons yields thousands of questions with no writing. Highest leverage in the project.
2. **A public "מקורות" page per fact.** Turning the provenance columns into visible UI converts the project's biggest risk into its differentiator: the only Hapoel game that shows its sources.
3. **Timeline mode from `moment` + `era`** — content already required for the other modes; a fourth mode for almost no extra data.
4. **SVG kit engine before the kit game.** Build the renderer against three kits first; then adding an era is data entry, not design work.
5. **Weekly "משחק היום בהיסטוריה"** — one query over `match.played_on`, a real retention hook, near-zero cost.
6. **Community verification.** Let logged-in fans confirm or dispute facts. Red Fans will do the curation you cannot pay for — but only after the moderation flow exists.

---

## Skill proposal

Two workflows here will recur and are worth packaging once you approve the shape:

- **`wiki-ingest`** — MediaWiki → raw store → parser → data-quality report → confidence gate. Reusable for any wiki-sourced product.
- **`trivia-generation`** — SQL template → question → distractor selection → verification queue. Reusable for any dataset you want to gamify.

I will draft them on your word.
