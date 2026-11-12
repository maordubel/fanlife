# The archive keeps one record per match night, refreshes itself daily, and every game opens it (12.11.2026)

**Owner's ask (12.11.2026):** the archive is an encyclopedia of every club — every meeting, all the history — complete, corrected and current, and every feature uses it.

- **One night, one record.** Two deliveries of the same match (same day, same two numbers) are one match: `lib/clubs/one-night.ts` keeps the best record and lets an *approved* twin lend what it lacks. Two scores on one day are a conflict for a person, never merged. The compiler reports each fold as `SAME_MATCH_FOLDED`.
- **The league feed is daily and accumulates.** `scripts/ingest/clubs/league-lineups.ts` runs in `research-daily.yml` for every club with `ingest.json`; it adds nights, never drops an approved one, and records scorers and positions only where 365Scores and LiveScore agree.
- **A club that plays no UEFA football says so** (`"uefa": false` in `ingest.json`), so the daily report raises no false alarm.
- **Every game opens the archive through the door.** Link with `lib/clubs/archive-link.ts` (`player`, `match`/`on`/`score`, `name`/`year`); the archive resolves it with `lib/clubs/archive-door.ts` and searches the name when it holds no entry — a game's link never ends on a 404.
- **Research deliveries keep their raw files** under `research-data/<wave>/` and are turned into pack waves by a script that applies the two-publisher rule per touch (`scripts/club-research/integrate-caf-2026-11-12.py` is the model).
