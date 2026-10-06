# Footballia (footballia.eu) — source note, 6.10.2026

**What it is:** a free archive of 50,000+ full-match videos and a 120,000-player database. Pages: `/teams/<slug>` (paged, `?page=n`, ~40 matches/page), `/matches/<slug>` (title carries teams + season, e.g. "PAOK FC vs. Olympiacos FC 1973-1974"), `/players/<slug>`, `/competitions/<slug>`.

**Checked in the owner's Chrome (rule 11 — a human browser, never the sandbox):**
- `/teams/olympiacos-fc` lists 80 match links on page 1 with team names only — no date or score in the listing; a date needs one request per match page.
- The site answers "under heavy load (queue full)" intermittently (3 of 6 requests). Crawling thousands of match pages would be impolite and unreliable, so nothing was bulk-collected.
- Footer says © 2015 Footballia and there is no reuse licence: treat it as a **pointer source**, not a content source.

**How Fan Life should use it**
1. Link-out only: on a sourced archive entry or derby meeting, "Full match on Footballia ↗" to the exact `/matches/<slug>`. No embedding, no copying text, no thumbnails.
2. Corroboration: team + season + competition from the slug may support a match we already hold from two other publishers; it never creates a match and never counts as one of the two publishers.
3. Match to our canon by (clubs, season, competition); an ambiguous slug is skipped and reported.

**To collect, politely:** per club, the team pages only (≈5–10 pages each), 1 request / 5 s, from the owner's browser; match pages only for matches already in our archive. Needs a go-ahead before any run.
