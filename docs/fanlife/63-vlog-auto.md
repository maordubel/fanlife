# 63 · I WAS THERE — the automatic episode (4.11.2026)

Owner: *"add VLOG production to the studio, by the settings and design of I WAS THERE, pulling the material straight
from the Drive."* Rules: `scripts/football-stories/matchday/RULES.md` §10.

## The library — `scripts/football-stories/matchday/vlog_auto.py`

```python
make_episode(footage_dir: Path, match: dict, club: dict, notes: str, minutes: float, work_dir: Path, log) -> Path
render(episode: Path, footage_dir: Path, out_dir: Path, log) -> dict
match_from_catalog(club_id: str, match_id: str) -> dict      # catalog row + research claims (build_ledger → pick)
send_telegram(files: list[tuple[Path, str]], log) -> int     # as studio/worker.py send_reel
```

- `match`: a catalog match (`content/generated/stories/<club>.json`, `lib/stories/catalog.ts`) plus `facts` — the
  research claims for that one match (`studio/research.py`: `build_ledger(club, season)` then `pick(ledger, [id])`).
- `club`: `{id, name, accent}` — the accent is the studio palette's `primary` (`scripts/football-stories/palettes.ts`).
- `notes`: lines in the brief's `quote | …` / `press | …` format become claims; any other line is the owner's own
  account, one claim with the id `owner`.
- `footage_dir`: one folder (sub-folders allowed); its name becomes `episode.folder`. Clips, JPG and HEIC stills; a
  folder of stills only works too (art beats, typed cards, a reel without a hook).
- `work_dir` keeps `survey/`, `scout/`, `cache/` (every writer answer, by the hash of its request), `writer.json` (each
  round: problems, model, planned length) and `episode.json`. A resumed job neither measures nor writes twice.
- `render` runs film.py twice (film, `--reel`) in their own processes and returns `{film: {publish, master, preview,
  captions, report, description, thumbnail, frames, qa}, reel: {…}, film_publish, reel_publish, thumbnail}`.

## The checks an automatic episode passes

`validate_episode` (the schema film.py reads; every hand-made episode passes it) · files exist · `in` inside the clip
and no beat longer than its clip can give at 0.55× · the planned length within ±15% of `minutes` (lead + 0.38 s a word +
pauses + tail, fitted on the Bloomfield render: 288 s planned for 290 s cut) · reel 15–45 s · `fact_check` (the studio
fact guard per beat) · `voice_check` (never "I", no subscribe line) · `speech_check` (a voice → muted).

## The manual end-to-end check — `.github/workflows/vlog-auto-test.yml`

Actions → *I WAS THERE · automatic episode (test)* → Run workflow: the Drive folder link, the club id, the catalog
match id (and optionally the length and notes). Or push `scripts/football-stories/matchday/vlog-auto-test.json` with
the same fields on any branch but main. The run fetches the folder, compiles the club packs, makes the episode,
renders, and sends the reel and a Telegram-sized film to the owner's linked chat. The episode, the writer's rounds and
the publish files are the run's artifact; footage and renders are never committed.
