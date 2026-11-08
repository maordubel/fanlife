# Studio round — 8.11.2026 (speed, the Vercel freeze, the football brain, cartoon Shorts, marketing films)

Owner, 8.11.2026, in one message: the admin and the studio are very heavy; the Vercel account was frozen; Shorts must be
a different, animated, viral film of up to 30 seconds (the cut-out style of the guide he shared, on free tools only);
CLASSIFIED's opening is the first 3 seconds only, both openings hand over smoothly; deeper research for the free
writer; a writer, director and editor who think football; the hook laws; thumbnails that show a face and a newspaper;
marketing films; directors' pitches made with one click; six treatments into CLASSIFIED; the YouTube channel retuned.

## 1 · The Vercel freeze — measured, not guessed

Vercel usage, 9.10–8.11.2026 (Hobby, limits temporarily ×3 until 8.12): **Fluid Active CPU 11 h 31 m** — fanlife
10 h 49 m (93.9%). Everything else was far inside its limit (Fast Data Transfer 5.1 GB, invocations 142K, ISR writes 520).
Deployment storage is already governed by a retention policy (old deployments are being deleted by it).

Per route, last 12 h: `/api/master/stories/worker` 739 calls, 24% errors; `/api/master/stories` 47% errors; overall
10.2% timeouts. The cause: **`listJobs` read every job file with its own Supabase request** — a hundred jobs, a hundred
requests and a hundred JSON parses on every listener round, every desk refresh, and twice on the desk's GET.

Fixed:
- `lib/master/durable.ts` — `readAll(prefix)` on the Supabase store (one PostgREST call, paged by 200) and `readPrefix()`
  for every store; `lib/stories/store.ts` lists jobs and deletions through it; the desk's GET reads once
  (`jobsAndDeletions`).
- `app/master/admin/page.tsx` — the studio no longer waits for the overview's every-club models: PR #425 (merged the
  same afternoon) streams the admin shell and loads data by section; this round was rebased onto it.
- `lib/perf/memo.ts` + `lib/home/hub-model.ts` — the front page's club models are shared by every visitor of a warm
  instance for five minutes; the key carries every status, so a change in the control room is visible at once.

