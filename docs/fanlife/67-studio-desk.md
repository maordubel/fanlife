# Football Stories · the studio desk (4.11.2026)

Owner: *"Three directors… each proposes the next film and the script he loves most, each time a different club, a
different event. Split the studio: documentary, CLASSIFIED, VLOG, marketing — each in its own tab, with an information
banner: when it can be run and when not."*

## The tabs — Desk → 05 Studio → `?section=studio&view=…`
| view | makes | its banner checks |
|---|---|---|
| `docs` | the click-and-make documentary (doc 60); three scripts = one per director | worker heartbeat · writer key + jobs waiting for Google's quota (until when) · storage |
| `classified` | a whole CLASSIFIED FILE (doc 65) — job kind `classified` | worker · storage · the episode file and its draft · panels in the Drive map (a gap only warns) · FILE not already in production · **the owner's approval tick** |
| `vlog` | I WAS THERE from Drive footage (doc 63) — job kind `vlog` | worker · writer · storage · a match chosen · a Drive folder/file link |
| `marketing` | finished films → Facebook/Instagram/X/TikTok + Telegram packs (doc 61), Shorts/Reels, today's social plan | finished films · social runner lights · autopublish switch · Telegram · the plan's database |
| `directors` | the house soul, the three directors and their latest pitches; Make this film / Pass; Ask for new pitches | writer · pitch desk (waiting until / asked / failed / last round) · the listener when a round was asked |
| `status` | the lights, the queue, the last Drive scans, recent failures in plain words | worker · writer · storage |

Every light is computed from real state (`lib/stories/banners.ts`); a fact the studio could not read is **Not connected**,
never "no" or zero.

## Jobs
`Job.kind` = `film` (absent) · `classified` · `vlog`, with `spec` (lib/stories/jobs.ts):
- **classified**: `{file, episode, script_version, approved:true, approved_by, approved_at, telegram}` — refused without the
  tick or when the draft on screen is not the draft in the repository; the worker (`studio/kinds.py`) stops with
  `SCRIPT_CHANGED` if it changed after the click. Never uploaded to YouTube; a DRAFT to Telegram.
- **vlog**: `{club_id, match (from the catalog), drive_link, notes ≤4000, minutes 2–10, telegram}`.
- A film from a pitch carries `brief.lead_director`: his script is listed first (`leadFirst`, `n` never renumbered).

## Pitches
`studio/pitch.py` (daily 04:23 UTC by `.github/workflows/stories-pitch.yml`, and on request: the studio stores the
request, the listener's `peek` answers `pitch:true` once, the listener starts the workflow). Worker ops `pitch_history`
and `pitch_save`; files `stories/pitches/<YYYY-MM-DD>.json` and `studio/pitch-desk.json`. One pitch per director per
round, three clubs, no event filmed or pitched in the last 14 days. A spent writer ends the round as `waiting` and the
listener starts it again after the quota resets.

Tests: `tests/stories-desk.test.ts`, `scripts/football-stories/studio/tests/test_studio_desk.py`.
