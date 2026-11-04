# Football Stories · Studio v3 — click and make (4.11.2026)

Owner, 4.11.2026: *"less freedom, more decisions to choose from · a film about a specific match, not only a season · all
the edit types · use the Google Drive · really three scripts to choose from · real click and make — varied, smart, free,
thorough."*

## What the owner does
Desk → **05 Studio** (`/master/admin?section=studio`). Every step is a card or a chip:

1. **Club** — only clubs whose archive the research stage can read.
2. **What the film is about** — One match · A tie or a run (2–8 matches, one season) · A whole season · A rivalry.
3. **Pick it** — matches from the club's catalog (Big nights · Finals · Derbies · Europe · All, a season filter, a search),
   a season, or an opponent (derbies first, with the record and the years).
4. **Length** — offered per kind (a match 2–7 min, a season 5–15).
5. **Look** — The Weekly collage · Paper-cut (the Drive paper-cut library) · The archive (warm grain) · Night broadcast
   (footage, cool grade). Each look tells the writer which visuals to use and gives the master its own grade
   (`STYLE_LOOK` in `studio/pipeline.py`).
6. **Feeling** — let the story decide · triumph · heartbreak · underdog · rivalry · nostalgia · drama.
7. **Script** — *Three scripts to choose from* (default) or *Straight to the film*.
8. **Extras** — the club's pictures from the Drive library, the first Reel to Telegram, YouTube visibility.
   **More** (folded): a line for the writer, quotes and headlines, own pictures first, narrator, crowd.

Then **Make it**. With three scripts the film stops after the writer: the job card shows three cards
(Chronicle · From the stands · The turning point — title, hook, opening, chapters, length) and **Make this one** queues
the rest. Free: the writer is Gemini on its free tier, the voice is Kokoro, the render runs in GitHub Actions.

## How it is built
- **Catalog**: `python3 -m studio.seasons` (from `scripts/football-stories`) writes `content/generated/stories/<club>.json`
  (every readable match with tags final/europe/derby/big-score/penalties/extra-time/goals, and every opponent) and the
  index `content/generated/stories-seasons.json`, with the research stage's own reader — so nothing offered can fail at
  research. `GET /api/master/stories/catalog` serves it filtered (owner only, ≤120 rows).
- **The brief** (`lib/stories/jobs.ts`): `kind`, `match_ids`, `opponent`, `tone`, `scripts`, `choice`, `drive`,
  `reel_to_telegram`. The POST route checks every match id and opponent against the catalog again and sets the season
  (a rivalry spans `first–last`).
- **Research**: `research.pick` keeps the chosen matches and counts the summary again; `research.rivalry_ledger` reads every
  season's meetings with one opponent and adds an "All competitions" total.
- **Three scripts**: `writer.write_options` — one script per angle, each through the same checks; at least one must pass.
  Saved as `script-option-<n>.json` (kept between runs by the job cache); the owner's pick (`choose_script`) resumes from it.
- **Drive**: `worker.fetch_drive` takes up to 24 pictures from the club's own folders in the public Drive library
  (`docs/fanlife/drive-library/inventory.json`; `drive_folder_fits` never takes another club's folder), on every run —
  a resumed film starts on a clean machine. `pipeline.ingest_art` turns them into a beat set.
- **Measured on the first full film** (AEK 2002/03, 7 min requested, 8.83 min delivered): a film is planned at
  `FILM_WORDS_PER_MINUTE = 122` (cards, pauses and the end card take time the voice does not); a caption longer than two
  lines is split, never printed on a 60-character line.

Tests: `tests/stories-v3.test.ts`, `scripts/football-stories/studio/tests/test_studio_v3.py`.

## Sound (owner, 4.11.2026: "the effects are too loud")
Measured on the Kokoro narrator: the old stamp was 3 dB louder than the voice, and a card fired two. Now
(`studio/audio.py`): each effect is levelled to its own distance under the narrator's measured speech loudness
(`FX_UNDER_VOICE_DB`: stamp 14 dB, paper 17, whoosh 18, pop 19, the end sting 10), thinned (`thin_cues`: no repeat inside
its gap, no two effects within 0.3 s, at most 22 a minute), varied ±1.5 dB, rounded at the top, given the room's short
reverb and ducked ~3 dB more while he speaks; the bus ends in a limiter before −14 LUFS. The stamp is a felt knock, not a
sub-bass boom. I WAS THERE (`matchday/film.py`) levels its own hits (boom, whistle, heart, tick, keys) the same way.

## Drive: every film scans the library for its own packs (owner, 4.11.2026)
`studio/drive_scan.py`: the worker lists the owner's shared library live from the runner (each public folder's embedded
view, no key — `matchday/drive_fetch.py`), merged with the last static listing, and scores every folder against the
film: the club and the opponent as names ("Maccabi Tel Aviv" is not "Hapoel Tel Aviv"), the years, the topic's words, the
competition, CLASSIFIED for that series. Folders above the bar are the film's **targeted packs** (at most three; a
sub-folder belongs to its pack); a folder pasted in the wizard ("Drive folder for this story") always is one. A pack is
used as the owner made it — press photographs with real faces included (owner, 4.11.2026) — its README / ASSET_INDEX /
PROMPTS go to the writer as notes, transparent cut-outs sit on paper, HEIC stills are read. Then the club's own folders
from the general library. `STORIES_DRIVE_SCAN=1` (set in the worker workflow) turns the live scan on; tests use the
static listing only.

## When Google's free writer is busy (4.11.2026)

The owner's film failed with `SCRIPT_INVALID` although nothing was wrong with it: three scripts in a row spent the
free per-minute quota, every model answered 429 in seconds, two answered 404 and two 503. `studio/gemini.py → generate()`:
- a per-minute 429 waits as long as Google's `RetryInfo` asks, then the same model again; a 503/5xx backs off 15·30·60·120 s;
- a per-day 429, a quota of 0, a 404 or a 403 rules the model out for the run; `gemma-3-27b-it` (open model, large free
  quota; system text folded into the user turn, no JSON mode, 8k output) is the last resort — the checks decide;
- only when every model is ruled out → `WRITER_QUOTA_DAY`, or after 20 minutes of waiting → `WRITER_BUSY`.
The worker turns both into a film that **waits** (`finish state:'waiting'` → `queued` + `notBefore`): the day's quota
resets at midnight Pacific (+7 min), a busy writer gets 20 minutes. The desk says when it starts again and offers
**Try now**. Two scripts already written are enough to choose from; every answer is cached, so a waiting film never asks twice.