**Splitting FANLIFE and LIFE into two repositories was not done** (owner's choice, on the measurement): two Vercel
projects on one account double the builds and save no CPU, and LIFE's 305 MB of art cost deployment storage, which
the retention policy already handles — not the CPU the account was frozen on.

## 2 · The football brain

- `studio/deep_research.py` — one **grounded** Gemini call (Google Search, free tier) per film, cached by subject. The
  prompt researches like a broadsheet feature and a fact-checker: the competition's format that season, both sides before
  kick-off, the minute-by-minute chain, tactics, the stands, aftermath, rivalry, **myth against record**, the
  **die-hard-proof detail**, the **is-this-real detail**, real headlines and quotes, thumbnail faces and objects, and a
  fact-check of the owner's own document. Only facts that Google's grounding metadata ties to a returned page are kept,
  as `dr-*` history claims with the resolved page as source (confidence 2 = two sites). Everything else is editorial
  orientation (`ledger.deep_research`), never a citation. No key or no quota: the film goes on from the archive.
- `studio/writer.py` — new blocks: DEEP RESEARCH, THINK FOOTBALL (situation before the match, the rule of that season,
  supporters' vocabulary used correctly, the opponent as a character, context so a fan of another club follows), and the
  **HOOK LAWS**: "no way I don't know this" (the die-hard's pride) and "come on, is this real?!" (the absurd, proved), the
  other openers that work only when true, and what never opens a film. Titles and thumbnail concepts follow them; every
  thumbnail concept names a face and an object.
- `studio/directors.py` — FOOTBALL_SENSE shared by all three directors; the pitch prompt obeys the hook laws.
- `studio/editorial.py` — the editing room's rewrite is done by an editor who is a football person.

## 3 · Shorts are their own film — `studio/cartoon/`

A cut-out cartoon in the guide's style, entirely in code and free: one round-headed supporter (poses, faces, the club's
scarf, never a rival colour — `palette()` and `neutralize()`), props that come alive (bottle, ball, trophy, whistle,
clock, phone, money, newspaper with an outlet's name only from a press claim, scoreboard with the spoken score, stamp,
prison bars, goal and net), a 2.5D multiplane camera, pose swaps hidden inside a squash, a gag on its word, kinetic
captions on the narrator's word times, a last frame that loops to the first. Rendered by HyperFrames (one pure
`draw(t)` per frame, deterministic), voiced by Kokoro `am_michael` (a normal guy, not the narrator), scored with an owner
track far under the voice, effects from `audio.fx`. The writer gives each Short a `hook_law` and `cartoon` beats
({say, show}); older scripts are split at sentences. `shorts_hooks.make` uses it for every documentary and CLASSIFIED
Short and keeps the still montage only as the fallback. The worker and CLASSIFIED workflows install HyperFrames.

## 4 · Openings, marketing films, directors

- `studio/intros.py` — CLASSIFIED uses the first **3 s** of its opening; both openings dissolve into the film (`xfade`
  + `acrossfade`: CLASSIFIED `fadeblack` 0.45 s, documentary `fade` 0.8 s). Subtitles shift by the measured overlap.
- Marketing (`lib/stories/promo.ts`, `studio/promo.py`, `kinds.run_promo`, Studio → Marketing): a 20–30 s cartoon about a
  FAN LIFE feature, the channel, a finished film or the owner's own words. The promo writer may say only that subject's
  facts (a number not in them is refused). One click; private storage, Telegram copy, a YouTube pack.
- Directors: "Make this film" is now the whole film in one click — the pitching director writes the one script and the
  studio goes straight on (`pitchBrief`: one script, review auto).

## 5 · CLASSIFIED FILES 04–09

From the owner's Hebrew treatments: THE COUSIN (Ali Dia), THE SHEIKH (France–Kuwait 1982), THE HOLY WATER (Branco 1990),
THE CATHEDRAL (Maradona and Escobar), THE ARMED DRESSING ROOM (Lazio 1974), THE RANSOM (Quini 1981). English drafts with
sources, each with a "what the fact-check changed" list (Branco was a left-back; Leeds came to The Dell; Maradona also
denied meeting Escobar; Schuster's real words; the jeweller's "this is a robbery" is disputed…). Panels are still to be
drawn: `docs/fanlife/classified/files-04-09-panels.md`. They sit in the desk as drafts (approved: false).

## 6 · Thumbnails and the channel

- Documentary covers pin a **newspaper cutting**: a press claim's outlet, headline and date exactly as they ran, else the
  night's dateline — never an invented headline (`thumbs.cutting`, `compose.clipping`).
- The owner's inspiration (8.11.2026: CANE MAN, The Real Argo, ynet original, the Como 9–1 cover, our own I WAS THERE
  cover): one huge face or figure, a giant condensed title of two to four words, a real photograph behind, a seal or a
  red banner strip, the crest and the score when the night is a score. That is the target look for the next pass of
  `thumbs/compose.py` (a face cut out of the owner's Drive pack photographs).
- YouTube Studio, 8.11.2026 (applied directly, owner's choice): channel description rewritten on the hook laws (880
  characters, CLASSIFIED added, the six clubs); six titles retuned — the weaker performers only; the films already
  drawing views (Real Madrid in Athens, the 2000 double, Olympiacos v Maccabi, the Bottle, Grbavica, the 2004 cup final,
  Zrinjski I WAS THERE) were left alone.

## The illustrated Short (owner, 8.11.2026, same day)

> "The animation is not at the level I expect — not in sound, not in experience, not in items, not in graphics."
> Reference: a full-screen illustrated scene behind every sentence, a character inside it, the camera always moving.

The first cut-out cartoon drew everything in code. The Short is now built from the drawn library the owner already
supplied (studio kit): `kit/beats/common` (175 scenes), `kit/beats/papercut-library` (33), the club's own beat sets,
`kit/cutouts/common` (inked people and crowd rows), `kit/props` (ball, cup, radio, ticket, plane, bus, scarf, board).

* `studio/cartoon/plates.py` — a plate per line by meaning (a football synonym table + rare-word weighting, the club's
  own set first), never the same drawing or its variant twice, a losing line never on a celebration (and back),
  a figure and an object where the line asks for one; key red takes the club colour, the rival's family is scrubbed.
* `studio/cartoon/stage.py` — the HyperFrames page: each 16:9 drawing framed 9:16 on its most detailed band, a pan /
  push-in on the key word / pull-back on the last line, figures that spring up and hop, a blurred crowd row in front
  on stadium plates, whip-pan and punch-in cuts on the narrator's words, grain and vignette, captions on the words.
* `studio/cartoon/sound.py` — four layers: the voice; the owner's room recordings under each shot (terrace murmur,
  street, tunnel, bus, radio — public/life/sfx), cross-faded at every cut; a sound for every cut, figure, object and
  gag (ball kick, whistle, stamp, coins, the real crowd on a goal); the owner's music ducked under every word and up
  at the end. A soft limiter, then loudness to −14 LUFS (Shorts level).
* The writer and the promo writer now describe the PLACE of each beat (and may name a plate key).
* `make(..., engine='drawn')` / `STORIES_SHORTS_LOOK=drawn` keeps the old code-drawn cartoon as the fallback.
